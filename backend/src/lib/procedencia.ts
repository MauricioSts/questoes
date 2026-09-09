// Painel de procedência: "como estou em cada prova e em cada tipo de questão".
//
// Junta três fontes que só o servidor tem juntas — o banco de questões (Questao/Prova),
// o histórico de respostas (Answer) e as marcações (Marcada) — e devolve, por prova e por
// origem: quantas questões existem, quantas faltam responder, quantas estão certas/erradas
// hoje e quantas estão marcadas. É o que alimenta a tela "Provas" e os filtros de sessão.
import { prisma } from "../prisma.js";

export interface GrupoProcedencia {
  chave: string; // chave da Prova, ou o nome da origem quando tipo = "origem"
  tipo: "prova" | "origem";
  rotulo: string; // "FGV · AMAZUL · 2024" | "Autoral"
  banca?: string;
  orgao?: string;
  ano?: number;
  cargo?: string;
  url?: string;
  total: number; // questões desta prova/origem no banco do concurso
  respondidas: number; // questões distintas já respondidas ao menos uma vez
  faltam: number; // total - respondidas
  certas: number; // questões cujo ÚLTIMO resultado foi acerto
  erradas: number; // questões cujo último resultado foi erro (é a fila de recuperação)
  marcadas: number; // questões marcadas para revisar
  tentativas: number; // respostas registradas (conta repetição)
  tentativasCertas: number; // respostas corretas registradas
  taxa: number | null; // tentativasCertas / tentativas (null sem tentativa)
}

export interface ResumoProcedencia {
  provas: GrupoProcedencia[];
  origens: GrupoProcedencia[];
  geral: GrupoProcedencia; // o mesmo agregado para o banco inteiro do concurso
}

const ROTULO_ORIGEM: Record<string, string> = {
  oficial: "De prova oficial",
  adaptada: "Adaptada de prova",
  gerada: "Gerada para reforço",
  autoral: "Autoral",
};

// Estado atual de uma questão para o usuário, derivado do histórico dela.
interface EstadoQuestao {
  tentativas: number;
  certas: number;
  acertouUltima: boolean;
  ultima: Date;
}

function grupoVazio(chave: string, tipo: "prova" | "origem", rotulo: string): GrupoProcedencia {
  return {
    chave,
    tipo,
    rotulo,
    total: 0,
    respondidas: 0,
    faltam: 0,
    certas: 0,
    erradas: 0,
    marcadas: 0,
    tentativas: 0,
    tentativasCertas: 0,
    taxa: null,
  };
}

function fechar(g: GrupoProcedencia): GrupoProcedencia {
  g.faltam = Math.max(0, g.total - g.respondidas);
  g.taxa = g.tentativas > 0 ? g.tentativasCertas / g.tentativas : null;
  return g;
}

export async function calcularProcedencia(userId: string, concursoId?: string): Promise<ResumoProcedencia> {
  const cf = concursoId ? { concursoId } : {};
  const [questoes, provas, answers, marcadas] = await Promise.all([
    prisma.questao.findMany({
      where: cf,
      select: { id: true, origem: true, provaChave: true, provaBaseChave: true },
    }),
    prisma.prova.findMany(),
    prisma.answer.findMany({
      where: { userId, ...cf },
      orderBy: { createdAt: "asc" },
      select: { questaoId: true, acertou: true, createdAt: true },
    }),
    // Marcada NÃO é filtrada por concurso: as marcações existentes foram gravadas antes do
    // multi-concurso e todas têm concursoId null (filtrar zeraria o contador). O escopo já
    // vem das questões, que são do concurso — uma marcação de outro concurso não casa com
    // nenhum id daqui.
    prisma.marcada.findMany({ where: { userId }, select: { questaoId: true } }),
  ]);

  // Estado por questão (a última resposta manda, pois vêm em ordem crescente).
  const estado = new Map<number, EstadoQuestao>();
  for (const a of answers) {
    const cur = estado.get(a.questaoId) ?? { tentativas: 0, certas: 0, acertouUltima: false, ultima: a.createdAt };
    cur.tentativas++;
    if (a.acertou) cur.certas++;
    cur.acertouUltima = a.acertou;
    cur.ultima = a.createdAt;
    estado.set(a.questaoId, cur);
  }
  const marcadasSet = new Set(marcadas.map((m) => m.questaoId));

  const infoProva = new Map(provas.map((p) => [p.chave, p]));
  const porProva = new Map<string, GrupoProcedencia>();
  const porOrigem = new Map<string, GrupoProcedencia>();
  const geral = grupoVazio("__geral__", "origem", "Todo o banco");

  const somar = (g: GrupoProcedencia, id: number) => {
    g.total++;
    const e = estado.get(id);
    if (e) {
      g.respondidas++;
      g.tentativas += e.tentativas;
      g.tentativasCertas += e.certas;
      if (e.acertouUltima) g.certas++;
      else g.erradas++;
    }
    if (marcadasSet.has(id)) g.marcadas++;
  };

  for (const q of questoes) {
    // Uma questão conta para a prova de onde o TEXTO saiu; não havendo, para a prova de
    // que o lote foi montado (é assim que as autorais de um lote entram no painel da prova).
    const chaveProva = q.provaChave ?? q.provaBaseChave;
    if (chaveProva) {
      const p = infoProva.get(chaveProva);
      const rotulo = p ? [p.banca, p.orgao, String(p.ano)].join(" · ") : chaveProva;
      const g =
        porProva.get(chaveProva) ??
        Object.assign(grupoVazio(chaveProva, "prova", rotulo), {
          banca: p?.banca,
          orgao: p?.orgao,
          ano: p?.ano,
          cargo: p?.cargo ?? undefined,
          url: p?.url ?? undefined,
        });
      somar(g, q.id);
      porProva.set(chaveProva, g);
    }

    const origem = q.origem || "autoral";
    const go = porOrigem.get(origem) ?? grupoVazio(origem, "origem", ROTULO_ORIGEM[origem] ?? origem);
    somar(go, q.id);
    porOrigem.set(origem, go);

    somar(geral, q.id);
  }

  const ordenar = (a: GrupoProcedencia, b: GrupoProcedencia) =>
    (b.ano ?? 0) - (a.ano ?? 0) || b.total - a.total || a.rotulo.localeCompare(b.rotulo);

  return {
    provas: [...porProva.values()].map(fechar).sort(ordenar),
    origens: [...porOrigem.values()].map(fechar).sort((a, b) => b.total - a.total),
    geral: fechar(geral),
  };
}

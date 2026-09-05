// Export das questões erradas em Markdown pronto para colar no Claude: leva o enunciado,
// o distrator que o usuário marcou, o gabarito e a contagem de erros por assunto, e pede
// de volta um JSON no MESMO schema que /importar aceita (QuestoesRoot) — fechando o ciclo
// errar → gerar questões novas do ponto fraco → importar.
import type { Questao, Alternativa } from "../types/questao";
import { rotuloOrigem } from "./questoesRepo";

// Uma questão errada, do jeito que GET /answers/erradas devolve.
// Com estado=todas, a questão CONTINUA aqui depois de recuperada (acertouUltima=true):
// o histórico de erro é a base de estudo, não uma fila que esvazia.
export interface MetaErro {
  questaoId: number;
  modulo: string;
  materia: string;
  assunto: string;
  dificuldade: string;
  erros: number;
  acertos?: number;
  tentativas: number;
  acertouUltima?: boolean;
  ultimoErro?: string | null;
  origem?: string;
  prova?: string;
  alternativaMarcada?: string;
}

export function recuperada(m: MetaErro): boolean {
  return m.acertouUltima === true;
}

export interface ItemErro {
  meta: MetaErro;
  questao: Questao;
}

export interface GrupoAssunto {
  assunto: string;
  materia: string;
  itens: ItemErro[];
  erros: number; // soma de erros do assunto
  pendentes: number; // ainda não recuperadas
  recuperadas: number; // já acertei depois de errar
  taxa: number | null; // 0..1 de acerto histórico (vem do /answers/stats), null se sem dado
}

export interface GrupoMateria {
  materia: string;
  itens: ItemErro[];
  erros: number;
  pendentes: number;
  recuperadas: number;
  taxa: number | null;
  assuntos: GrupoAssunto[];
}

// Taxas de acerto vindas de /answers/stats: chave "matéria" e "matéria›assunto".
export type TaxasPorChave = Record<string, number>;

export function agruparPorMateria(itens: ItemErro[], taxas: TaxasPorChave = {}): GrupoMateria[] {
  const porMateria = new Map<string, ItemErro[]>();
  for (const it of itens) {
    const bucket = porMateria.get(it.meta.materia) ?? [];
    bucket.push(it);
    porMateria.set(it.meta.materia, bucket);
  }

  const grupos: GrupoMateria[] = [...porMateria.entries()].map(([materia, doMateria]) => {
    const porAssunto = new Map<string, ItemErro[]>();
    for (const it of doMateria) {
      const bucket = porAssunto.get(it.meta.assunto) ?? [];
      bucket.push(it);
      porAssunto.set(it.meta.assunto, bucket);
    }
    const assuntos: GrupoAssunto[] = [...porAssunto.entries()]
      .map(([assunto, doAssunto]) => ({
        assunto,
        materia,
        itens: doAssunto.sort((a, b) => b.meta.erros - a.meta.erros),
        erros: doAssunto.reduce((s, i) => s + i.meta.erros, 0),
        pendentes: doAssunto.filter((i) => !recuperada(i.meta)).length,
        recuperadas: doAssunto.filter((i) => recuperada(i.meta)).length,
        taxa: taxas[`${materia}›${assunto}`] ?? null,
      }))
      .sort((a, b) => b.erros - a.erros || b.itens.length - a.itens.length);

    return {
      materia,
      itens: doMateria,
      erros: doMateria.reduce((s, i) => s + i.meta.erros, 0),
      pendentes: doMateria.filter((i) => !recuperada(i.meta)).length,
      recuperadas: doMateria.filter((i) => recuperada(i.meta)).length,
      taxa: taxas[materia] ?? null,
      assuntos,
    };
  });

  // Pior primeiro: quem me custou mais erros no período, e mais questões como desempate.
  return grupos.sort((a, b) => b.erros - a.erros || b.itens.length - a.itens.length);
}

const ORDEM: Alternativa[] = ["A", "B", "C", "D", "E"];

function questaoEmMarkdown(it: ItemErro): string {
  const { meta, questao } = it;
  const linhas: string[] = [];
  const estado = recuperada(meta) ? "já recuperei depois" : "ainda não recuperei";
  linhas.push(
    `#### [id ${questao.id}] ${meta.assunto} · ${meta.dificuldade} · errei ${meta.erros}× em ${meta.tentativas} tentativa(s) · ${estado}`
  );
  linhas.push("");
  // Procedência: o Claude precisa saber se está olhando uma questão de prova real ou
  // um reforço que ele mesmo gerou antes — muda o que faz sentido gerar em cima.
  linhas.push(`_Origem: ${rotuloOrigem(questao)}._`);
  linhas.push("");
  linhas.push(questao.enunciado.trim());
  if (questao.codigo) {
    linhas.push("");
    linhas.push("```" + (questao.linguagem ?? ""));
    linhas.push(questao.codigo.trimEnd());
    linhas.push("```");
  }
  if (questao.imagens?.length) {
    linhas.push("");
    linhas.push(`_(a questão original tem ${questao.imagens.length} figura(s): ${questao.imagens.map((i) => i.legenda).join("; ")})_`);
  }
  linhas.push("");
  for (const letra of ORDEM) {
    const texto = questao.alternativas[letra];
    if (texto) linhas.push(`- **${letra})** ${texto.trim()}`);
  }
  linhas.push("");
  const marcada = meta.alternativaMarcada ? `**${meta.alternativaMarcada}**` : "não registrada";
  linhas.push(`Marquei quando errei: ${marcada} · Gabarito: **${questao.gabarito}**`);
  if (questao.explicacao?.trim()) {
    linhas.push("");
    linhas.push(`Explicação do banco: ${questao.explicacao.trim()}`);
  }
  return linhas.join("\n");
}

// O JSON de exemplo usa a matéria/assunto REAL de um dos erros: além de ilustrar o schema,
// mostra ao Claude a grafia exata que ele precisa repetir nos campos.
function instrucoes(
  porAssunto: number,
  exemplo: { modulo: string; materia: string; assunto: string; dificuldade: string },
  ctx: { periodo: string; pendentes: number; recuperadas: number }
): string {
  return [
    "## O que eu quero de você",
    "",
    `As questões abaixo são todas as que eu **errei** ${ctx.periodo} — ${ctx.pendentes} que ainda não`,
    `recuperei e ${ctx.recuperadas} que já acertei numa tentativa posterior. As recuperadas continuam`,
    "aqui de propósito: acertar uma vez não prova domínio do conteúdo, e elas mostram onde eu",
    "tropecei. Gere questões NOVAS sobre esses assuntos, para eu treinar onde estou falhando.",
    "",
    "Regras:",
    "",
    "1. Não repita nem parafraseie as questões abaixo — quero itens inéditos sobre o mesmo conteúdo.",
    `2. Gere cerca de ${porAssunto} questões por assunto, priorizando os assuntos com mais erros (a contagem "errei N×" está em cada item).`,
    "3. Ataque o motivo provável do meu erro: quando eu marquei um distrator específico, cubra a confusão que ele representa.",
    "4. Cada questão: 5 alternativas (A–E), uma única correta, e uma `explicacao` que justifique a correta E diga por que os distratores caem.",
    "5. Mantenha `materia` e `assunto` escritos EXATAMENTE como aparecem aqui (é assim que meu app agrupa).",
    '6. Marque toda questão com `"origem": "gerada"` e liste em `geradaDe` os `id`s daqui que motivaram cada uma — é assim que meu app distingue reforço de questão de prova real.',
    "7. Responda **somente** com um bloco de código JSON no schema abaixo — é o formato que meu app importa.",
    "",
    "```json",
    "{",
    '  "meta": { "fonte": "Claude — reforço de erros", "versao": "1" },',
    '  "textos_base": {},',
    '  "questoes": [',
    "    {",
    '      "id": 1,',
    `      "modulo": ${JSON.stringify(exemplo.modulo)},`,
    `      "materia": ${JSON.stringify(exemplo.materia)},`,
    `      "assunto": ${JSON.stringify(exemplo.assunto)},`,
    `      "dificuldade": ${JSON.stringify(exemplo.dificuldade)},`,
    '      "origem": "gerada",',
    '      "geradaDe": [123, 456],',
    '      "enunciado": "…",',
    '      "alternativas": { "A": "…", "B": "…", "C": "…", "D": "…", "E": "…" },',
    '      "gabarito": "C",',
    '      "explicacao": "…"',
    "    }",
    "  ]",
    "}",
    "```",
    "",
    "Campos: `id` inteiro sequencial a partir de 1 (meu app desloca os IDs sozinho se colidirem),",
    "`modulo` é `\"I\"` ou `\"II\"`, `dificuldade` é `\"facil\"`, `\"media\"` ou `\"dificil\"`,",
    "`geradaDe` são os ids das questões desta lista que a questão nova está treinando.",
    "Sem texto fora do bloco JSON.",
  ].join("\n");
}

export interface OpcoesExport {
  concurso?: string;
  materia?: string; // export de uma matéria só
  questoesPorAssunto?: number;
  periodo?: string; // rótulo do recorte de tempo ("nos últimos 7 dias", "desde sempre")
}

export function montarMarkdownErros(itens: ItemErro[], opts: OpcoesExport = {}): string {
  const grupos = agruparPorMateria(itens);
  const totalAssuntos = grupos.reduce((s, g) => s + g.assuntos.length, 0);
  const hoje = new Date().toISOString().slice(0, 10);

  const periodo = opts.periodo ?? "desde sempre";
  const pendentes = itens.filter((i) => !recuperada(i.meta)).length;
  const recuperadas = itens.length - pendentes;
  const totalErros = itens.reduce((s, i) => s + i.meta.erros, 0);

  const cabecalho = [
    `# Questões que eu errei${opts.materia ? ` — ${opts.materia}` : ""}`,
    "",
    [
      opts.concurso ? `Concurso: **${opts.concurso}**` : null,
      `Recorte: ${periodo}`,
      `Exportado em ${hoje}`,
      `${itens.length} questão(ões) errada(s) — ${pendentes} pendente(s), ${recuperadas} recuperada(s)`,
      `${totalErros} erro(s) no total`,
      `${grupos.length} matéria(s)`,
      `${totalAssuntos} assunto(s)`,
    ]
      .filter(Boolean)
      .join(" · "),
    "",
  ].join("\n");

  // Ranking por conteúdo: o que interessa é onde eu gastei mais erros, independentemente
  // de já ter recuperado a questão depois.
  const ranking = grupos
    .flatMap((g) => g.assuntos)
    .sort((a, b) => b.erros - a.erros || b.itens.length - a.itens.length)
    .slice(0, 15);

  const panorama = [
    "## Onde eu mais erro (assuntos, por número de erros)",
    "",
    ...ranking.map(
      (a, i) =>
        `${i + 1}. **${a.materia} › ${a.assunto}** — ${a.erros} erro(s) em ${a.itens.length} questão(ões) (${a.pendentes} pendente(s), ${a.recuperadas} recuperada(s))`
    ),
    "",
  ].join("\n");

  const corpo = grupos
    .map((g) =>
      g.assuntos
        .map((a) =>
          [
            `### ${g.materia} › ${a.assunto} — ${a.erros} erro(s) em ${a.itens.length} questão(ões)`,
            ...a.itens.map(questaoEmMarkdown),
          ].join("\n\n")
        )
        .join("\n\n")
    )
    .join("\n\n");

  const exemplo = itens[0]?.meta ?? { modulo: "II", materia: "Matéria", assunto: "Assunto", dificuldade: "media" };

  return [
    cabecalho,
    instrucoes(opts.questoesPorAssunto ?? 3, exemplo, { periodo, pendentes, recuperadas }),
    "",
    panorama,
    "## As questões que eu errei",
    "",
    corpo,
    "",
  ].join("\n");
}

// Nome de arquivo seguro: sem acento, espaço vira hífen.
function slug(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .toLowerCase();
}

export function baixarMarkdown(texto: string, materia?: string): void {
  const nome = `meus-erros${materia ? "-" + slug(materia) : ""}-${new Date().toISOString().slice(0, 10)}.md`;
  const blob = new Blob([texto], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  a.click();
  URL.revokeObjectURL(url);
}

// Clipboard falha em contexto não seguro (http) e em navegador sem permissão: cai
// para o textarea + execCommand, que ainda funciona nesses casos.
export async function copiarTexto(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = texto;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

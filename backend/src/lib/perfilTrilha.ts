// Perfil da prova de uma trilha (PerfilProva.dados, espelho de docs/perfis/*.json) visto
// como EMENTA: grupos → disciplinas → tópicos numerados do edital. Serve para conferir
// vínculos questão↔trilha (a matéria do vínculo é a disciplina e o tópico é o número do
// edital, como no lote C/E), para os limites da discursiva e para trocar o conteúdo de TI
// provisório pelo oficial quando o Anexo I sair. Todo número de regra vem do perfil:
// nada aqui é fixo para um concurso.
import { z } from "zod";

const topicoSchema = z
  .object({
    numero: z.string().min(1),
    texto: z.string().min(1),
    conteudo_oficial: z.boolean().optional(),
  })
  .passthrough();

const disciplinaSchema = z
  .object({
    nome: z.string().min(1),
    itens: z.number().int().nullable().optional(),
    // false = conteúdo provisório (edital ainda sem o anexo). Ausente = oficial.
    conteudo_oficial: z.boolean().optional(),
    topicos: z.array(topicoSchema).optional(),
  })
  .passthrough();

const grupoSchema = z
  .object({
    grupo: z.string().min(1),
    nome: z.string().min(1),
    disciplinas: z.array(disciplinaSchema),
  })
  .passthrough();

const discursivaSchema = z
  .object({
    max_linhas: z.number().int().positive(),
    caracteres_por_linha: z.number().int().positive(),
    valor: z.number().positive(),
  })
  .passthrough();

// passthrough em tudo: o perfil tem muito mais que a ementa (vagas, pontuação, horário…)
// e regravar o JSON não pode perder nada.
export const perfilTrilhaSchema = z
  .object({
    perfil: z.string().min(1),
    formato: z.enum(["MULTIPLA_ESCOLHA", "CERTO_ERRADO"]).optional(),
    aviso_conteudo_provisorio: z.string().optional(),
    discursiva: discursivaSchema.optional(),
    grupos: z.array(grupoSchema).min(1),
  })
  .passthrough();

export type PerfilTrilha = z.infer<typeof perfilTrilhaSchema>;
export type DisciplinaPerfil = z.infer<typeof disciplinaSchema>;
export type TopicoPerfil = z.infer<typeof topicoSchema>;

// Lê e valida o perfil vindo do banco (Json) ou do arquivo. Lança ZodError se não for um
// perfil. Devolve o próprio objeto (o schema não transforma nada), para que regravar o
// JSON mantenha a ordem das chaves do arquivo.
export function lerPerfil(dados: unknown): PerfilTrilha {
  perfilTrilhaSchema.parse(dados);
  return dados as PerfilTrilha;
}

// Perfil sem "formato" é dos certo/errado (CGU, Bacen), que vieram antes do campo.
export function formatoDoPerfil(perfil: PerfilTrilha): "MULTIPLA_ESCOLHA" | "CERTO_ERRADO" {
  return perfil.formato ?? "CERTO_ERRADO";
}

export interface DisciplinaListada {
  grupo: string;
  nome: string;
  oficial: boolean;
  topicos: { numero: string; texto: string }[];
}

export function listarDisciplinas(perfil: PerfilTrilha): DisciplinaListada[] {
  return perfil.grupos.flatMap((g) =>
    g.disciplinas.map((d) => ({
      grupo: g.grupo,
      nome: d.nome,
      oficial: d.conteudo_oficial !== false,
      topicos: (d.topicos ?? []).map((t) => ({ numero: t.numero, texto: t.texto })),
    }))
  );
}

export function listarTopicos(perfil: PerfilTrilha, disciplina: string): { numero: string; texto: string }[] | null {
  return listarDisciplinas(perfil).find((d) => d.nome === disciplina)?.topicos ?? null;
}

// Confere um vínculo contra o perfil. Devolve a mensagem de erro, ou null se vale.
// A disciplina é o nome exato do perfil; o tópico, o número do edital ("4.1").
export function validarVinculo(perfil: PerfilTrilha, disciplina: string, topico: string): string | null {
  const topicos = listarTopicos(perfil, disciplina);
  if (!topicos) return `disciplina "${disciplina}" não existe no perfil ${perfil.perfil}`;
  if (!topicos.some((t) => t.numero === topico)) return `tópico "${topico}" não existe em "${disciplina}" no perfil ${perfil.perfil}`;
  return null;
}

export interface VinculoParaConferir {
  questaoId: number;
  trilhaId: string;
  materia: string;
  topico: string;
}

// Confere vários vínculos de uma vez (script de vínculos): trilha sem perfil passa sem
// conferência; com perfil, junta TODOS os erros para listar antes de gravar qualquer coisa.
export function conferirVinculos(vinculos: VinculoParaConferir[], perfisPorTrilha: Map<string, PerfilTrilha>): string[] {
  const erros: string[] = [];
  for (const v of vinculos) {
    const perfil = perfisPorTrilha.get(v.trilhaId);
    if (!perfil) continue;
    const erro = validarVinculo(perfil, v.materia, v.topico);
    if (erro) erros.push(`questão ${v.questaoId} → ${v.trilhaId}: ${erro}`);
  }
  return erros;
}

// ---- Discursiva ----

export interface RegraDiscursiva {
  maxLinhas: number;
  caracteresPorLinha: number;
  valor: number;
}

export function regraDiscursiva(perfil: PerfilTrilha | null): RegraDiscursiva | null {
  const d = perfil?.discursiva;
  return d ? { maxLinhas: d.max_linhas, caracteresPorLinha: d.caracteres_por_linha, valor: d.valor } : null;
}

// Linhas que o texto ocupa na folha, igual ao contador do frontend: tira UMA quebra
// final ("abc\n" é 1 linha), e cada "\n" começa linha nova; cada pedaço ocupa
// ceil(tamanho / caracteresPorLinha) linhas, sem quebrar por palavra; pedaço vazio
// (linha em branco) conta como 1.
export function contarLinhas(texto: string, caracteresPorLinha: number): number {
  return texto
    .replace(/\r\n?/g, "\n")
    .replace(/\n$/, "")
    .split("\n")
    .reduce((n, pedaco) => n + Math.max(1, Math.ceil(pedaco.length / caracteresPorLinha)), 0);
}

// Erro de limite da discursiva, ou null se o texto cabe na folha.
export function validarTextoDiscursiva(texto: string, regra: Pick<RegraDiscursiva, "maxLinhas" | "caracteresPorLinha">): string | null {
  if (!texto.trim()) return "Escreva a resposta.";
  const n = contarLinhas(texto, regra.caracteresPorLinha);
  if (n > regra.maxLinhas)
    return `A resposta ocupa ${n} linhas de ${regra.caracteresPorLinha} caracteres; o limite é ${regra.maxLinhas}.`;
  return null;
}

// ---- Troca do conteúdo provisório pelo oficial ----

export interface DisciplinaNova {
  nome: string;
  itens: number | null;
  topicos: { numero: string; texto: string }[];
}

const entradaAninhadaSchema = z.object({
  disciplinas: z
    .array(
      z.object({
        nome: z.string().min(1),
        itens: z.number().int().nullable().optional(),
        topicos: z.array(z.object({ numero: z.string().min(1), texto: z.string().min(1) })).min(1),
      })
    )
    .min(1),
});

const entradaPlanaSchema = z
  .array(z.object({ disciplina: z.string().min(1), numero: z.string().min(1), texto: z.string().min(1) }))
  .min(1);

// Aceita { disciplinas: [{ nome, itens, topicos: [{ numero, texto }] }] } ou a lista plana
// [{ disciplina, numero, texto }] (na ordem em que aparecem). Recusa disciplina ou número
// de tópico repetido: duas linhas iguais virariam vínculo ambíguo.
export function lerConteudoOficial(entrada: unknown): DisciplinaNova[] {
  let disciplinas: DisciplinaNova[];
  if (Array.isArray(entrada)) {
    const linhas = entradaPlanaSchema.parse(entrada);
    const porNome = new Map<string, DisciplinaNova>();
    for (const l of linhas) {
      const d = porNome.get(l.disciplina) ?? { nome: l.disciplina, itens: null, topicos: [] };
      d.topicos.push({ numero: l.numero, texto: l.texto });
      porNome.set(l.disciplina, d);
    }
    disciplinas = [...porNome.values()];
  } else {
    disciplinas = entradaAninhadaSchema
      .parse(entrada)
      .disciplinas.map((d) => ({ nome: d.nome, itens: d.itens ?? null, topicos: d.topicos.map((t) => ({ numero: t.numero, texto: t.texto })) }));
  }
  const nomes = new Set<string>();
  for (const d of disciplinas) {
    if (nomes.has(d.nome)) throw new Error(`disciplina "${d.nome}" repetida no conteúdo`);
    nomes.add(d.nome);
    const numeros = new Set<string>();
    for (const t of d.topicos) {
      if (numeros.has(t.numero)) throw new Error(`tópico ${t.numero} repetido em "${d.nome}"`);
      numeros.add(t.numero);
    }
  }
  return disciplinas;
}

export interface VinculoAtual {
  questaoId: number;
  materia: string | null;
  topico: string;
}

// "<disciplina>|<tópico antigo>" → para onde vai.
export type MapaReclassificacao = Record<string, { materia: string; topico: string }>;

export interface ResultadoAtualizacao {
  perfil: PerfilTrilha;
  grupo: string;
  removidas: string[]; // disciplinas que saíram (provisórias ou substituídas)
  adicionadas: string[];
  mantidos: number; // vínculos que continuam válidos sem mudar
  remapeados: { questaoId: number; de: string; para: { materia: string; topico: string } }[];
  orfaos: { questaoId: number; materia: string | null; topico: string; erro: string }[];
}

// Função pura: troca as disciplinas provisórias (conteudo_oficial=false) do perfil pelas
// oficiais, tira o aviso de conteúdo provisório e reclassifica os vínculos da trilha.
// Idempotente: rodar de novo com o mesmo conteúdo substitui as disciplinas de mesmo nome
// e chega ao mesmo perfil. Vínculo que não vale mais e não está no mapa vira órfão: só
// é listado, nunca apagado (quem decide é a revisão manual).
export function atualizarConteudo(
  perfilAtual: PerfilTrilha,
  novas: DisciplinaNova[],
  vinculos: VinculoAtual[],
  mapa: MapaReclassificacao = {}
): ResultadoAtualizacao {
  const perfil: PerfilTrilha = structuredClone(perfilAtual);
  const nomesNovos = new Set(novas.map((d) => d.nome));
  const sai = (d: DisciplinaPerfil) => d.conteudo_oficial === false || nomesNovos.has(d.nome);

  // Grupo-alvo: o que tem as provisórias; na segunda rodada (já sem provisórias), o que
  // já tem as disciplinas de mesmo nome.
  const alvo =
    perfil.grupos.find((g) => g.disciplinas.some((d) => d.conteudo_oficial === false)) ??
    perfil.grupos.find((g) => g.disciplinas.some((d) => nomesNovos.has(d.nome)));
  if (!alvo) throw new Error("o perfil não tem disciplina provisória nem disciplina com os nomes do conteúdo novo");
  for (const g of perfil.grupos) {
    if (g === alvo) continue;
    const repetida = g.disciplinas.find((d) => nomesNovos.has(d.nome));
    if (repetida) throw new Error(`disciplina "${repetida.nome}" já existe no grupo ${g.grupo}, fora do grupo ${alvo.grupo}`);
  }

  const removidas = alvo.disciplinas.filter(sai).map((d) => d.nome);
  const inicio = alvo.disciplinas.findIndex(sai);
  const ficam = alvo.disciplinas.filter((d) => !sai(d));
  const oficiais: DisciplinaPerfil[] = novas.map((d) => ({
    nome: d.nome,
    itens: d.itens,
    conteudo_oficial: true,
    topicos: d.topicos.map((t) => ({ numero: t.numero, texto: t.texto, conteudo_oficial: true })),
  }));
  // As novas entram no lugar da primeira que saiu (a ordem do edital fica no grupo).
  const pos = inicio < 0 ? ficam.length : alvo.disciplinas.slice(0, inicio).filter((d) => !sai(d)).length;
  alvo.disciplinas = [...ficam.slice(0, pos), ...oficiais, ...ficam.slice(pos)];
  delete perfil.aviso_conteudo_provisorio;

  // O mapa também é conferido: destino inválido é erro de quem escreveu o mapa.
  const errosMapa = Object.entries(mapa)
    .map(([chave, para]) => {
      const erro = validarVinculo(perfil, para.materia, para.topico);
      return erro ? `mapa "${chave}": ${erro}` : null;
    })
    .filter((e): e is string => !!e);
  if (errosMapa.length) throw new Error(errosMapa.join("\n"));

  let mantidos = 0;
  const remapeados: ResultadoAtualizacao["remapeados"] = [];
  const orfaos: ResultadoAtualizacao["orfaos"] = [];
  for (const v of vinculos) {
    const materia = v.materia ?? v.topico;
    const erro = validarVinculo(perfil, materia, v.topico);
    if (!erro) {
      mantidos++;
      continue;
    }
    const chave = `${materia}|${v.topico}`;
    const para = mapa[chave];
    if (para) remapeados.push({ questaoId: v.questaoId, de: chave, para });
    else orfaos.push({ questaoId: v.questaoId, materia: v.materia, topico: v.topico, erro });
  }

  return {
    perfil,
    grupo: alvo.grupo,
    removidas,
    adicionadas: novas.map((d) => d.nome),
    mantidos,
    remapeados,
    orfaos,
  };
}

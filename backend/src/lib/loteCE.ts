// Lote certo/errado (estilo Cebraspe): validação do formato de docs/formato-lote-ce.md.
// Puro (sem banco) para dar para testar: quem chama passa o perfil da prova e as chaves
// de prova que já existem. Erros bloqueiam a importação; avisos só vão para o relatório.
import { z } from "zod";

const imagemSchema = z.object({
  arquivo: z.string().min(1),
  legenda: z.string().default(""),
  posicao: z.enum(["enunciado", "alternativas"]),
  dados: z.string().regex(/^data:image\//, "dados precisa ser um data URI de imagem"),
});

const provaCESchema = z.object({
  banca: z.string().min(1),
  orgao: z.string().min(1),
  ano: z.number().int().min(1900).max(2200),
  gabarito_fonte: z.enum(["definitivo", "resolucao_propria"]),
  cargo: z.string().optional(),
  tipo: z.string().optional(),
  url: z.string().optional(),
});

const itemSchema = z.object({
  id: z.number().int(),
  assunto: z.string().min(1),
  dificuldade: z.enum(["facil", "media", "dificil"]),
  afirmacao: z.string().min(1),
  gabarito: z.enum(["C", "E"]),
  explicacao: z.string().min(1),
  origem: z.enum(["oficial", "adaptada", "gerada", "autoral"]),
  prova: z.string().optional(),
  numero: z.number().int().positive().optional(),
  gabarito_conferir: z.boolean().optional(),
  // Tópico do conteúdo programático ("2.3"), dentro da disciplina do item.
  topico: z.string().regex(/^\d+(\.\d+)*$/, "topico é o número do edital, ex.: \"2.3\"").optional(),
  // Disciplina do item quando difere da do comando (mesmo grupo).
  disciplina: z.string().min(1).optional(),
  geradaDe: z.array(z.number().int()).optional(),
  codigo: z.string().optional(),
  linguagem: z.string().optional(),
  imagens: z.array(imagemSchema).max(10).optional(),
});

const comandoSchema = z.object({
  id: z.number().int().positive(),
  grupo: z.string().min(1),
  disciplina: z.string().min(1),
  texto: z.string().min(1),
  codigo: z.string().optional(),
  linguagem: z.string().optional(),
  imagens: z.array(imagemSchema).max(10).optional(),
  itens: z.array(itemSchema).min(1),
});

const pendenciaSchema = z.object({
  prova: z.string().min(1),
  numero: z.number().int().positive(),
  motivo: z.enum(["anulado", "sem_gabarito", "depende_de_figura", "ilegivel", "fora_do_edital"]),
});

export const loteCESchema = z.object({
  lote: z.string().min(1).max(200),
  tipo: z.literal("CERTO_ERRADO"),
  perfil: z.string().min(1),
  provas: z.record(provaCESchema).default({}),
  comandos: z.array(comandoSchema).min(1),
  pendencias: z.array(pendenciaSchema).default([]),
});

export type LoteCE = z.infer<typeof loteCESchema>;

// O que o validador precisa do perfil (docs/perfis/*.json).
export interface PerfilProvaDados {
  perfil: string;
  grupos: {
    grupo: string;
    nome: string;
    // topicos = conteúdo programático do edital; sem ele, o tópico do item não é conferido.
    disciplinas: { nome: string; topicos?: { numero: string; texto: string }[] }[];
  }[];
}

export interface RelatorioLoteCE {
  erros: string[];
  avisos: string[];
  itens: number;
  comandos: number;
  certos: number;
  pendencias: Record<string, number>;
}

// Palavras absolutas que o Cebraspe costuma usar para tornar o item errado. Muitas delas
// com o mesmo gabarito viram pista.
const ABSOLUTAS = /\b(sempre|nunca|somente|exclusivamente|apenas|qualquer)\b/i;

export function validarLoteCE(
  lote: LoteCE,
  perfil: PerfilProvaDados,
  provasNoBanco: Set<string>
): RelatorioLoteCE {
  const erros: string[] = [];
  const avisos: string[] = [];

  if (lote.perfil !== perfil.perfil) erros.push(`Perfil "${lote.perfil}" não confere com "${perfil.perfil}".`);

  const disciplinas = new Map(perfil.grupos.map((g) => [g.grupo, new Set(g.disciplinas.map((d) => d.nome))]));
  // "P3|Disciplina" -> números de tópico do edital (só quando o perfil traz o conteúdo).
  const topicos = new Map(
    perfil.grupos.flatMap((g) =>
      g.disciplinas
        .filter((d) => d.topicos?.length)
        .map((d) => [`${g.grupo}|${d.nome}`, new Set(d.topicos!.map((t) => t.numero))] as const)
    )
  );
  let semTopico = 0;
  const provaExiste = (c: string) => !!lote.provas[c] || provasNoBanco.has(c);

  let itens = 0;
  let certos = 0;
  let idEsperado: number | null = null;
  const absolutas = { C: 0, E: 0 };

  lote.comandos.forEach((c, i) => {
    if (c.id !== i + 1) erros.push(`Comando na posição ${i + 1} tem id ${c.id}: os ids vão de 1 em 1 a partir de 1.`);
    const doGrupo = disciplinas.get(c.grupo);
    if (!doGrupo) erros.push(`Comando ${c.id}: grupo "${c.grupo}" não existe no perfil ${perfil.perfil}.`);
    else if (!doGrupo.has(c.disciplina))
      erros.push(`Comando ${c.id}: disciplina "${c.disciplina}" não existe no grupo ${c.grupo} do perfil.`);
    if (c.itens.length === 1) avisos.push(`Comando ${c.id} tem um único item.`);
    if (c.codigo && !c.linguagem) avisos.push(`Comando ${c.id}: código sem "linguagem".`);

    for (const item of c.itens) {
      itens++;
      if (item.gabarito === "C") certos++;
      if (idEsperado !== null && item.id !== idEsperado)
        erros.push(`Item ${item.id}: esperado ${idEsperado} (numeração contínua, sem pular nem repetir).`);
      idEsperado = item.id + 1;
      if ((item.origem === "oficial" || item.origem === "adaptada") && !item.prova)
        erros.push(`Item ${item.id}: origem "${item.origem}" exige o campo "prova".`);
      if (item.prova && !provaExiste(item.prova))
        erros.push(`Item ${item.id}: prova "${item.prova}" não está em "provas" nem no banco.`);
      if (item.codigo && !item.linguagem) avisos.push(`Item ${item.id}: código sem "linguagem".`);
      const disciplina = item.disciplina ?? c.disciplina;
      if (item.disciplina && !doGrupo?.has(item.disciplina))
        erros.push(`Item ${item.id}: disciplina "${item.disciplina}" não existe no grupo ${c.grupo} do perfil.`);
      const doEdital = topicos.get(`${c.grupo}|${disciplina}`);
      if (doEdital) {
        if (!item.topico) semTopico++;
        else if (!doEdital.has(item.topico))
          erros.push(`Item ${item.id}: tópico ${item.topico} não existe em "${disciplina}" no edital.`);
      }
      if (ABSOLUTAS.test(item.afirmacao)) absolutas[item.gabarito]++;
    }
  });

  if (semTopico > 0) avisos.push(`${semTopico} item(ns) sem "topico" do edital: não dá para conferir se o assunto cai.`);

  for (const p of lote.pendencias) {
    if (!provaExiste(p.prova)) erros.push(`Pendência ${p.numero}: prova "${p.prova}" não está em "provas" nem no banco.`);
  }

  if (itens >= 10) {
    const pct = (100 * certos) / itens;
    if (pct < 40 || pct > 60) avisos.push(`${pct.toFixed(0)}% dos itens são C (o esperado é entre 40% e 60%).`);
  }
  for (const g of ["C", "E"] as const) {
    const outro = g === "C" ? "E" : "C";
    if (absolutas[g] >= 4 && absolutas[g] >= 3 * Math.max(1, absolutas[outro]))
      avisos.push(`${absolutas[g]} afirmações com palavra absoluta são ${g}: isso vira pista.`);
  }

  const pendencias: Record<string, number> = {};
  for (const p of lote.pendencias) pendencias[p.motivo] = (pendencias[p.motivo] ?? 0) + 1;

  return { erros, avisos, itens, comandos: lote.comandos.length, certos, pendencias };
}

// Grupo → módulo do app: o último grupo do perfil é o de conhecimentos específicos ("II"),
// os anteriores são gerais ("I"). Mantém estatística e meta por módulo funcionando.
export function moduloDoGrupo(perfil: PerfilProvaDados, grupo: string): "I" | "II" {
  const ultimo = perfil.grupos[perfil.grupos.length - 1]?.grupo;
  return grupo === ultimo ? "II" : "I";
}

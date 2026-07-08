// Valida e normaliza um JSON de lote antes de importar.
// Aceita { meta?, textos_base?, questoes: [...] } OU um array puro de questões.
import type { Questao, QuestoesRoot } from "../types/questao";

export interface ResultadoValidacao {
  ok: boolean;
  erros: string[];
  avisos: string[];
  questoes: Questao[];
  textosBase: Record<string, string>;
  faixaIds: [number, number] | null; // menor e maior id do lote
}

const DIFS = ["facil", "media", "dificil"];
const MODS = ["I", "II"];

export function validarLote(json: unknown): ResultadoValidacao {
  const erros: string[] = [];
  const avisos: string[] = [];

  // normaliza formato: array puro ou objeto raiz
  let questoes: Questao[] = [];
  let textosBase: Record<string, string> = {};
  if (Array.isArray(json)) {
    questoes = json as Questao[];
  } else if (json && typeof json === "object" && "questoes" in json) {
    const root = json as QuestoesRoot;
    questoes = root.questoes ?? [];
    textosBase = root.textos_base ?? {};
  } else {
    return { ok: false, erros: ["JSON não tem o formato esperado ({ questoes: [...] } ou um array)."], avisos, questoes: [], textosBase: {}, faixaIds: null };
  }

  if (questoes.length === 0) erros.push("Nenhuma questão encontrada no arquivo.");

  const idsVistos = new Set<number>();
  let min = Infinity;
  let max = -Infinity;

  questoes.forEach((q, i) => {
    const ref = `Questão #${q?.id ?? `(posição ${i + 1})`}`;
    if (typeof q?.id !== "number" || !Number.isInteger(q.id)) {
      erros.push(`${ref}: id ausente ou não é inteiro.`);
    } else {
      if (idsVistos.has(q.id)) erros.push(`${ref}: id duplicado dentro do próprio lote.`);
      idsVistos.add(q.id);
      min = Math.min(min, q.id);
      max = Math.max(max, q.id);
    }
    if (!MODS.includes(q?.modulo)) erros.push(`${ref}: módulo inválido (use "I" ou "II").`);
    if (!DIFS.includes(q?.dificuldade)) erros.push(`${ref}: dificuldade inválida (facil|media|dificil).`);
    if (!q?.materia) erros.push(`${ref}: sem matéria.`);
    if (!q?.assunto) erros.push(`${ref}: sem assunto.`);
    if (!q?.enunciado) erros.push(`${ref}: sem enunciado.`);
    if (!q?.alternativas || Object.keys(q.alternativas).length < 2)
      erros.push(`${ref}: precisa de ao menos 2 alternativas.`);
    else if (!q.alternativas[q.gabarito])
      erros.push(`${ref}: gabarito "${q.gabarito}" não corresponde a nenhuma alternativa.`);
    if (!q?.explicacao) avisos.push(`${ref}: sem explicação (recomendado).`);
    if (q?.texto_base && !textosBase[q.texto_base])
      erros.push(`${ref}: referencia texto_base "${q.texto_base}" que não está no lote.`);
    // aviso de acentuação: texto puramente ASCII costuma indicar falta de acentos
    if (q?.enunciado && !/[À-ÿ]/.test(q.enunciado) && /\b(nao|voce|questao|codigo|opcao)\b/i.test(q.enunciado))
      avisos.push(`${ref}: enunciado parece sem acentuação.`);
  });

  return {
    ok: erros.length === 0,
    erros,
    avisos,
    questoes,
    textosBase,
    faixaIds: idsVistos.size ? [min, max] : null,
  };
}

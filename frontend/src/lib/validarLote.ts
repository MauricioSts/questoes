// Valida e normaliza um JSON de lote antes de importar.
// Aceita { meta?, textos_base?, questoes: [...] } OU um array puro de questões.
import type { Questao, QuestoesRoot, Prova } from "../types/questao";

export interface ResultadoValidacao {
  ok: boolean;
  erros: string[];
  avisos: string[];
  questoes: Questao[];
  textosBase: Record<string, string>;
  provas: Record<string, Prova>;
  faixaIds: [number, number] | null; // menor e maior id do lote
}

const DIFS = ["facil", "media", "dificil"];
const MODS = ["I", "II"];
const POSICOES = ["enunciado", "alternativas"];
const ORIGENS = ["oficial", "adaptada", "gerada", "autoral"];

// Aceita só data URI de imagem: o campo vai direto no src, então um valor com http(s)
// ou caminho de arquivo significaria uma imagem que nunca vai carregar no app.
const DATA_URI_IMG = /^data:image\/(png|jpeg|jpg|gif|webp|svg\+xml);base64,[A-Za-z0-9+/=\s]+$/;

export function validarLote(json: unknown): ResultadoValidacao {
  const erros: string[] = [];
  const avisos: string[] = [];

  // normaliza formato: array puro ou objeto raiz
  let questoes: Questao[] = [];
  let textosBase: Record<string, string> = {};
  let provas: Record<string, Prova> = {};
  if (Array.isArray(json)) {
    questoes = json as Questao[];
  } else if (json && typeof json === "object" && "questoes" in json) {
    const root = json as QuestoesRoot;
    questoes = root.questoes ?? [];
    textosBase = root.textos_base ?? {};
    provas = root.provas ?? {};
  } else {
    return { ok: false, erros: ["JSON não tem o formato esperado ({ questoes: [...] } ou um array)."], avisos, questoes: [], textosBase: {}, provas: {}, faixaIds: null };
  }

  // Provas declaradas no root: sem banca/órgão/ano o selo de procedência não se sustenta.
  for (const [chave, p] of Object.entries(provas)) {
    const ref = `Prova "${chave}"`;
    if (!p?.banca) erros.push(`${ref}: sem banca.`);
    if (!p?.orgao) erros.push(`${ref}: sem órgão.`);
    if (typeof p?.ano !== "number" || !Number.isInteger(p.ano)) erros.push(`${ref}: ano ausente ou não é inteiro.`);
    if (p?.url && !/^https?:\/\//.test(p.url)) avisos.push(`${ref}: url não começa com http(s).`);
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
    if (q?.imagens !== undefined) {
      if (!Array.isArray(q.imagens)) {
        erros.push(`${ref}: "imagens" precisa ser uma lista.`);
      } else {
        q.imagens.forEach((img, j) => {
          const refImg = `${ref}, imagem ${j + 1}`;
          if (!img?.dados) erros.push(`${refImg}: sem o campo "dados" (data URI da imagem).`);
          else if (!DATA_URI_IMG.test(img.dados))
            erros.push(`${refImg}: "dados" não é um data URI de imagem em base64.`);
          if (!POSICOES.includes(img?.posicao))
            erros.push(`${refImg}: posição inválida (use "enunciado" ou "alternativas").`);
          if (!img?.legenda) avisos.push(`${refImg}: sem legenda (vira o alt da imagem).`);
          if (!img?.arquivo) avisos.push(`${refImg}: sem nome de arquivo (convenção: q{id}_{descricao}.png).`);
        });
      }
    }
    if (q?.texto_base && !textosBase[q.texto_base])
      erros.push(`${ref}: referencia texto_base "${q.texto_base}" que não está no lote.`);
    // Procedência. Campo ausente = "autoral" (compatível com os lotes antigos).
    if (q?.origem !== undefined && !ORIGENS.includes(q.origem))
      erros.push(`${ref}: origem inválida (use ${ORIGENS.map((o) => `"${o}"`).join(" | ")}).`);
    if ((q?.origem === "oficial" || q?.origem === "adaptada") && !q?.prova)
      erros.push(`${ref}: origem "${q.origem}" exige o campo "prova" (chave em "provas").`);
    if (q?.prova && !provas[q.prova])
      avisos.push(`${ref}: prova "${q.prova}" não está no lote (só passa se já existir no banco).`);
    if (q?.numero !== undefined && (!Number.isInteger(q.numero) || q.numero <= 0))
      erros.push(`${ref}: "numero" precisa ser um inteiro positivo (número da questão na prova).`);
    if (q?.geradaDe !== undefined && (!Array.isArray(q.geradaDe) || q.geradaDe.some((n) => !Number.isInteger(n))))
      erros.push(`${ref}: "geradaDe" precisa ser uma lista de IDs inteiros.`);
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
    provas,
    faixaIds: idsVistos.size ? [min, max] : null,
  };
}

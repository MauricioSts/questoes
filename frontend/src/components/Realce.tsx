import { Fragment, type ReactNode } from "react";
import type { Questao } from "../types/questao";

// Converte a marcação de destaque "[...]" em texto sublinhado.
// Muitas questões de Língua Portuguesa se referem a "o termo/elemento em
// destaque": no lote, esse trecho vem entre colchetes (ex.: "foi [ao encontro do]
// muro"). Os lotes certo/errado também marcam trechos-chave da explicação assim
// (docs/formato-lote-ce.md). Aqui os colchetes são removidos e o conteúdo é
// renderizado sublinhado.
//
// Modo padrão: TODO "[x]" sem colchete dentro vira destaque (comportamento de sempre).
// Modo código ({ codigo: true }): só para questões de programação, onde "[1, 2, 3]",
// "arr[0]", "[a-z]+", "[dbo].[Cliente]" são código. Ali qualquer "[...]" que pareça
// código fica literal, com os colchetes; só prosa clara continua destacada.
const RE_REALCE = /\[([^\][]+)\]/g;

export interface OpcoesRealce {
  codigo?: boolean;
}

// Retorna nós inline (strings + <u>) para colocar dentro de um elemento que
// preserva quebras (whitespace-pre-wrap). Sem marcação, devolve o texto puro.
export function comRealce(texto: string, opcoes: OpcoesRealce = {}): ReactNode {
  if (!texto.includes("[")) return texto;
  const segs = opcoes.codigo ? segmentarCodigo(texto) : segmentarPadrao(texto);
  if (segs.length === 1 && segs[0]!.tipo === "texto") return segs[0]!.valor;
  return segs.map((s, i) =>
    s.tipo === "realce" ? (
      <u
        key={i}
        className="underline decoration-brand-500 decoration-2 underline-offset-2 font-semibold"
      >
        {s.valor}
      </u>
    ) : (
      <Fragment key={i}>{s.valor}</Fragment>
    )
  );
}

export type Segmento = { tipo: "texto" | "realce"; valor: string };

function segmentarPadrao(texto: string): Segmento[] {
  const segs: Segmento[] = [];
  let ultimo = 0;
  let m: RegExpExecArray | null;
  RE_REALCE.lastIndex = 0;
  while ((m = RE_REALCE.exec(texto)) !== null) {
    if (m.index > ultimo) segs.push({ tipo: "texto", valor: texto.slice(ultimo, m.index) });
    segs.push({ tipo: "realce", valor: m[1]! });
    ultimo = m.index + m[0].length;
  }
  if (ultimo < texto.length) segs.push({ tipo: "texto", valor: texto.slice(ultimo) });
  return segs;
}

// ---- Modo código -------------------------------------------------------------

// Colado antes de "[": indexação/acesso (arr[0], m[1][2], f()[0]) ou SQL Server (x.[Col]).
const RE_ANTES_CODIGO = /[\p{L}\p{N}_$\]).]/u;
// Logo depois de "]": link/chamada "(", índice "[", SQL "." ou quantificador de regex.
const DEPOIS_CODIGO = new Set(["(", "[", ".", "+", "*", "?", "{"]);
// Prosa: só letras, com espaços simples no meio (sem espaço nas pontas).
const RE_PROSA = /^\p{L}+(?: \p{L}+)*$/u;
// Uma palavra ASCII sozinha é identificador ([Nome], [x], [dbo]), não destaque.
const RE_IDENT_ASCII = /^[A-Za-z_]\w*$/;
// Palavras-chave que denunciam código em conteúdo só de letras ([x if x else y]).
const RE_PALAVRA_CHAVE =
  /\b(?:for|in|if|else|elif|while|lambda|not|and|or|is|None|True|False|null|true|false|undefined|select|from|where|as)\b/i;

function pareceCodigo(interno: string): boolean {
  if (!RE_PROSA.test(interno)) return true; // números, símbolos, vírgulas, espaço nas pontas, $...
  if (RE_IDENT_ASCII.test(interno)) return true;
  return RE_PALAVRA_CHAVE.test(interno);
}

// Acha o "]" que fecha o "[" em `inicio`, respeitando aninhamento. -1 se não fecha.
function fechamento(texto: string, inicio: number): number {
  let prof = 0;
  for (let i = inicio; i < texto.length; i++) {
    const c = texto[i];
    if (c === "[") prof++;
    else if (c === "]" && --prof === 0) return i;
  }
  return -1;
}

function segmentarCodigo(texto: string): Segmento[] {
  const segs: Segmento[] = [];
  let buf = "";
  let i = 0;
  while (i < texto.length) {
    const ab = texto.indexOf("[", i);
    if (ab === -1) {
      buf += texto.slice(i);
      break;
    }
    buf += texto.slice(i, ab);
    const fim = fechamento(texto, ab);
    if (fim === -1) {
      // Sem par: nenhum "[" daqui em diante é tratado. Evita varredura O(n²).
      buf += texto.slice(ab);
      break;
    }
    const interno = texto.slice(ab + 1, fim);
    const literal =
      (ab > 0 && RE_ANTES_CODIGO.test(texto[ab - 1]!)) ||
      DEPOIS_CODIGO.has(texto[fim + 1] ?? "") ||
      pareceCodigo(interno); // inclui aninhado e vazio
    if (literal) {
      buf += texto.slice(ab, fim + 1);
    } else {
      if (buf) segs.push({ tipo: "texto", valor: buf });
      buf = "";
      segs.push({ tipo: "realce", valor: interno });
    }
    i = fim + 1;
  }
  if (buf) segs.push({ tipo: "texto", valor: buf });
  return segs;
}

// Exportado para teste.
export function segmentarRealce(texto: string, opcoes: OpcoesRealce = {}): Segmento[] {
  if (!texto.includes("[")) return texto ? [{ tipo: "texto", valor: texto }] : [];
  return opcoes.codigo ? segmentarCodigo(texto) : segmentarPadrao(texto);
}

// ---- Quando ligar o modo código ----------------------------------------------

// Trilha Dataprev (Analista de TI): módulo II = conhecimentos específicos de TI.
const TRILHA_DATAPREV_TI = "dataprev-analista-ti";

// Critério só com campos de dado (nada de adivinhar pelo texto):
// - a questão (ou o comando do certo/errado) traz bloco de `codigo`/`linguagem`, ou
//   `tipo` "saida"/"erro" (vem do GET /questoes);
// - a trilha do concurso ativo é de desenvolvimento (`dev-*`): todas as questões são de
//   programação, e a `materia` lá é o tópico da ementa, não um nome fixo;
// - trilha Dataprev TI, módulo II (Eng. de Software, BD, Infra, Segurança). O módulo I
//   (Português, Inglês...) fica no modo padrão.
export function questaoEmModoCodigo(
  q: Pick<Questao, "codigo" | "linguagem" | "tipo" | "comando" | "modulo">,
  trilhaId: string | null | undefined
): boolean {
  if (q.codigo || q.linguagem || q.comando?.codigo || q.comando?.linguagem) return true;
  if (q.tipo === "saida" || q.tipo === "erro") return true;
  if (trilhaId?.startsWith("dev-")) return true;
  return trilhaId === TRILHA_DATAPREV_TI && q.modulo === "II";
}

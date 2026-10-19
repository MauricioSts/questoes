import { Fragment, type ReactNode } from "react";

// Converte a marcação de destaque "[...]" em texto sublinhado.
// Muitas questões de Língua Portuguesa se referem a "o termo/elemento em
// destaque": no lote, esse trecho vem entre colchetes (ex.: "foi [ao encontro do]
// muro"). Aqui os colchetes são removidos e o conteúdo é renderizado sublinhado.
//
// Questões de programação usam colchetes de verdade ("[1, 2, 3]", "arr[0]",
// "[[1,2],[3]]", "[a](b)"). Esses casos ficam como texto literal, com os
// colchetes visíveis. Não existe suporte a link markdown: "[texto](url)" também
// fica literal.

// Caractere que, colado antes de "[", indica indexação/acesso (arr[0], m[1][2], f()[0]).
const RE_ANTES_INDEXACAO = /[\p{L}\p{N}_$\])]/u;
// Item de lista/código: número, string entre aspas, literal de linguagem ou
// identificador/expressão curta sem espaços.
const RE_ITEM_LITERAL =
  /^(?:-?\d+(?:\.\d+)?|(["'`]).*\1|True|False|None|true|false|null|undefined)$/;
const RE_ITEM_TOKEN = /^\S+$/;

function pareceCodigo(interno: string): boolean {
  const t = interno.trim();
  if (t === "") return true; // "[]"
  if (/[[\]]/.test(t)) return true; // aninhado
  if (/[:=;{}<>]|\.\.\./.test(t)) return true; // slices, atribuições, genéricos...
  const itens = t.split(",").map((s) => s.trim()).filter((s) => s !== "");
  // "[, porém,]" (destaque de palavra com vírgulas) não é lista.
  if (itens.length <= 1) return RE_ITEM_LITERAL.test(itens[0] ?? "");
  // Lista "a, b, c": código quando todo item é literal ou token sem espaço.
  // (Um trecho destacado com vírgula costuma ter frase com espaços.)
  return itens.every((s) => RE_ITEM_LITERAL.test(s) || RE_ITEM_TOKEN.test(s));
}

// Acha o "]" que fecha o "[" em `inicio`, respeitando aninhamento. -1 se não fecha.
function fechamento(texto: string, inicio: number): number {
  let prof = 0;
  for (let i = inicio; i < texto.length; i++) {
    const c = texto[i];
    if (c === "[") prof++;
    else if (c === "]") {
      prof--;
      if (prof === 0) return i;
    }
  }
  return -1;
}

export type Segmento = { tipo: "texto" | "realce"; valor: string };

// Divide o texto em trechos literais e trechos destacados (exportado para teste).
export function segmentarRealce(texto: string): Segmento[] {
  const segs: Segmento[] = [];
  let buf = "";
  let i = 0;
  while (i < texto.length) {
    const c = texto[i]!;
    if (c !== "[") {
      buf += c;
      i++;
      continue;
    }
    const fim = fechamento(texto, i);
    if (fim === -1) {
      buf += c;
      i++;
      continue;
    }
    const interno = texto.slice(i + 1, fim);
    const antes = i > 0 ? texto[i - 1]! : "";
    const depois = texto[fim + 1] ?? "";
    const literal =
      (antes !== "" && RE_ANTES_INDEXACAO.test(antes)) ||
      depois === "(" || // [a](b), [texto](url): sintaxe de link/código, fica literal
      depois === "[" || // a[0][1] / [x][y]
      pareceCodigo(interno);
    if (literal) {
      buf += texto.slice(i, fim + 1);
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

// Retorna nós inline (strings + <u>) para colocar dentro de um elemento que
// preserva quebras (whitespace-pre-wrap). Sem marcação, devolve o texto puro.
export function comRealce(texto: string): ReactNode {
  if (!texto.includes("[")) return texto;

  const segs = segmentarRealce(texto);
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

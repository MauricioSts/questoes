import { Fragment, type ReactNode } from "react";

// Converte a marcação de destaque "[...]" em texto sublinhado.
// Muitas questões de Língua Portuguesa se referem a "o termo/elemento em
// destaque": no lote, esse trecho vem entre colchetes (ex.: "foi [ao encontro do]
// muro"). Aqui os colchetes são removidos e o conteúdo é renderizado sublinhado.
const RE_REALCE = /\[([^\][]+)\]/g;

// Retorna nós inline (strings + <u>) para colocar dentro de um elemento que
// preserva quebras (whitespace-pre-wrap). Sem marcação, devolve o texto puro.
export function comRealce(texto: string): ReactNode {
  if (!texto.includes("[")) return texto;

  const partes: ReactNode[] = [];
  let ultimo = 0;
  let m: RegExpExecArray | null;
  RE_REALCE.lastIndex = 0;
  while ((m = RE_REALCE.exec(texto)) !== null) {
    if (m.index > ultimo) partes.push(texto.slice(ultimo, m.index));
    partes.push(
      <u
        key={m.index}
        className="underline decoration-brand-500 decoration-2 underline-offset-2 font-semibold"
      >
        {m[1]}
      </u>
    );
    ultimo = m.index + m[0].length;
  }
  if (ultimo < texto.length) partes.push(texto.slice(ultimo));

  return partes.map((p, i) => <Fragment key={i}>{p}</Fragment>);
}

// Cabeçalho padrão das telas: rótulo em maiúsculas + título serifado (fonte do tema)
// + subtítulo, com um slot opcional à direita (ex.: seletor de período).
import type { ReactNode } from "react";

export function PageHeader({
  rotulo,
  titulo,
  subtitulo,
  right,
}: {
  rotulo: string;
  titulo: string;
  subtitulo?: string;
  right?: ReactNode;
}) {
  return (
    <div className="mb-5 flex items-start justify-between gap-3">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[.18em] text-faint">{rotulo}</p>
        <h1
          className="mt-1 font-display leading-none text-brand-ink"
          style={{ fontSize: 40, fontWeight: "var(--displayWeight)" as never }}
        >
          {titulo}
        </h1>
        {subtitulo && <p className="mt-2 text-muted">{subtitulo}</p>}
      </div>
      {right && <div className="flex-shrink-0">{right}</div>}
    </div>
  );
}

// Cabeçalho padrão das telas: rótulo em maiúsculas + título serifado (fonte do tema)
// + subtítulo, com um slot opcional à direita (ex.: seletor de período).
import type { ReactNode } from "react";
import { TituloVivo } from "./TituloVivo";

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
      {/* cabecalho-texto: no Fantasy vira min-w-0 flex-1 (index.css) — o título é um
          canvas sem largura própria e mede o pai */}
      <div className="cabecalho-texto">
        <p className="legenda text-[11px] font-bold uppercase tracking-[.18em] text-faint">{rotulo}</p>
        <TituloVivo texto={titulo} tamanho={40} className="mt-1 leading-none" />
        {subtitulo && <p className="mt-2 text-muted">{subtitulo}</p>}
      </div>
      {right && <div className="flex-shrink-0">{right}</div>}
    </div>
  );
}

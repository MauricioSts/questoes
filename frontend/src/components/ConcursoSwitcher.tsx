// Trocador de concurso: brasão + nome + banca + setas ⇅. Abre a tela seletora.
// Mora dentro do cabeçalho da marca (ver BottomTab), então não tem borda nem fundo
// próprios — a moldura é a do bloco que o contém.
import { Link } from "react-router-dom";
import { useConcurso } from "../store/concurso";

export function ConcursoSwitcher() {
  const { ativo } = useConcurso();

  return (
    <Link
      to="/concursos"
      className="group flex items-center gap-2.5 px-3.5 py-3 transition hover:bg-brand-500/5"
      aria-label="Trocar de concurso"
      title="Trocar de concurso"
    >
      <span
        className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full border text-xs font-brand font-bold transition group-hover:border-brand-300"
        style={{ background: "var(--accentBg)", borderColor: "var(--accentBd)", color: "var(--accentText)" }}
      >
        {ativo?.iniciais ?? "?"}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-display font-bold leading-tight text-brand-ink">
          {ativo?.nome ?? "Selecionar concurso"}
        </span>
        <span className="block truncate text-[10px] uppercase tracking-[.12em] text-faint">
          {ativo ? `${ativo.banca} · ${ativo.ano}` : "Nenhum selecionado"}
        </span>
      </span>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 text-faint transition group-hover:text-brand-500" aria-hidden>
        <path d="m7 15 5 5 5-5" />
        <path d="m7 9 5-5 5 5" />
      </svg>
    </Link>
  );
}

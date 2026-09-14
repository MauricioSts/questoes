// Indicador de carregamento. Desenha em currentColor: por padrão pega o acento do tema e,
// dentro de um botão (className=""), herda a cor do texto do botão.
export function Spinner({
  tamanho = 20,
  className = "text-[color:var(--accent)]",
}: {
  tamanho?: number;
  className?: string;
}) {
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={`flex-shrink-0 animate-spin ${className}`}
    >
      <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="2.5" opacity=".2" />
      <path d="M21.5 12A9.5 9.5 0 0 0 12 2.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

// Bloco de carregamento de tela ou de seção: spinner centralizado com legenda opcional.
// Sem legenda visível, o "Carregando…" continua lá para leitor de tela.
export function Carregando({ texto, className = "py-10" }: { texto?: string; className?: string }) {
  return (
    <div role="status" className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <Spinner tamanho={28} />
      <span className={texto ? "text-sm text-faint" : "sr-only"}>{texto ?? "Carregando…"}</span>
    </div>
  );
}

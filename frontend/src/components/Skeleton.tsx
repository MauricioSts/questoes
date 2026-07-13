// Placeholder de carregamento (pulsante). Usa o token de chassi (hair) → adapta ao tema.
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-hair ${className}`} />;
}

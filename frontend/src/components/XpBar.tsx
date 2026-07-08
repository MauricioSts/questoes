interface XpBarProps {
  xpAtual: number;
  xpProximo: number;
  nivel?: number;
  rank?: string;
}

export function XpBar({ xpAtual, xpProximo, nivel = 1, rank }: XpBarProps) {
  const percent = (xpAtual / xpProximo) * 100;
  const faltam = xpProximo - xpAtual;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="h-16 w-16 rounded-lg bg-gradient-to-br from-brand-500 to-brand-400 flex items-center justify-center flex-shrink-0">
          <span className="font-display font-extrabold text-2xl text-white">{nivel}</span>
        </div>
        <div className="flex-1">
          <div className="font-display font-extrabold text-brand-ink">Nível {nivel}</div>
          {rank && <div className="text-xs text-faint">{rank}</div>}
          <div className="text-sm font-semibold text-brand-500">
            {xpAtual}/{xpProximo} XP
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <div className="h-3 w-full rounded-full bg-hair overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-brand-500 to-[#7C6FF6] transition-all duration-500"
            style={{
              width: `${percent}%`,
              backgroundSize: "200% 100%",
              animation: "shimmer 2s infinite",
            }}
          />
        </div>
        <div className="text-xs text-faint">Faltam {faltam} XP para nível {nivel + 1}</div>
      </div>
    </div>
  );
}

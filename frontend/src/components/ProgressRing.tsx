// Anel de progresso da meta diária (SVG, responsivo).
interface Props {
  valor: number;
  meta: number;
  size?: number;
}

export function ProgressRing({ valor, meta, size = 180 }: Props) {
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(valor / meta, 1);
  const completo = valor >= meta;

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" role="img" aria-label={`${valor} de ${meta}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className="stroke-slate-200 dark:stroke-slate-800"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          className={completo ? "stroke-acerto transition-all duration-700" : "stroke-brand transition-all duration-700"}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-bold tabular-nums">
          {valor}
          <span className="text-lg text-slate-400">/{meta}</span>
        </span>
        <span className="text-xs text-slate-400">{completo ? "meta batida! 🎉" : "respondidas hoje"}</span>
      </div>
    </div>
  );
}

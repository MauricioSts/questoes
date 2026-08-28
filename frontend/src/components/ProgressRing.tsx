// Anel da meta diária. Cores vêm dos tokens do tema: o trilho e os rótulos estavam
// fixos em branco, o que só funcionava no tema escuro — no Cyberpunk o cartão é
// branco e sumiam os dois, sobrando só o arco preenchido no ar.
interface Props {
  valor: number;
  meta: number;
  size?: number;
  strokeWidth?: number;
}

export function ProgressRing({ valor, meta, size = 148, strokeWidth = 13 }: Props) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percent = Math.min(valor / meta, 1);
  const dashOffset = circumference * (1 - percent);
  const completed = valor >= meta;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        role="img"
        aria-label={`${valor} de ${meta} questões`}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--track)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={completed ? "url(#successGradient)" : "url(#progressGradient)"}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          className="transition-all duration-1000"
          style={{ animation: "ringdraw 1.1s ease-out forwards" }}
        />
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7CF5C4" />
            <stop offset="100%" stopColor="#41D0FF" />
          </linearGradient>
          <linearGradient id="successGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#12995B" />
            <stop offset="100%" stopColor="#17B26A" />
          </linearGradient>
        </defs>
      </svg>

      <div className="absolute flex flex-col items-center gap-0.5">
        <div className="text-2xl font-display font-extrabold text-brand-ink">{valor}</div>
        <div className="text-xs text-muted">de {meta} hoje</div>
      </div>
    </div>
  );
}

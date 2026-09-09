// Anel da meta diária. Cores vêm dos tokens do tema: o trilho e os rótulos estavam
// fixos em branco, o que só funcionava no tema escuro — no Cyberpunk o cartão é
// branco e sumiam os dois, sobrando só o arco preenchido no ar.
//
// Os gradientes também eram hex fixos (um verde-menta e um verde vivo) que não
// pertenciam a nenhuma das duas paletas. Agora saem dos tokens de acento: em progresso
// o anel é discreto, e ao bater a meta ele fica no acento cheio — ouro no fantasy,
// magenta no cyberpunk. Bater a meta é a conquista do dia, então merece a cor da marca,
// não um verde de status. A virada dispara uma comemoração de uma vez só.
import { useEffect, useRef, useState } from "react";
import { Contador } from "./Contador";

interface Props {
  valor: number;
  meta: number;
  size?: number;
  strokeWidth?: number;
}

export function ProgressRing({ valor, meta, size = 148, strokeWidth = 13 }: Props) {
  const radius = (size - strokeWidth) / 2;
  // A onda da comemoração cresce para fora do anel, e o SVG recorta no próprio
  // viewBox — sem folga ela sai quadrada. Aumentamos a caixa e puxamos de volta com
  // margem negativa, então o espaço ocupado no layout continua sendo `size`.
  const folga = Math.round(size * 0.26);
  const caixa = size + folga * 2;
  const circumference = 2 * Math.PI * radius;
  const percent = Math.min(valor / meta, 1);
  const dashOffset = circumference * (1 - percent);
  const completed = valor >= meta;

  // Comemoração só na virada. Quem abre a Home com a meta já batida não vê o efeito
  // de novo a cada recarga — a referência começa no estado atual.
  const [celebrar, setCelebrar] = useState(false);
  const anterior = useRef(completed);

  useEffect(() => {
    if (completed && !anterior.current) {
      setCelebrar(true);
      anterior.current = completed;
      const t = setTimeout(() => setCelebrar(false), 1900);
      return () => clearTimeout(t);
    }
    anterior.current = completed;
  }, [completed]);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        width={caixa}
        height={caixa}
        viewBox={`${-folga} ${-folga} ${caixa} ${caixa}`}
        style={{ margin: -folga }}
        className="pointer-events-none -rotate-90 overflow-visible"
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

        {/* Onda que sai do anel no momento em que a meta é batida. */}
        {celebrar && (
          <circle
            className="meta-burst"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--accentHi)"
            strokeWidth={strokeWidth * 0.5}
          />
        )}

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
          style={{
            animation: celebrar
              ? "ringdraw 1.1s ease-out forwards, metaglow 1.6s ease-out"
              : "ringdraw 1.1s ease-out forwards",
            filter: completed && !celebrar ? "drop-shadow(0 0 7px var(--accentBd))" : undefined,
          }}
        />

        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgb(var(--muted))" />
            <stop offset="100%" stopColor="var(--accentText)" />
          </linearGradient>
          <linearGradient id="successGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--accentHi)" />
            <stop offset="100%" stopColor="var(--accent)" />
          </linearGradient>
        </defs>
      </svg>

      <div
        className="absolute inset-0 flex flex-col items-center justify-center gap-0.5"
        style={celebrar ? { animation: "metanum 900ms ease-out" } : undefined}
      >
        <div className="font-display text-2xl font-extrabold text-brand-ink">
          <Contador valor={valor} fontSize={24} cor="var(--text)" fontWeight={800} />
        </div>
        <div className="text-xs text-muted">de {meta} hoje</div>
      </div>
    </div>
  );
}

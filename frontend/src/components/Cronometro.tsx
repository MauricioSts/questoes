// Cronômetro regressivo do simulado (4h), pausável e opcional. Chama onFim ao zerar.
import { useEffect, useRef, useState } from "react";

export function Cronometro({ minutos, onFim }: { minutos: number; onFim: () => void }) {
  const [restante, setRestante] = useState(minutos * 60);
  const [pausado, setPausado] = useState(false);
  const onFimRef = useRef(onFim);
  onFimRef.current = onFim;

  useEffect(() => {
    if (pausado) return;
    const t = setInterval(() => {
      setRestante((s) => {
        if (s <= 1) {
          clearInterval(t);
          onFimRef.current();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [pausado]);

  const h = Math.floor(restante / 3600);
  const m = Math.floor((restante % 3600) / 60);
  const s = restante % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  const quaseAcabando = restante < 300;

  return (
    <div className="card flex items-center justify-between p-3">
      <span className={`font-mono text-lg tabular-nums ${quaseAcabando ? "text-erro" : ""}`}>
        ⏱ {pad(h)}:{pad(m)}:{pad(s)}
      </span>
      <button onClick={() => setPausado((p) => !p)} className="tap rounded-lg px-3 text-sm text-brand">
        {pausado ? "▶ Retomar" : "⏸ Pausar"}
      </button>
    </div>
  );
}

// Entrada do tema Topography: curvas de nível.
//
//   0 – 700 ms    o mar noturno se abre em círculo a partir do botão clicado e as curvas
//                 de nível se desenham de dentro para fora (o tema troca por baixo);
//   700 – 1500    o mapa se afasta (as curvas crescem) e se apaga, revelando o app.
//
// SVG + CSS, sem WebGL: o relevo de verdade é o fundo, aqui só a lembrança dele.
import { useMemo } from "react";
import { createPortal } from "react-dom";
import type { Origem } from "../../store/theme";
import { alcance, useFases } from "./useFases";

const COBRE = 700;
const FIM = 1500;
const CURVAS = 16;

interface Props {
  origem: Origem;
  aoCobrir: () => void;
  aoTerminar: () => void;
}

// Curva fechada irregular em volta de (x, y): raio base r com ondulações que mudam por volta.
function curva(x: number, y: number, r: number, k: number) {
  const n = 96;
  let d = "";
  for (let i = 0; i <= n; i++) {
    const a = (2 * Math.PI * i) / n;
    const rr = r * (1 + 0.07 * Math.sin(3 * a + k * 0.9) + 0.045 * Math.sin(5 * a - k * 1.7) + 0.025 * Math.sin(9 * a + k));
    d += `${i ? "L" : "M"}${(x + Math.cos(a) * rr).toFixed(1)} ${(y + Math.sin(a) * rr).toFixed(1)} `;
  }
  return d + "Z";
}

export default function TransicaoTopography({ origem, aoCobrir, aoTerminar }: Props) {
  const pular = useFases(COBRE, FIM, aoCobrir, aoTerminar);
  const g = useMemo(() => {
    const R = alcance(origem.x, origem.y) * 1.15;
    const curvas = Array.from({ length: CURVAS }, (_, k) => curva(origem.x, origem.y, R * Math.pow((k + 1) / CURVAS, 1.2), k));
    return { R, curvas };
  }, [origem]);
  const W = window.innerWidth;
  const H = window.innerHeight;

  return createPortal(
    <div
      className="tt"
      role="status"
      aria-live="polite"
      aria-label="Entrando no tema Topography"
      onClick={pular}
      style={{ ["--tt-x" as string]: `${origem.x}px`, ["--tt-y" as string]: `${origem.y}px`, ["--tt-r" as string]: `${g.R}px` }}
    >
      <div className="tt__mar" />
      <svg className="tt__mapa" width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden style={{ transformOrigin: `${origem.x}px ${origem.y}px` }}>
        <g fill="none" strokeLinejoin="round">
          {g.curvas.map((d, k) => (
            <path
              key={k}
              d={d}
              pathLength={1}
              stroke={k % 4 === 3 ? "#FFFFFF" : "#6C4DFF"}
              strokeWidth={k % 4 === 3 ? 1.6 : 1.1}
              style={{ animationDelay: `${60 + k * 30}ms` }}
            />
          ))}
        </g>
      </svg>
    </div>,
    document.body
  );
}

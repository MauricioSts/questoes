// Entrada do tema Lugia: rajada de vento.
//
//   0 – 620 ms    um clarão branco e iridescente abre do botão clicado enquanto linhas de
//                 vento no azul das asas atravessam a tela (o tema troca por baixo);
//   620 – 1400    o clarão se dissolve (desfoca e some) e revela o app claro.
import { useMemo } from "react";
import { createPortal } from "react-dom";
import type { Origem } from "../../store/theme";
import { alcance, useFases } from "./useFases";

const COBRE = 620;
const FIM = 1400;

interface Props {
  origem: Origem;
  aoCobrir: () => void;
  aoTerminar: () => void;
}

export default function TransicaoLugia({ origem, aoCobrir, aoTerminar }: Props) {
  const pular = useFases(COBRE, FIM, aoCobrir, aoTerminar);
  const W = window.innerWidth;
  const H = window.innerHeight;
  // Linhas de vento: curvas longas atravessando a tela em faixas, levemente onduladas.
  const ventos = useMemo(() => {
    const n = 9;
    return Array.from({ length: n }, (_, i) => {
      const y = H * (0.08 + (0.84 * i) / (n - 1));
      const onda = H * 0.05 * (i % 2 ? 1 : -1);
      return `M${-W * 0.1} ${y.toFixed(1)} C${(W * 0.3).toFixed(1)} ${(y + onda).toFixed(1)}, ${(W * 0.6).toFixed(1)} ${(y - onda).toFixed(1)}, ${(W * 1.1).toFixed(1)} ${(y + onda * 0.4).toFixed(1)}`;
    });
  }, [W, H]);

  return createPortal(
    <div
      className="tl"
      role="status"
      aria-live="polite"
      aria-label="Entrando no tema Lugia"
      onClick={pular}
      style={{ ["--tl-x" as string]: `${origem.x}px`, ["--tl-y" as string]: `${origem.y}px`, ["--tl-r" as string]: `${alcance(origem.x, origem.y) * 1.1}px` }}
    >
      <div className="tl__clarao" />
      <svg className="tl__vento" width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden>
        <g fill="none" strokeLinecap="round">
          {ventos.map((d, i) => (
            <path key={i} d={d} pathLength={1} stroke="#1B3E8B" strokeOpacity={i % 3 ? 0.35 : 0.7} strokeWidth={i % 3 ? 1.4 : 2.4} style={{ animationDelay: `${(i % 4) * 55}ms` }} />
          ))}
        </g>
      </svg>
    </div>,
    document.body
  );
}

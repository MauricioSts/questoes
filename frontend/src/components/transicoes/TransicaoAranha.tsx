// Entrada do tema Aranha: um quadro de gibi.
//
//   0 – 320 ms    fios de teia disparam do botão clicado até as bordas da tela;
//   120 – 760     a explosão de quadrinho (estrela vermelha com retícula e contorno de
//                 nanquim) cresce do mesmo ponto até cobrir tudo, e o "THWIP!" entra
//                 girando — o tema troca por baixo quando a tela está coberta;
//   560 – 900     a teia se desenha sobre a explosão;
//   900 – 1450    a página vira: um corte diagonal varre o quadro e revela o app.
//
// Tudo SVG + CSS (sem WebGL): é rápido de montar e é traço de gibi, não luz.
// Clique ou Esc pulam.
import { useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import type { Origem } from "../../store/theme";

const COBRE = 760;
const FIM = 1450;

try {
  void document.fonts?.load("400 120px 'Bangers'", "THWIP!");
} catch {
  /* sem Font Loading API */
}

interface Props {
  origem: Origem;
  aoCobrir: () => void;
  aoTerminar: () => void;
}

export default function TransicaoAranha({ origem, aoCobrir, aoTerminar }: Props) {
  const cb = useRef({ aoCobrir, aoTerminar });
  cb.current = { aoCobrir, aoTerminar };
  const pular = useRef<() => void>(() => {});

  // Geometria fixa por montagem: a tela não muda de tamanho em 1,4 s que importem.
  const g = useMemo(() => {
    const W = window.innerWidth;
    const H = window.innerHeight;
    const { x, y } = origem;
    const longe = Math.max(Math.hypot(x, y), Math.hypot(W - x, y), Math.hypot(x, H - y), Math.hypot(W - x, H - y));

    // Estrela de 22 pontas; o raio interno (0,8 R) tem de passar do canto mais longe.
    const R = (longe / 0.8) * 1.04;
    const pontas = 22;
    const estrela: string[] = [];
    for (let i = 0; i < pontas * 2; i++) {
      const a = (Math.PI * i) / pontas - Math.PI / 2;
      const r = i % 2 === 0 ? R * (0.97 + ((i * 37) % 7) * 0.012) : R * 0.8;
      estrela.push(`${(x + Math.cos(a) * r).toFixed(1)},${(y + Math.sin(a) * r).toFixed(1)}`);
    }

    // Fios: do clique até pontos espalhados nas bordas.
    const alvos: [number, number][] = [
      [0, 0], [W * 0.45, 0], [W, 0], [W, H * 0.5], [W, H], [W * 0.5, H], [0, H], [0, H * 0.45],
    ];
    const fios = alvos.map(([ax, ay]) => {
      // leve barriga no meio do fio, para não parecer régua
      const mx = (x + ax) / 2 + (ay - y) * 0.06;
      const my = (y + ay) / 2 - (ax - x) * 0.06;
      return `M${x} ${y} Q${mx.toFixed(1)} ${my.toFixed(1)} ${ax} ${ay}`;
    });

    // Teia sobre a explosão: 14 raios + 7 voltas em corda.
    const nRaios = 14;
    const alcance = longe * 1.05;
    const raios: string[] = [];
    for (let i = 0; i < nRaios; i++) {
      const a = (2 * Math.PI * i) / nRaios + 0.2;
      raios.push(`M${x} ${y} L${(x + Math.cos(a) * alcance).toFixed(1)} ${(y + Math.sin(a) * alcance).toFixed(1)}`);
    }
    const voltas: string[] = [];
    for (let k = 1; k <= 7; k++) {
      const r = alcance * Math.pow(k / 7, 1.35);
      let d = "";
      for (let i = 0; i <= nRaios; i++) {
        const a0 = (2 * Math.PI * i) / nRaios + 0.2;
        const px = x + Math.cos(a0) * r;
        const py = y + Math.sin(a0) * r;
        if (i === 0) d += `M${px.toFixed(1)} ${py.toFixed(1)} `;
        else {
          // corda cedendo para o centro
          const am = a0 - Math.PI / nRaios;
          const cx = x + Math.cos(am) * r * 0.86;
          const cy = y + Math.sin(am) * r * 0.86;
          d += `Q${cx.toFixed(1)} ${cy.toFixed(1)} ${px.toFixed(1)} ${py.toFixed(1)} `;
        }
      }
      voltas.push(d);
    }
    return { W, H, estrela: estrela.join(" "), fios, raios, voltas };
  }, [origem]);

  useEffect(() => {
    let cobriu = false;
    let terminou = false;
    const cobrir = () => {
      if (cobriu) return;
      cobriu = true;
      cb.current.aoCobrir();
    };
    const terminar = () => {
      if (terminou) return;
      terminou = true;
      cobrir();
      cb.current.aoTerminar();
    };
    pular.current = terminar;
    const t1 = setTimeout(cobrir, COBRE);
    const t2 = setTimeout(terminar, FIM);
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") terminar();
    };
    window.addEventListener("keydown", tecla);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener("keydown", tecla);
    };
  }, []);

  const { W, H } = g;
  const origemCss = `${origem.x}px ${origem.y}px`;

  return createPortal(
    <div className="ta" role="status" aria-live="polite" aria-label="Entrando no tema Aranha" onClick={() => pular.current()}>
      <svg className="ta__svg" width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden>
        <defs>
          <pattern id="ta-reticula" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(15)">
            <circle cx="7" cy="7" r="3.4" fill="#A30F1E" />
          </pattern>
          <pattern id="ta-reticula-amarela" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <circle cx="6" cy="6" r="2.2" fill="#FFD23F" />
          </pattern>
          <radialGradient id="ta-miolo" cx={origem.x} cy={origem.y} r={Math.max(W, H) * 0.7} gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#FFD23F" stopOpacity="0.9" />
            <stop offset="0.35" stopColor="#FFD23F" stopOpacity="0" />
          </radialGradient>
        </defs>

        <g className="ta__quadro">
          <g className="ta__explosao" style={{ transformOrigin: origemCss }}>
            <polygon points={g.estrela} fill="#D4192C" stroke="#141018" strokeWidth="10" strokeLinejoin="miter" />
            <polygon points={g.estrela} fill="url(#ta-reticula)" />
            <polygon points={g.estrela} fill="url(#ta-miolo)" />
            <polygon points={g.estrela} fill="url(#ta-reticula-amarela)" className="ta__brilho" />
          </g>

          <g className="ta__teia" fill="none" stroke="#141018" strokeLinecap="round">
            {g.raios.map((d, i) => (
              <path key={`r${i}`} d={d} pathLength={1} strokeWidth="3" style={{ animationDelay: `${560 + i * 8}ms` }} />
            ))}
            {g.voltas.map((d, i) => (
              <path key={`v${i}`} d={d} pathLength={1} strokeWidth="2.4" style={{ animationDelay: `${640 + i * 30}ms` }} />
            ))}
          </g>

          <g className="ta__onomatopeia" style={{ transformOrigin: `${W / 2}px ${H / 2}px` }}>
            <text x={W / 2 + 7} y={H / 2 + 7} className="ta__thwip ta__thwip--sombra" textAnchor="middle" dominantBaseline="middle">
              THWIP!
            </text>
            <text x={W / 2} y={H / 2} className="ta__thwip" textAnchor="middle" dominantBaseline="middle">
              THWIP!
            </text>
          </g>
        </g>

        <g className="ta__fios" fill="none" stroke="#141018" strokeWidth="2.6" strokeLinecap="round">
          {g.fios.map((d, i) => (
            <path key={i} d={d} pathLength={1} style={{ animationDelay: `${i * 22}ms` }} />
          ))}
        </g>
      </svg>
    </div>,
    document.body
  );
}

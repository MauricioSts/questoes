// Marca de alternativa eliminada, com a cara de cada tema. Substitui o risco neutro:
// - Aranha:    teia disparada do botão de eliminar, que gruda na alternativa.
// - Venom:     o simbionte escorre por cima dela.
// - Cyberpunk: glitch, e um laser corta a linha com "ERR://DESCARTADA".
// - Topography: a pena do cartógrafo traça a rota riscada e marca um X no fim.
// - Lugia:     rajada de vento que deixa uma pena pousada.
//
// A animação toca ao montar (montar = acabou de eliminar) e o estado final é o estilo
// base de cada peça, então com prefers-reduced-motion (animação desligada no CSS) a marca
// aparece pronta. Cobre só o cartão da alternativa: fica dentro do <li> e para antes do
// botão de eliminar (w-11 + gap-2 = 52px), de onde a teia do Aranha sai.
import { useId } from "react";
import type { Tema } from "../store/theme";

export function EfeitoEliminar({ tema }: { tema: Tema }) {
  return (
    <div aria-hidden className={`elim elim--${tema}`}>
      {tema === "aranha" && <Teia />}
      {tema === "venom" && <Gosma />}
      {tema === "cyberpunk" && <Laser />}
      {tema === "fantasy" && <Rota />}
      {tema === "rose" && <Rajada />}
    </div>
  );
}

// ---------- Aranha ----------

// Teia radial em volta de (C, C): raios com leve variação e espirais que cedem entre um
// raio e outro (a curva puxa para o centro, como fio de verdade). Calculada uma vez só.
const C = 70;
const RAIOS = 11;
const TEIA = (() => {
  const ang = Array.from({ length: RAIOS }, (_, i) => (i / RAIOS) * Math.PI * 2 + (i % 2 ? 0.12 : -0.05));
  const alcance = ang.map((_, i) => 60 + ((i * 37) % 11));
  const ponto = (a: number, r: number) => `${(C + Math.cos(a) * r).toFixed(1)},${(C + Math.sin(a) * r).toFixed(1)}`;
  const raios = ang.map((a, i) => `M${C},${C} L${ponto(a, alcance[i])}`).join(" ");
  const aneis = [14, 27, 41, 55]
    .map((r) =>
      ang
        .map((a, i) => {
          const b = ang[(i + 1) % RAIOS] + (i + 1 === RAIOS ? Math.PI * 2 : 0);
          const meio = (a + b) / 2;
          return `${i === 0 ? `M${ponto(a, r)}` : ""} Q${ponto(meio, r * 0.84)} ${ponto(b, r)}`;
        })
        .join(" ")
    )
    .join(" ");
  return `${raios} ${aneis}`;
})();

const ANCORAS = [-168, -150, -24, 14, 160, 176, 196].map((g) => {
  const a = (g * Math.PI) / 180;
  return `M${C},${C} L${(C + Math.cos(a) * 520).toFixed(0)},${(C + Math.sin(a) * 520).toFixed(0)}`;
});

function Teia() {
  return (
    <>
      <span className="elim-aranha__fio" />
      <div className="elim__recorte">
        <svg className="elim-aranha__teia" viewBox="0 0 140 140">
          {/* Fios que esticam do centro até as bordas do cartão (o recorte corta o excesso) */}
          {ANCORAS.map((d) => (
            <path key={d} className="elim-aranha__ancora" d={d} pathLength={1} />
          ))}
          <path className="elim-aranha__halo" d={TEIA} />
          <path d={TEIA} />
        </svg>
      </div>
    </>
  );
}

// ---------- Venom ----------

// Faixa no topo + gotas que escorrem; o filtro de gosma (desfoca e corta o alfa) funde
// tudo numa massa só. Posição, largura e comprimento de cada gota, em %.
const GOTAS: [number, number, number][] = [
  [9, 7, 58],
  [24, 5, 34],
  [41, 8, 78],
  [58, 5, 46],
  [73, 7, 66],
  [90, 5, 38],
];

function Gosma() {
  const id = useId().replace(/:/g, "");
  return (
    <div className="elim__recorte">
      <svg width="0" height="0" className="absolute">
        <filter id={`gosma-${id}`}>
          <feGaussianBlur stdDeviation="4" />
          <feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -10" />
        </filter>
      </svg>
      <div className="elim-venom__massa" style={{ filter: `url(#gosma-${id}) drop-shadow(0 0 1.5px rgba(150,170,255,.55))` }}>
        <span className="elim-venom__faixa" />
        {GOTAS.map(([x, w, h], i) => (
          <span
            key={x}
            className="elim-venom__gota"
            style={{ left: `${x}%`, width: `${w * 2.8}px`, height: `${h}%`, animationDelay: `${0.12 + i * 0.07}s` }}
          />
        ))}
        <span className="elim-venom__pingo" style={{ left: "41%" }} />
      </div>
    </div>
  );
}

// ---------- Cyberpunk ----------

function Laser() {
  return (
    <>
      <div className="elim__recorte">
        <span className="elim-cyber__flash" />
        <span className="elim-cyber__fatia" style={{ top: "12%", height: "20%" }} />
        <span className="elim-cyber__fatia elim-cyber__fatia--b" style={{ top: "46%", height: "12%" }} />
        <span className="elim-cyber__fatia" style={{ top: "70%", height: "18%", animationDelay: ".06s" }} />
      </div>
      <span className="elim-cyber__laser" />
      <span className="elim-cyber__tag">ERR://DESCARTADA</span>
    </>
  );
}

// ---------- Topography ----------

function Rota() {
  return (
    <div className="elim__recorte">
      <svg className="elim-fantasy__rota" viewBox="0 0 100 100" preserveAspectRatio="none">
        <path
          d="M3,56 C12,40 22,66 34,52 S54,36 64,52 S84,64 93,50"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <span className="elim-fantasy__curva" />
      <span className="elim-fantasy__curva elim-fantasy__curva--2" />
      <svg className="elim-fantasy__x" viewBox="0 0 20 20">
        <path d="M4,4 L16,16" pathLength={1} />
        <path d="M16,4 L4,16" pathLength={1} />
      </svg>
    </div>
  );
}

// ---------- Lugia ----------

function Rajada() {
  return (
    <>
      <div className="elim__recorte">
        <svg className="elim-rose__vento" viewBox="0 0 100 100" preserveAspectRatio="none">
          <path d="M-5,30 C25,24 55,36 82,28 C92,25 94,16 86,15" vectorEffect="non-scaling-stroke" />
          <path d="M-5,56 C30,50 60,62 90,52" vectorEffect="non-scaling-stroke" />
          <path d="M-5,78 C20,74 48,84 74,76 C84,73 86,64 78,63" vectorEffect="non-scaling-stroke" />
        </svg>
      </div>
      <svg className="elim-rose__pena" viewBox="0 0 24 24">
        <path className="elim-rose__vexilo" d="M20.5 3.5C14 3.2 7.8 7.6 5.6 14.2l-.9 2.8 2.7-1c6.3-2.4 10.9-8.3 13.1-12.5z" />
        <path className="elim-rose__raque" d="M3 21 L17.5 6.5" />
        <path className="elim-rose__raque" d="M9.4 12.6 L13.2 12.9 M12 10 L16 10.1" />
      </svg>
    </>
  );
}

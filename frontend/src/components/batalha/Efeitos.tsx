// Camada de efeitos da arena: golpes de cada tema, contra-ataque da questão, números de
// dano, cura, captura e faixas ("ANDAR 2", "CHEFE!"). Cada efeito vive o tempo da própria
// animação; quem cria e remove é a tela (pages/Batalha, função `efeito`).
//
// Posições em % da arena: o parceiro fica em P, a questão em E (centros aproximados dos
// sprites definidos em batalha.css). Linhas usam um SVG esticado com traço que não escala;
// formas que não podem deformar (teia, explosão, orbe) são divs posicionadas no ponto.
import type { CSSProperties, ReactNode } from "react";
import type { Tema } from "../../store/theme";

export const P = { x: 27, y: 57 };
export const E = { x: 71, y: 30 };

export type Efeito =
  | { id: number; k: "golpe"; tema: Tema; forte: boolean; acerta: boolean }
  | { id: number; k: "contra"; cor: string; glifo: string; forte: boolean }
  | { id: number; k: "numero"; alvo: "p" | "e"; texto: string; cor: string; grande?: boolean }
  | { id: number; k: "cura" }
  | { id: number; k: "captura"; cor: string }
  | { id: number; k: "banner"; texto: string; sub?: string; cor?: string };

type SemId<T> = T extends unknown ? Omit<T, "id"> : never;
export type NovoEfeito = SemId<Efeito>;

// Duração de cada efeito na tela (ms): também é quando a tela o remove.
export function duracao(e: NovoEfeito): number {
  switch (e.k) {
    case "golpe":
      return e.forte ? 1300 : 1000;
    case "contra":
      return 900;
    case "numero":
      return 1300;
    case "cura":
      return 1300;
    case "captura":
      return 2600;
    case "banner":
      return 1700;
  }
}

const noPonto = (p: { x: number; y: number }, extra?: CSSProperties): CSSProperties => ({
  left: `${p.x}%`,
  top: `${p.y}%`,
  ...extra,
});
const voo = (de: { x: number; y: number }, para: { x: number; y: number }, extra?: CSSProperties) =>
  ({ "--x0": `${de.x}%`, "--y0": `${de.y}%`, "--x1": `${para.x}%`, "--y1": `${para.y}%`, ...extra }) as CSSProperties;

// Ponto de chegada de um golpe que erra: passa raspando por cima da questão.
const RASPANDO = { x: E.x + 16, y: E.y - 22 };

function Linhas({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <svg className={`bt-fx-linhas ${className}`} viewBox="0 0 100 100" preserveAspectRatio="none">
      {children}
    </svg>
  );
}

// Explosão de impacto: estrela + faíscas radiais.
export function Impacto({ em, cor, grande = false }: { em: { x: number; y: number }; cor: string; grande?: boolean }) {
  return (
    <div className={`bt-fx-impacto ${grande ? "bt-fx-impacto--grande" : ""}`} style={noPonto(em, { color: cor })}>
      <svg viewBox="-50 -50 100 100">
        <path d="M0 -40 L9 -12 L38 -14 L14 4 L26 34 L0 16 L-26 34 L-14 4 L-38 -14 L-9 -12Z" fill="currentColor" stroke="#fff" strokeWidth="3" />
        {Array.from({ length: 8 }, (_, i) => (
          <circle key={i} className="bt-fx-faisca" cx="0" cy="0" r="3" fill="#fff" style={{ "--a": `${i * 45}deg` } as CSSProperties} />
        ))}
      </svg>
    </div>
  );
}

// Teia radial usada pelo golpe do Aranha
function TeiaSplat({ grande }: { grande: boolean }) {
  const raios = Array.from({ length: 10 }, (_, i) => (i / 10) * Math.PI * 2);
  const ponto = (a: number, r: number) => `${(Math.cos(a) * r).toFixed(1)},${(Math.sin(a) * r).toFixed(1)}`;
  const aneis = [12, 22, 32, 42]
    .map((r) => raios.map((a, i) => `${i === 0 ? `M${ponto(a, r)}` : ""} Q${ponto(a + Math.PI / 10, r * 0.82)} ${ponto(raios[(i + 1) % 10] + (i === 9 ? Math.PI * 2 : 0), r)}`).join(" "))
    .join(" ");
  return (
    <div className={`bt-fx-teia ${grande ? "bt-fx-teia--grande" : ""}`} style={noPonto(E)}>
      <svg viewBox="-50 -50 100 100">
        <path d={`${raios.map((a) => `M0,0 L${ponto(a, 48)}`).join(" ")} ${aneis}`} fill="none" stroke="#FFFBF3" strokeWidth="3.4" strokeLinecap="round" />
        <path d={`${raios.map((a) => `M0,0 L${ponto(a, 48)}`).join(" ")} ${aneis}`} fill="none" stroke="#141018" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    </div>
  );
}

function Golpe({ tema, forte, acerta }: { tema: Tema; forte: boolean; acerta: boolean }) {
  const alvo = acerta ? E : RASPANDO;
  const curva = (dy: number) => `M${P.x},${P.y} Q${(P.x + alvo.x) / 2},${Math.min(P.y, alvo.y) + dy} ${alvo.x},${alvo.y}`;

  if (tema === "aranha")
    return (
      <>
        <Linhas className="bt-fx-disparo">
          {(forte ? [-6, 0, 6] : [0]).map((d) => (
            <path key={d} d={curva(d - 4)} stroke="#141018" strokeWidth={forte ? 2.4 : 2} fill="none" vectorEffect="non-scaling-stroke" />
          ))}
        </Linhas>
        {acerta && <TeiaSplat grande={forte} />}
      </>
    );

  if (tema === "venom")
    return (
      <>
        <Linhas className="bt-fx-chicote">
          {(forte ? [-18, 10] : [-12]).map((d) => (
            <g key={d}>
              <path d={curva(d)} stroke="#3A4270" strokeWidth="11" fill="none" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
              <path d={curva(d)} stroke="#07080D" strokeWidth="8" fill="none" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            </g>
          ))}
        </Linhas>
        {acerta && forte && (
          <div className="bt-fx-mordida" style={noPonto(E)}>
            <svg viewBox="-50 -50 100 100">
              <path className="bt-fx-mandibula-c" d="M-40 -8 C-30 -40 30 -40 40 -8 L32 -4 L26 -14 L18 -4 L10 -14 L2 -4 L-6 -14 L-14 -4 L-22 -14 L-30 -4Z" fill="#07080D" stroke="#fff" strokeWidth="2" />
              <path className="bt-fx-mandibula-b" d="M-40 8 C-30 40 30 40 40 8 L32 4 L26 14 L18 4 L10 14 L2 4 L-6 14 L-14 4 L-22 14 L-30 4Z" fill="#07080D" stroke="#fff" strokeWidth="2" />
            </svg>
          </div>
        )}
      </>
    );

  if (tema === "cyberpunk")
    return (
      <>
        <Linhas className="bt-fx-laser">
          {(forte ? [-3, 0, 3] : [0]).map((d, i) => (
            <path
              key={d}
              d={`M${P.x},${P.y + d} L${alvo.x},${alvo.y + d}`}
              stroke={["#00F0FF", "#FF2A6D", "#FCEE0A"][i]}
              strokeWidth={forte ? 4 : 5}
              fill="none"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </Linhas>
        {forte && (
          <div className="bt-fx-texto" style={noPonto({ x: 50, y: 18 }, { color: "#FCEE0A" })}>
            OVERCLOCK
          </div>
        )}
        {acerta &&
          Array.from({ length: forte ? 14 : 8 }, (_, i) => (
            <span
              key={i}
              className="bt-fx-pixel"
              style={noPonto(E, { "--dx": `${Math.cos(i * 2.4) * (30 + (i % 3) * 14)}px`, "--dy": `${Math.sin(i * 2.4) * (24 + (i % 4) * 10)}px`, background: ["#00F0FF", "#FF2A6D", "#FCEE0A"][i % 3] } as CSSProperties)}
            />
          ))}
      </>
    );

  if (tema === "fantasy")
    return (
      <>
        {(forte ? [0, 0.08, 0.16] : [0, 0.1]).map((d) => (
          <span key={d} className="bt-fx-anel" style={voo(P, alvo, { animationDelay: `${d}s` })} />
        ))}
        {acerta && (
          <div className={`bt-fx-constelacao ${forte ? "bt-fx-constelacao--grande" : ""}`} style={noPonto(E)}>
            <svg viewBox="-50 -50 100 100">
              <path d="M-34 -10 L-12 -30 L14 -22 L32 4 L6 30 L-24 18Z M-12 -30 L6 30" fill="none" stroke="#C9C2FF" strokeWidth="1.5" />
              {[[-34, -10], [-12, -30], [14, -22], [32, 4], [6, 30], [-24, 18]].map(([x, y], i) => (
                <path key={i} d={`M${x} ${y - 5} L${x + 1.5} ${y - 1.5} L${x + 5} ${y} L${x + 1.5} ${y + 1.5} L${x} ${y + 5} L${x - 1.5} ${y + 1.5} L${x - 5} ${y} L${x - 1.5} ${y - 1.5}Z`} fill="#fff" />
              ))}
            </svg>
          </div>
        )}
      </>
    );

  // rose (Lugia): rajada de vento com penas
  return (
    <>
      <Linhas className="bt-fx-vento">
        {[-14, -4, 6].map((d) => (
          <path key={d} d={curva(d)} stroke="#7F9BD0" strokeWidth={forte ? 4 : 3} fill="none" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        ))}
      </Linhas>
      {(forte ? [0, 0.1, 0.2, 0.3] : [0, 0.15]).map((d, i) => (
        <span key={d} className="bt-fx-pena" style={voo({ x: P.x, y: P.y + (i % 2 ? 6 : -6) }, alvo, { animationDelay: `${d}s` })}>
          <svg viewBox="0 0 24 24">
            <path d="M20.5 3.5C14 3.2 7.8 7.6 5.6 14.2l-.9 2.8 2.7-1c6.3-2.4 10.9-8.3 13.1-12.5z" fill="#EAF0FF" stroke="#7F9BD0" />
          </svg>
        </span>
      ))}
      {acerta && forte && <span className="bt-fx-vortice" style={noPonto(E)} />}
    </>
  );
}

function Um({ e }: { e: Efeito }) {
  switch (e.k) {
    case "golpe":
      return (
        <>
          <Golpe tema={e.tema} forte={e.forte} acerta={e.acerta} />
          {e.acerta && (
            <div className="bt-fx-atrasado">
              <Impacto em={E} cor={e.forte ? "#FFC857" : "#fff"} grande={e.forte} />
            </div>
          )}
        </>
      );
    case "contra":
      return (
        <>
          <span className={`bt-fx-projetil ${e.forte ? "bt-fx-projetil--forte" : ""}`} style={voo(E, P, { background: e.cor })}>
            {e.glifo}
          </span>
          <div className="bt-fx-atrasado-contra">
            <Impacto em={P} cor={e.cor} grande={e.forte} />
          </div>
        </>
      );
    case "numero":
      return (
        <span
          className={`bt-fx-numero ${e.grande ? "bt-fx-numero--grande" : ""}`}
          style={noPonto(e.alvo === "p" ? { x: P.x, y: P.y - 18 } : { x: E.x, y: E.y - 16 }, { color: e.cor })}
        >
          {e.texto}
        </span>
      );
    case "cura":
      return (
        <>
          {Array.from({ length: 9 }, (_, i) => (
            <span
              key={i}
              className="bt-fx-mais"
              style={noPonto({ x: P.x - 10 + (i * 7) % 22, y: P.y + 10 - (i % 3) * 6 }, { animationDelay: `${i * 0.07}s` })}
            >
              +
            </span>
          ))}
        </>
      );
    case "captura":
      return (
        <div className="bt-fx-orbe" style={noPonto(E, { "--cor": e.cor } as CSSProperties)}>
          <span className="bt-fx-orbe__bola" />
          {Array.from({ length: 6 }, (_, i) => (
            <span key={i} className="bt-fx-estrela" style={{ "--a": `${i * 60}deg` } as CSSProperties}>
              ★
            </span>
          ))}
        </div>
      );
    case "banner":
      return (
        <div className="bt-fx-banner" style={{ "--cor": e.cor ?? "#141018" } as CSSProperties}>
          <span className="bt-fx-banner__texto">{e.texto}</span>
          {e.sub && <span className="bt-fx-banner__sub">{e.sub}</span>}
        </div>
      );
  }
}

export function Efeitos({ efeitos }: { efeitos: Efeito[] }) {
  return (
    <div className="bt-fx" aria-hidden>
      {efeitos.map((e) => (
        <Um key={e.id} e={e} />
      ))}
    </div>
  );
}

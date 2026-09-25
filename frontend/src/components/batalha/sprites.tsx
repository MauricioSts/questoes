// Sprites da Batalha, em SVG animado por CSS (batalha.css, classes bt-a-*): respiração,
// piscar, asas, caudas, tentáculos, partículas em órbita.
// - O parceiro muda com o tema do app e EVOLUI com o nível (3 formas cada, ver
//   lib/batalha: estagioDoNivel). Cada forma acrescenta partes à anterior.
// - O inimigo é uma "questão selvagem": cor, símbolo e acessório vêm da matéria; nível
//   alto na revisão espaçada deixa ela mais ameaçadora, e o chefe ganha coroa e capa.
//
// transform-origin nas partes animadas vem inline, em coordenadas do viewBox (a regra
// .bt-svg * usa transform-box: view-box).
import { useId, type CSSProperties, type ReactNode } from "react";
import type { Tema } from "../../store/theme";

// ---------- parceiros ----------

export interface Forma {
  nome: string;
  especie: string;
}

export interface Parceiro {
  formas: [Forma, Forma, Forma];
  golpeCerteza: string;
  golpeDuvida: string;
}

export const PARCEIROS: Record<Tema, Parceiro> = {
  fantasy: {
    formas: [
      { nome: "Relevoruja", especie: "coruja cartógrafa" },
      { nome: "Cartocoruja", especie: "guardiã das bússolas" },
      { nome: "Atlasgrifo", especie: "grifo das constelações" },
    ],
    golpeCerteza: "Traço de Relevo",
    golpeDuvida: "Bússola Cautelosa",
  },
  rose: {
    formas: [
      { nome: "Lugito", especie: "guardião dos ventos" },
      { nome: "Lugivento", especie: "senhor das correntes" },
      { nome: "Lugião", especie: "tempestade prateada" },
    ],
    golpeCerteza: "Rajada Prateada",
    golpeDuvida: "Pena Suave",
  },
  cyberpunk: {
    formas: [
      { nome: "Voltrix", especie: "raposa de neon" },
      { nome: "Voltrax", especie: "raposa overclock" },
      { nome: "Neonkitsune", especie: "kitsune de nove processos" },
    ],
    golpeCerteza: "Overclock",
    golpeDuvida: "Ping Seguro",
  },
  aranha: {
    formas: [
      { nome: "Aracnino", especie: "herói da vizinhança" },
      { nome: "Aracnídeo", especie: "teia-andante" },
      { nome: "Aranha-Escarlate", especie: "lenda dos gibis" },
    ],
    golpeCerteza: "Teia Certeira",
    golpeDuvida: "Sentido Aranha",
  },
  venom: {
    formas: [
      { nome: "Simbi", especie: "simbionte filhote" },
      { nome: "Simbionte", especie: "gosma faminta" },
      { nome: "Venomorfo", especie: "predador simbionte" },
    ],
    golpeCerteza: "Mordida Simbionte",
    golpeDuvida: "Tentáculo Tateante",
  },
};

const o = (x: number, y: number): CSSProperties => ({ transformOrigin: `${x}px ${y}px` });
const atraso = (s: number): CSSProperties => ({ animationDelay: `${s}s` });

// Gradiente vertical de volume (luz de cima): claro → base → escuro. O id é único por
// instância porque a mesma tela desenha vários sprites.
function useGrad() {
  const id = useId().replace(/:/g, "");
  const defs = (nome: string, claro: string, base: string, escuro: string) => (
    <linearGradient id={`${id}${nome}`} x1="0" y1="0" x2="0.35" y2="1">
      <stop offset="0" stopColor={claro} />
      <stop offset=".45" stopColor={base} />
      <stop offset="1" stopColor={escuro} />
    </linearGradient>
  );
  return { url: (nome: string) => `url(#${id}${nome})`, defs };
}

// Brilho especular: a "luz" batendo no alto do corpo.
function Brilho({ cx, cy, rx, ry, rot = -30, op = 0.22 }: { cx: number; cy: number; rx: number; ry: number; rot?: number; op?: number }) {
  return <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#fff" opacity={op} transform={`rotate(${rot} ${cx} ${cy})`} />;
}

// Formas menores ocupam menos do quadro: a evolução também é crescer.
function Escala({ estagio, children }: { estagio: number; children: ReactNode }) {
  const k = estagio === 1 ? 0.78 : estagio === 2 ? 0.87 : 0.93;
  return <g transform={`translate(60 110) scale(${k}) translate(-60 -110)`}>{children}</g>;
}

export function SpriteParceiro({ tema, estagio = 1, silhueta = false }: { tema: Tema; estagio?: number; silhueta?: boolean }) {
  return (
    <svg viewBox="0 0 120 120" className={`bt-svg h-full w-full ${silhueta ? "bt-svg--silhueta" : ""}`} aria-hidden>
      <ellipse cx="60" cy="112" rx={26 + estagio * 5} ry="6" fill="rgba(0,0,0,.22)" className="bt-a-sombra" style={o(60, 112)} />
      <Escala estagio={estagio}>
        {tema === "fantasy" && <Relevoruja e={estagio} />}
        {tema === "rose" && <Lugito e={estagio} />}
        {tema === "cyberpunk" && <Voltrix e={estagio} />}
        {tema === "aranha" && <Aracnino e={estagio} />}
        {tema === "venom" && <Simbi e={estagio} />}
      </Escala>
    </svg>
  );
}

// ----- Topography: coruja → coruja-bússola → grifo das constelações -----
function Relevoruja({ e }: { e: number }) {
  const g = useGrad();
  return (
    <g>
      <defs>
        {g.defs("c", "#4A32F0", "#2800C9", "#170680")}
        {g.defs("a", "#5B47FF", "#3219D8", "#1A0890")}
        {g.defs("b", "#2A1C8A", "#1A1060", "#0E0838")}
      </defs>
      {e >= 3 && (
        <>
          {/* anéis de curva de nível em órbita e asas de constelação */}
          <g className="bt-a-gira" style={o(60, 62)} fill="none" stroke="#C9C2FF" strokeWidth="1" opacity=".55">
            <ellipse cx="60" cy="62" rx="56" ry="50" strokeDasharray="4 5" />
            <ellipse cx="60" cy="62" rx="48" ry="42" />
          </g>
          {[false, true].map((dir) => (
            <g key={String(dir)} transform={dir ? "translate(120 0) scale(-1 1)" : undefined}>
              <g className={dir ? "bt-a-asa-d" : "bt-a-asa-e"} style={o(44, 60)}>
                <path d="M46 62 C30 52 12 42 2 22 C10 26 16 26 20 24 C12 18 10 10 12 3 C20 12 28 16 34 18 C30 10 30 4 34 -2 C42 14 48 32 50 50 Z" fill={g.url("a")} stroke="#8B7DFF" strokeWidth="1.2" strokeLinejoin="round" />
                <path d="M40 50 C30 44 20 36 14 26 M44 40 C38 32 32 26 28 18" fill="none" stroke="#8B7DFF" strokeWidth=".8" opacity=".7" />
                <path d="M12 22 L24 28 L34 12 M24 28 L38 36" fill="none" stroke="#E4DEFF" strokeWidth=".7" />
                <g fill="#fff" className="bt-a-pulsa" style={atraso(dir ? 0.8 : 0)}>
                  <circle cx="12" cy="22" r="1.5" /><circle cx="24" cy="28" r="1.2" /><circle cx="34" cy="12" r="1.5" /><circle cx="38" cy="36" r="1.1" />
                </g>
              </g>
            </g>
          ))}
          <path d="M48 104 L40 118 L56 108 L60 120 L64 108 L80 118 L72 104Z" fill={g.url("a")} className="bt-a-cauda" style={o(60, 104)} />
        </>
      )}
      <g className="bt-a-respira" style={o(60, 110)}>
        <g className="bt-a-orelha" style={o(40, 30)}>
          <path d={e >= 2 ? "M30 36 L36 6 L50 30 Z" : "M30 34 L40 14 L48 32 Z"} fill="#2800C9" />
        </g>
        <g className="bt-a-orelha" style={{ ...o(80, 30), ...atraso(0.3) }}>
          <path d={e >= 2 ? "M90 36 L84 6 L70 30 Z" : "M90 34 L80 14 L72 32 Z"} fill="#2800C9" />
        </g>
        <ellipse cx="60" cy="68" rx="36" ry="42" fill={g.url("c")} stroke="#12056A" strokeWidth="1.5" />
        <ellipse cx="60" cy="80" rx="24" ry="26" fill={g.url("b")} />
        <Brilho cx={44} cy={38} rx={12} ry={6} />
        <g fill="none" stroke="#C9C2FF" strokeWidth="1.4" opacity=".85">
          <path d="M44 84 C50 74 70 74 76 84 C70 94 50 94 44 84Z" />
          <path d="M50 84 C54 79 66 79 70 84 C66 89 54 89 50 84Z" />
          <path d="M40 98 C50 90 70 90 80 98" />
        </g>
        {e >= 2 && (
          <g>
            <circle cx="60" cy="84" r="9" fill="#0B0730" stroke="#FFC857" strokeWidth="1.6" />
            <g className="bt-a-agulha" style={o(60, 84)}>
              <path d="M60 77 L62 84 L60 91 L58 84Z" fill="#FFC857" />
              <path d="M60 77 L62 84 L58 84Z" fill="#E8474C" />
            </g>
          </g>
        )}
        <g className="bt-a-pisca" style={o(60, 52)}>
          <circle cx="46" cy="52" r="13" fill="#fff" />
          <circle cx="74" cy="52" r="13" fill="#fff" />
          <circle cx="48" cy="53" r="6.5" fill={e >= 3 ? "#FFC857" : "#6B5CFF"} className={e >= 3 ? "bt-a-brilho-olho" : undefined} />
          <circle cx="72" cy="53" r="6.5" fill={e >= 3 ? "#FFC857" : "#6B5CFF"} className={e >= 3 ? "bt-a-brilho-olho" : undefined} />
          <circle cx="50" cy="51" r="2.2" fill="#fff" />
          <circle cx="74" cy="51" r="2.2" fill="#fff" />
        </g>
        <path d="M56 62 L60 70 L64 62 Z" fill="#FFC857" />
        <g className="bt-a-asa-e" style={o(28, 72)}>
          <path d="M24 70 C16 82 20 96 30 100 C30 88 30 78 26 70Z" fill={g.url("a")} />
        </g>
        <g className="bt-a-asa-d" style={o(92, 72)}>
          <path d="M96 70 C104 82 100 96 90 100 C90 88 90 78 94 70Z" fill={g.url("a")} />
        </g>
        {e >= 3 && (
          <g className="bt-a-coroa" style={o(60, 24)}>
            <path d="M45 30 L47 15 L54 23 L60 10 L66 23 L73 15 L75 30Z" fill="#FFC857" stroke="#8A5A00" strokeWidth="1.2" strokeLinejoin="round" />
            <circle cx="60" cy="24" r="2.4" fill="#6B5CFF" className="bt-a-pulsa" />
          </g>
        )}
      </g>
    </g>
  );
}

// ----- Lugia: filhote → senhor das correntes → tempestade prateada -----
function Lugito({ e }: { e: number }) {
  const g = useGrad();
  const asaE =
    e === 1
      ? "M22 70 C6 56 8 40 18 36 C22 50 30 58 40 62Z"
      : e === 2
        ? "M28 66 C4 60 -2 36 8 24 C10 34 16 38 20 36 C16 28 18 20 24 14 C26 30 34 44 42 56Z"
        : "M28 64 C0 62 -8 30 0 12 C4 24 10 28 14 26 C8 16 10 8 16 0 C18 12 22 18 28 18 C24 10 28 4 34 0 C34 24 38 42 44 54Z";
  return (
    <g>
      <defs>
        {g.defs("c", "#FFFFFF", "#EEF3FF", "#C9D7F4")}
        {g.defs("a", "#F4F8FF", "#DCE6FA", "#AFC3EC")}
      </defs>
      {e >= 2 && (
        <g className="bt-a-gira-lento" style={o(60, 70)} fill="none" stroke="#9DB4E0" strokeWidth="1.3" strokeLinecap="round" opacity=".7">
          <path d="M14 90 C20 100 40 108 60 108" strokeDasharray="10 6" />
          <path d="M106 50 C100 36 86 26 70 24" strokeDasharray="8 7" />
          {e >= 3 && <path d="M8 40 C10 26 22 14 36 10" strokeDasharray="6 6" />}
        </g>
      )}
      {e >= 3 && <circle cx="60" cy="70" r="50" fill="none" stroke="#BFD4FF" strokeWidth="2" className="bt-a-aura" style={o(60, 70)} />}
      <g className="bt-a-asa-e" style={o(40, 60)}>
        <path d={asaE} fill={g.url("a")} stroke="#7F9BD0" strokeWidth="2" strokeLinejoin="round" />
      </g>
      <g className="bt-a-asa-d" style={o(80, 60)}>
        <path d={asaE} transform="translate(120 0) scale(-1 1)" fill={g.url("a")} stroke="#7F9BD0" strokeWidth="2" strokeLinejoin="round" />
      </g>
      <g className="bt-a-cauda" style={o(84, 90)}>
        <path
          d={e === 1 ? "M86 92 C100 96 108 104 112 96 C104 94 98 88 92 84Z" : "M84 94 C100 100 112 110 120 98 C112 98 108 92 104 90 C112 88 116 80 114 74 C106 84 98 86 90 84Z"}
          fill={g.url("a")}
          stroke="#7F9BD0"
          strokeWidth="2"
        />
      </g>
      <g className="bt-a-respira" style={o(60, 108)}>
        <ellipse cx="60" cy="72" rx="32" ry="36" fill={g.url("c")} stroke="#7F9BD0" strokeWidth="2" />
        <Brilho cx={46} cy={46} rx={11} ry={5} op={0.7} />
        <g className="bt-a-orelha" style={o(60, 36)}>
          <path d={e >= 3 ? "M40 40 L44 20 L52 36 Z M52 36 L58 12 L64 34 Z M62 34 L70 14 L74 38 Z M72 38 L82 24 L80 42 Z" : "M44 38 L50 26 L56 38 Z M56 36 L62 22 L68 36 Z M66 38 L74 28 L76 40 Z"} fill="#2B4C9B" />
        </g>
        <ellipse cx="60" cy="86" rx="18" ry="16" fill="#E4ECFF" />
        {e >= 3 && <path d="M60 78 L65 86 L60 94 L55 86Z" fill="#7FB2FF" stroke="#fff" strokeWidth="1" className="bt-a-pulsa" />}
        <path d="M34 52 C40 44 52 46 54 56 C46 60 38 58 34 52Z M86 52 C80 44 68 46 66 56 C74 60 82 58 86 52Z" fill="#2B4C9B" />
        <g className="bt-a-pisca" style={o(60, 53)}>
          <circle cx="46" cy="53" r="4.4" fill={e >= 3 ? "#DDF0FF" : "#fff"} className={e >= 3 ? "bt-a-brilho-olho" : undefined} />
          <circle cx="74" cy="53" r="4.4" fill={e >= 3 ? "#DDF0FF" : "#fff"} className={e >= 3 ? "bt-a-brilho-olho" : undefined} />
          <circle cx="47" cy="53" r="2.2" fill="#0B1F4F" />
          <circle cx="73" cy="53" r="2.2" fill="#0B1F4F" />
        </g>
        <path d="M54 66 C58 69 62 69 66 66" fill="none" stroke="#2B4C9B" strokeWidth="2" strokeLinecap="round" />
      </g>
    </g>
  );
}

// ----- Cyberpunk: raposa → raposa overclock → kitsune de nove processos -----
function Voltrix({ e }: { e: number }) {
  const g = useGrad();
  const caudas = e === 1 ? [0] : e === 2 ? [-14, 10] : [-36, -18, 0, 18, 36];
  return (
    <g>
      <defs>
        {g.defs("c", "#34314F", "#1E1C2B", "#0E0D18")}
        {g.defs("v", "#B8FFFF", "#00F0FF", "#0098B0")}
      </defs>
      {e >= 3 && (
        <g className="bt-a-gira" style={o(60, 62)}>
          <circle cx="60" cy="62" r="52" fill="none" stroke="#00F0FF" strokeWidth="1" strokeDasharray="2 6" opacity=".7" />
          {[0, 72, 144, 216, 288].map((a) => (
            <rect key={a} x="58" y="8" width="4" height="4" fill={a % 144 ? "#FF2A6D" : "#FCEE0A"} transform={`rotate(${a} 60 62)`} />
          ))}
        </g>
      )}
      {caudas.map((a, i) => (
        <g key={a} transform={`rotate(${a} 86 92)`}>
          <g className="bt-a-cauda" style={{ ...o(86, 92), ...atraso(i * 0.12) }}>
            <path d="M84 94 C104 92 114 72 104 56 C104 72 96 82 82 86Z" fill="#16151F" stroke="#FF2A6D" strokeWidth="2" />
            <path d="M104 56 L110 48 L106 64Z" fill="#FCEE0A" className="bt-a-faisca" style={atraso(i * 0.2)} />
          </g>
        </g>
      ))}
      <g className="bt-a-respira" style={o(60, 106)}>
        <g className="bt-a-orelha" style={o(44, 36)}>
          <path d="M32 40 L38 10 L54 32 Z" fill="#16151F" stroke="#FCEE0A" strokeWidth="2" strokeLinejoin="round" />
          {e >= 2 && <path d="M38 10 L36 2 M38 10 L44 4" stroke="#00F0FF" strokeWidth="1.5" className="bt-a-faisca" />}
        </g>
        <g className="bt-a-orelha" style={{ ...o(76, 36), ...atraso(0.4) }}>
          <path d="M88 40 L82 10 L66 32 Z" fill="#16151F" stroke="#FCEE0A" strokeWidth="2" strokeLinejoin="round" />
          {e >= 2 && <path d="M82 10 L84 2 M82 10 L76 4" stroke="#00F0FF" strokeWidth="1.5" className="bt-a-faisca" style={atraso(0.3)} />}
        </g>
        <path d="M26 58 C26 34 94 34 94 58 L88 100 C80 108 40 108 32 100 Z" fill={g.url("c")} stroke="#FCEE0A" strokeWidth="2" strokeLinejoin="round" />
        <rect x="32" y="48" width="56" height="12" rx="3" fill={g.url("v")} style={{ filter: "drop-shadow(0 0 3px #00F0FF)" }} />
        <Brilho cx={42} cy={42} rx={10} ry={3} rot={-8} op={0.18} />
        <g className="bt-a-pisca" style={o(60, 54)}>
          <rect x="36" y="51" width="14" height="6" rx="1" fill="#E6FFFF" />
          <rect x="70" y="51" width="14" height="6" rx="1" fill="#E6FFFF" />
        </g>
        <rect x="32" y="48" width="4" height="12" fill="#fff" opacity=".7" className="bt-a-scan" />
        <path d="M46 74 H74 M50 80 H70" stroke="#FCEE0A" strokeWidth="2" strokeLinecap="round" />
        <path d="M40 90 L48 90 L52 84 L60 96 L64 88 L80 88" fill="none" stroke="#FF2A6D" strokeWidth="2" strokeLinejoin="round" className="bt-a-ecg" />
        {e >= 2 && <circle cx="60" cy="68" r="3.5" fill="#FF2A6D" className="bt-a-pulsa" />}
      </g>
    </g>
  );
}

// ----- Aranha: herói da vizinhança → teia-andante → lenda escarlate -----
function Aracnino({ e }: { e: number }) {
  const g = useGrad();
  const pernas = e === 1 ? [[26, 80, 10, 70], [26, 90, 8, 92]] : [[28, 76, 8, 60], [26, 84, 4, 78], [26, 92, 4, 96], [30, 98, 10, 110]];
  return (
    <g>
      <defs>
        {g.defs("c", "#FF4A58", "#D4192C", "#8E0B1B")}
        {g.defs("t", "#3F77DB", "#1446A0", "#0A2A66")}
      </defs>
      {e >= 2 && (
        <g className="bt-a-fio" style={o(60, 0)}>
          <path d="M60 0 V22" stroke="#141018" strokeWidth="1" opacity=".6" />
        </g>
      )}
      {e >= 3 && (
        <g className="bt-a-pulsa-lento">
          <g fill="none" stroke="#141018" strokeWidth="1.2">
            <path d="M40 60 L0 20 M40 64 L-4 56 M42 70 L2 92 M80 60 L120 20 M80 64 L124 56 M78 70 L118 92" />
            <path d="M14 34 C8 48 6 60 8 74 M26 44 C20 54 18 62 20 74 M106 34 C112 48 114 60 112 74 M94 44 C100 54 102 62 100 74" />
          </g>
          <g fill="none" stroke="#D4192C" strokeWidth="2" opacity=".5">
            <path d="M40 60 L0 20 M80 60 L120 20" />
          </g>
        </g>
      )}
      {pernas.map(([x1, y1, x2, y2], i) => (
        <g key={i}>
          <g className="bt-a-perna" style={{ ...o(x1, y1), ...atraso(i * 0.15) }}>
            <path d={`M${x1} ${y1} Q${(x1 + x2) / 2} ${Math.min(y1, y2) - 8} ${x2} ${y2}`} stroke="#141018" strokeWidth="3" strokeLinecap="round" fill="none" />
          </g>
          <g className="bt-a-perna" style={{ ...o(120 - x1, y1), ...atraso(i * 0.15 + 0.3) }}>
            <path d={`M${120 - x1} ${y1} Q${120 - (x1 + x2) / 2} ${Math.min(y1, y2) - 8} ${120 - x2} ${y2}`} stroke="#141018" strokeWidth="3" strokeLinecap="round" fill="none" />
          </g>
        </g>
      ))}
      <g className="bt-a-respira" style={o(60, 110)}>
        <ellipse cx="60" cy="90" rx="30" ry="20" fill={g.url("t")} stroke="#141018" strokeWidth="2.5" />
        <circle cx="60" cy="56" r="36" fill={g.url("c")} stroke="#141018" strokeWidth="2.5" />
        <g fill="none" stroke="#141018" strokeWidth="1" opacity=".7">
          <path d="M60 20 V92 M24 56 H96 M34 30 L86 82 M86 30 L34 82" />
          <circle cx="60" cy="56" r="12" />
          <circle cx="60" cy="56" r="24" />
        </g>
        <Brilho cx={44} cy={32} rx={11} ry={5} op={0.35} />
        <g className="bt-a-pisca" style={o(60, 52)}>
          <path
            d={e >= 3 ? "M26 50 C30 32 54 36 56 56 C46 64 30 62 26 50Z M94 50 C90 32 66 36 64 56 C74 64 90 62 94 50Z" : "M30 52 C34 38 52 38 54 54 C48 62 34 62 30 52Z M90 52 C86 38 68 38 66 54 C72 62 86 62 90 52Z"}
            fill="#fff"
            stroke="#141018"
            strokeWidth="3"
          />
        </g>
        <g className={e >= 3 ? "bt-a-pulsa" : undefined}>
          <path d="M56 90 L60 84 L64 90 L60 96Z M52 86 L68 94 M68 86 L52 94" stroke="#141018" strokeWidth="1.6" fill="#141018" />
        </g>
      </g>
    </g>
  );
}

// ----- Venom: filhote → gosma faminta → predador -----
function Simbi({ e }: { e: number }) {
  const g = useGrad();
  const tentaculos =
    e === 1
      ? []
      : e === 2
        ? [[24, 70, "M24 70 C8 64 4 48 10 40 C12 52 18 58 26 60"], [96, 70, "M96 70 C112 64 116 48 110 40 C108 52 102 58 94 60"]]
        : [
            [24, 70, "M24 70 C4 64 -2 44 6 32 C8 48 16 56 26 60"],
            [24, 84, "M24 84 C6 88 -2 104 6 112 C8 100 16 94 26 92"],
            [96, 70, "M96 70 C116 64 122 44 114 32 C112 48 104 56 94 60"],
            [96, 84, "M96 84 C114 88 122 104 114 112 C112 100 104 94 94 92"],
            [60, 30, "M56 32 C50 14 60 2 70 4 C62 10 62 20 64 30"],
          ];
  return (
    <g>
      <defs>
        {g.defs("c", "#2A2F4A", "#0E1019", "#040406")}
      </defs>
      {tentaculos.map(([x, y, d], i) => (
        <g key={i} className="bt-a-tentaculo" style={{ ...o(x as number, y as number), ...atraso(i * 0.25) }}>
          <path d={d as string} fill="#0B0C12" stroke="#3A4270" strokeWidth="1.2" />
        </g>
      ))}
      <g className="bt-a-respira" style={o(60, 110)}>
        <path
          d={
            e >= 3
              ? "M18 104 C8 64 20 22 60 20 C100 22 112 64 102 104 C96 112 90 98 84 106 C78 114 72 100 66 108 C60 114 54 100 48 108 C42 114 36 100 30 106 C24 112 20 110 18 104Z"
              : "M22 100 C14 70 24 30 60 28 C96 30 106 70 98 100 C92 108 88 96 84 104 C78 112 74 100 68 106 C62 112 56 102 50 108 C42 112 40 100 34 106 C28 110 24 106 22 100Z"
          }
          fill={g.url("c")}
          stroke="#3A4270"
          strokeWidth="1.5"
        />
        <path d="M40 36 C48 30 58 30 64 34" stroke="#5D6AA8" strokeWidth="3" strokeLinecap="round" fill="none" className="bt-a-reflexo" />
        {e >= 3 && <path d="M36 26 L40 12 L46 24 M74 24 L80 12 L84 26" fill="#0B0C12" stroke="#3A4270" strokeWidth="1.2" />}
        <g className="bt-a-pisca" style={o(60, 52)}>
          <path d={e >= 2 ? "M26 56 C28 36 50 38 56 60 C46 62 34 64 26 56Z M94 56 C92 36 70 38 64 60 C74 62 86 64 94 56Z" : "M30 56 C34 40 50 42 54 58 C46 60 36 62 30 56Z M90 56 C86 40 70 42 66 58 C74 60 84 62 90 56Z"} fill="#fff" />
        </g>
        <path d={e >= 2 ? "M32 72 C46 92 74 92 88 72 C76 82 44 82 32 72Z" : "M38 74 C50 88 70 88 82 74 C72 80 48 80 38 74Z"} fill="#fff" />
        <path
          d={e >= 2 ? "M36 75 L40 84 L44 78 L48 87 L52 80 L56 88 L60 80 L64 88 L68 80 L72 87 L76 78 L80 84 L84 75" : "M42 76 L45 82 L48 78 L51 84 L54 79 L57 85 L60 79 L63 85 L66 79 L69 84 L72 78 L75 82 L78 76"}
          fill="none"
          stroke="#0B0C12"
          strokeWidth="1.4"
        />
        <g className="bt-a-lingua" style={o(60, 84)}>
          <path d={e >= 3 ? "M58 84 C58 100 70 104 64 116 C72 110 70 98 64 92" : "M58 84 C60 94 66 98 64 104"} stroke="#C3163B" strokeWidth={e >= 3 ? 5 : 4} strokeLinecap="round" fill="none" />
        </g>
        <g className="bt-a-pinga">
          <path d="M34 106 C34 112 38 112 38 106Z" fill="#0B0C12" />
        </g>
      </g>
    </g>
  );
}

// ---------- inimigos (questões selvagens) ----------

export interface TipoQuestao {
  nome: string;
  cor: string;
  glifo: string;
}

const TIPOS: [RegExp, TipoQuestao][] = [
  [/portug|redac|gramat|interpreta/, { nome: "Letra", cor: "#E07A5F", glifo: "Aa" }],
  [/ingl|english|idioma|espanh/, { nome: "Idioma", cor: "#3D7BD9", glifo: "En" }],
  // Lei antes de Dados: "Legislação (SI e Proteção de Dados)" é Lei.
  [/legisla|direito|\blei\b|etica|constitu|administra|regiment|estatuto/, { nome: "Lei", cor: "#C9A227", glifo: "§" }],
  [/logic|raciocin|matemat|estatist|quantitat/, { nome: "Lógica", cor: "#9B5DE5", glifo: "∴" }],
  [/banco|dados|sql|data/, { nome: "Dados", cor: "#1F9E89", glifo: "DB" }],
  [/inform|program|rede|sistema|engenharia|seguran|desenvolv|software|comput|\bti\b|nuvem|devops/, { nome: "Código", cor: "#12B886", glifo: "</>" }],
];
const GERAL: TipoQuestao = { nome: "Geral", cor: "#8D99AE", glifo: "?" };

export function tipoDaMateria(materia: string): TipoQuestao {
  const m = materia.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  return TIPOS.find(([re]) => re.test(m))?.[1] ?? GERAL;
}

// Acessório por tipo: o que a questão carrega ou faz orbitar.
function Acessorio({ tipo }: { tipo: TipoQuestao }) {
  switch (tipo.nome) {
    case "Letra":
      return (
        <g className="bt-a-cauda" style={o(100, 70)}>
          <path d="M98 70 L116 30 C118 26 122 28 120 32 L102 72Z" fill="#fff" stroke="#141018" strokeWidth="1.5" />
          <path d="M98 70 L96 78 L102 72Z" fill="#141018" />
        </g>
      );
    case "Idioma":
      return (
        <g className="bt-a-flutua" style={atraso(0.5)}>
          <path d="M92 6 H116 C119 6 120 8 120 10 V22 C120 25 118 26 116 26 H104 L98 32 L99 26 H92 C89 26 88 24 88 22 V10 C88 8 89 6 92 6Z" fill="#fff" stroke="#141018" strokeWidth="1.5" />
          <text x="104" y="20" textAnchor="middle" fontSize="9" fontWeight="800" fill="#141018">Hi!</text>
        </g>
      );
    case "Lei":
      return (
        <g className="bt-a-martelo" style={o(104, 72)}>
          <rect x="102" y="44" width="4" height="30" rx="1" fill="#6B4423" />
          <rect x="94" y="36" width="20" height="10" rx="2" fill="#8B5A2B" stroke="#141018" strokeWidth="1.5" />
        </g>
      );
    case "Dados":
      return (
        <g className="bt-a-flutua" style={atraso(0.3)}>
          <ellipse cx="108" cy="16" rx="9" ry="3.5" fill="#fff" stroke="#141018" strokeWidth="1.2" />
          <path d="M99 16 V30 C99 34 117 34 117 30 V16" fill="#fff" stroke="#141018" strokeWidth="1.2" />
          <path d="M99 23 C99 27 117 27 117 23" fill="none" stroke="#141018" strokeWidth="1" />
        </g>
      );
    default:
      // Lógica, Código e Geral: símbolos em órbita
      return (
        <g className="bt-a-gira" style={o(60, 64)}>
          {[0, 120, 240].map((a) => (
            <text key={a} x="60" y="10" textAnchor="middle" fontSize="11" fontWeight="800" fill={tipo.cor} stroke="#141018" strokeWidth=".4" transform={`rotate(${a} 60 64)`}>
              {tipo.nome === "Lógica" ? ["∧", "∨", "¬"][a / 120] : tipo.nome === "Código" ? ["{ }", "01", ";"][a / 120] : "?"}
            </text>
          ))}
        </g>
      );
  }
}

export function SpriteInimigo({ tipo, chefe, nivel = 0 }: { tipo: TipoQuestao; chefe: boolean; nivel?: number | null }) {
  const n = nivel ?? 0;
  const g = useGrad();
  const escuro = "rgba(0,0,0,.35)";
  return (
    <svg viewBox="0 0 120 120" className="bt-svg h-full w-full" aria-hidden>
      <defs>{g.defs("v", "rgba(255,255,255,.38)", "rgba(255,255,255,0)", "rgba(0,0,0,.28)")}</defs>
      <ellipse cx="60" cy="112" rx="30" ry="5" fill="rgba(0,0,0,.22)" className="bt-a-sombra" style={o(60, 112)} />
      {(chefe || n >= 4) && (
        <circle cx="60" cy="62" r="54" fill={chefe ? "#E8474C" : tipo.cor} opacity=".22" className="bt-a-aura" style={o(60, 62)} />
      )}
      <g className="bt-a-flutua">
        {chefe && (
          <g className="bt-a-capa" style={o(60, 30)}>
            <path d="M26 30 C10 60 12 96 20 110 L60 100 L100 110 C108 96 110 60 94 30Z" fill="#5B0E1F" stroke="#141018" strokeWidth="1.5" />
          </g>
        )}
        <g className="bt-a-asa-e" style={o(24, 60)}>
          <path d="M22 66 C12 62 10 52 14 48" stroke={tipo.cor} strokeWidth="6" strokeLinecap="round" fill="none" />
          <circle cx="14" cy="47" r="4" fill={tipo.cor} stroke="#141018" strokeWidth="1" />
        </g>
        <g className="bt-a-asa-d" style={o(96, 60)}>
          <path d="M98 66 C108 62 110 52 106 48" stroke={tipo.cor} strokeWidth="6" strokeLinecap="round" fill="none" />
          <circle cx="106" cy="47" r="4" fill={tipo.cor} stroke="#141018" strokeWidth="1" />
        </g>
        <g className="bt-a-respira" style={o(60, 106)}>
          <path d="M26 22 H82 L96 36 V96 C96 102 92 106 86 106 H34 C28 106 24 102 24 96 V26 C24 24 25 22 26 22Z" fill={tipo.cor} stroke="#141018" strokeWidth="1.5" />
          <path d="M26 22 H82 L96 36 V96 C96 102 92 106 86 106 H34 C28 106 24 102 24 96 V26 C24 24 25 22 26 22Z" fill={g.url("v")} />
          <path d="M82 22 V36 H96Z" fill={escuro} />
          <g className="bt-a-linhas">
            <rect x="32" y="30" width="44" height="3" rx="1.5" fill="rgba(255,255,255,.45)" />
            <rect x="32" y="37" width="30" height="3" rx="1.5" fill="rgba(255,255,255,.35)" />
          </g>
          {n >= 3 && (
            <path d="M28 44 L34 40 M86 82 L92 76 L88 86" stroke="rgba(0,0,0,.45)" strokeWidth="2" strokeLinecap="round" />
          )}
          <path d={n >= 2 || chefe ? "M34 48 L53 57 M86 48 L67 57" : "M36 50 L52 56 M84 50 L68 56"} stroke="#141018" strokeWidth="3.5" strokeLinecap="round" />
          <g className="bt-a-pisca" style={o(60, 62)}>
            <circle cx="45" cy="62" r="6" fill={chefe ? "#FFE0E0" : "#fff"} />
            <circle cx="75" cy="62" r="6" fill={chefe ? "#FFE0E0" : "#fff"} />
            <circle cx="46" cy="63" r="3" fill={chefe ? "#B3101F" : "#141018"} />
            <circle cx="74" cy="63" r="3" fill={chefe ? "#B3101F" : "#141018"} />
          </g>
          <path d={n >= 2 || chefe ? "M48 76 L52 72 L56 76 L60 72 L64 76 L68 72 L72 76" : "M50 76 C56 72 64 72 70 76"} stroke="#141018" strokeWidth="2" fill="none" strokeLinejoin="round" />
          <text x="60" y="96" textAnchor="middle" fontSize="16" fontWeight="800" fill="#fff" fontFamily="ui-monospace, monospace">
            {tipo.glifo}
          </text>
          {n >= 4 && <path d="M30 22 L34 12 L40 22 M80 22 L86 12 L90 22" fill={tipo.cor} stroke="#141018" strokeWidth="1.2" />}
        </g>
        <Acessorio tipo={tipo} />
        {chefe && (
          <g className="bt-a-coroa" style={o(60, 14)}>
            <path d="M34 22 L40 6 L50 18 L60 2 L70 18 L80 6 L86 22Z" fill="#FFC857" stroke="#141018" strokeWidth="2" strokeLinejoin="round" />
            <circle cx="60" cy="14" r="2.5" fill="#E8474C" />
            <path d="M44 12 L46 10" stroke="#fff" strokeWidth="1.5" className="bt-a-faisca" />
          </g>
        )}
      </g>
    </svg>
  );
}

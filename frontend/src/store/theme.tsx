// Tema do app: três temas alternáveis a qualquer momento.
// - 'fantasy'   (escuro): na tela se chama "Topography", pelo fundo de curvas de nível —
//               a chave interna continua 'fantasy' para não mexer nos seletores do CSS;
// - 'rose'      (claro): na tela se chama "Lugia" — branco-pérola, azul das asas e o
//               fundo Iridescence; a chave interna continua 'rose' (CSS e localStorage);
// - 'cyberpunk' (escuro): Night City — amarelo, ciano e magenta sobre preto, fundo de
//               pixels (Pixel Blast).
// - 'aranha'    (claro): Homem-Aranha em página de gibi — papel jornal, retícula vermelha
//               e azul, tinta preta, e uma teia desenhada por shader (fundos/TeiaReticula).
// - 'venom'     (escuro): o simbionte — preto líquido com brilho azulado, branco dos olhos
//               como acento e o carmim da língua como ponto quente (fundos/Simbionte).
// Todo tema entra por uma animação de tela cheia (components/transicoes/Transicao<Tema>).
// Aplica data-theme na raiz (<html>) e persiste a escolha em localStorage. Os temas
// escuros também ligam a classe .dark para manter utilitários dark: coerentes.
import { createContext, lazy, Suspense, useContext, useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import { importarChunk } from "../lib/importarChunk";

export type Tema = "fantasy" | "rose" | "cyberpunk" | "aranha" | "venom";

export const TEMAS: { id: Tema; nome: string; escuro: boolean }[] = [
  { id: "fantasy", nome: "Topography", escuro: true },
  { id: "rose", nome: "Lugia", escuro: false },
  { id: "cyberpunk", nome: "Cyberpunk", escuro: true },
  { id: "aranha", nome: "Aranha", escuro: false },
  { id: "venom", nome: "Venom", escuro: true },
];

export const nomeDoTema = (t: Tema) => TEMAS.find((x) => x.id === t)!.nome;
export const proximoTema = (t: Tema): Tema => TEMAS[(TEMAS.findIndex((x) => x.id === t) + 1) % TEMAS.length].id;

interface ThemeContextValue {
  tema: Tema;
  alternar: (origem?: Origem) => void;
  /** `origem` = ponto da tela (px) de onde a animação de entrada do tema nasce. */
  definir: (t: Tema, origem?: Origem) => void;
}

export interface Origem {
  x: number;
  y: number;
}

// Todo tema tem entrada animada. O pedaço de cada animação só desce quando alguém chega
// perto do botão (preCarregarTransicao) ou, no pior caso, no próprio clique.
type Transicao = ComponentType<{ origem: Origem; aoCobrir: () => void; aoTerminar: () => void }>;
const CARREGAR: Record<Tema, () => Promise<{ default: Transicao }>> = {
  fantasy: () => importarChunk(() => import("../components/transicoes/TransicaoTopography")),
  rose: () => importarChunk(() => import("../components/transicoes/TransicaoLugia")),
  cyberpunk: () => importarChunk(() => import("../components/transicoes/TransicaoCyberpunk")),
  aranha: () => importarChunk(() => import("../components/transicoes/TransicaoAranha")),
  venom: () => importarChunk(() => import("../components/transicoes/TransicaoVenom")),
};
const TRANSICOES = Object.fromEntries(
  (Object.keys(CARREGAR) as Tema[]).map((t) => [t, lazy(CARREGAR[t])])
) as Record<Tema, ReturnType<typeof lazy<Transicao>>>;

export function preCarregarTransicao(t: Tema) {
  void CARREGAR[t]();
}

// Se a animação travar (chunk que não chega, aba em segundo plano), o tema entra assim
// mesmo depois disso: animação nenhuma vale prender o usuário no tema antigo.
const TEMPO_MAXIMO_TRANSICAO = 7000;

function querMenosMovimento() {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

// Chave nova: em "q_theme" o valor "cyberpunk" queria dizer o tema rosa. Ler a chave
// antiga com o significado novo jogaria quem estava no rosa direto no Cyberpunk escuro.
const STORAGE_KEY = "q_tema";
const STORAGE_KEY_ANTIGA = "q_theme";

function ehTema(v: string | null): v is Tema {
  return v === "fantasy" || v === "rose" || v === "cyberpunk" || v === "aranha" || v === "venom";
}

function lerSalvo(): Tema {
  try {
    const salvo = localStorage.getItem(STORAGE_KEY);
    if (ehTema(salvo)) return salvo;
    // Escolha feita antes dos três temas. Cadeia de nomes antigos do tema claro:
    // "light" → "neon" → "cyberpunk" → agora "rose". Qualquer outra coisa era o escuro.
    const antigo = localStorage.getItem(STORAGE_KEY_ANTIGA);
    if (antigo === "cyberpunk" || antigo === "neon" || antigo === "light") return "rose";
  } catch {
    /* sem localStorage: tema padrão */
  }
  return "fantasy";
}

function aplicar(tema: Tema) {
  const root = document.documentElement;
  root.setAttribute("data-theme", tema);
  root.classList.toggle("dark", TEMAS.find((x) => x.id === tema)!.escuro);
  trocarFavicon();
  try {
    localStorage.setItem(STORAGE_KEY, tema);
    localStorage.removeItem(STORAGE_KEY_ANTIGA);
  } catch {
    /* ignora */
  }
}

// Favicon = o selo >_ do LogoSimbolo, pintado com o acento do tema ativo. As cores saem
// dos tokens do CSS (já com o data-theme novo aplicado), então não há tabela duplicada.
// O public/favicon.svg estático tem as cores do Topography, para antes do JS carregar.
function trocarFavicon() {
  const css = getComputedStyle(document.documentElement);
  const cor = (v: string) => css.getPropertyValue(v).trim();
  const hi = cor("--accentHi");
  const base = cor("--accent");
  const traco = cor("--onAccent");
  if (!hi || !base || !traco) return;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0%" stop-color="${hi}"/><stop offset="100%" stop-color="${base}"/></linearGradient></defs>` +
    `<rect x="0.5" y="0.5" width="31" height="31" rx="9" fill="url(#g)"/>` +
    `<rect x="0.5" y="0.5" width="31" height="31" rx="9" fill="none" stroke="${hi}" stroke-opacity="0.55"/>` +
    `<path d="M10 10.5 L16.5 16 L10 21.5" fill="none" stroke="${traco}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="M19 21.5 H23" fill="none" stroke="${traco}" stroke-width="2.6" stroke-linecap="round"/>` +
    `</svg>`;
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.type = "image/svg+xml";
  link.href = `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [tema, setTema] = useState<Tema>(lerSalvo);
  const [transicao, setTransicao] = useState<{ para: Tema; origem: Origem } | null>(null);
  // Refs para o definir enxergar o estado atual mesmo chamado de um closure antigo.
  const temaRef = useRef(tema);
  temaRef.current = tema;
  const emTransicao = useRef(false);

  useEffect(() => {
    aplicar(tema);
  }, [tema]);

  // Rede de segurança da animação (ver TEMPO_MAXIMO_TRANSICAO).
  useEffect(() => {
    if (!transicao) return;
    const t = setTimeout(() => {
      setTema(transicao.para);
      terminar();
    }, TEMPO_MAXIMO_TRANSICAO);
    return () => clearTimeout(t);
  }, [transicao]);

  function terminar() {
    emTransicao.current = false;
    setTransicao(null);
  }

  function definir(t: Tema, origem?: Origem) {
    if (t === temaRef.current || emTransicao.current) return;
    if (querMenosMovimento()) {
      setTema(t);
      return;
    }
    emTransicao.current = true;
    setTransicao({ para: t, origem: origem ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 } });
  }

  const props = transicao && {
    origem: transicao.origem,
    // O tema troca por baixo no instante em que a animação cobre a tela inteira.
    aoCobrir: () => setTema(transicao.para),
    aoTerminar: terminar,
  };

  return (
    <ThemeContext.Provider
      value={{
        tema,
        alternar: (origem) => definir(proximoTema(temaRef.current), origem),
        definir,
      }}
    >
      {children}
      {props && (
        <Suspense fallback={null}>
          {(() => {
            const Entrada = TRANSICOES[transicao.para];
            return <Entrada {...props} />;
          })()}
        </Suspense>
      )}
    </ThemeContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme precisa estar dentro de <ThemeProvider>");
  return ctx;
}

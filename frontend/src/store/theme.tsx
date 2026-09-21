// Tema do app: três temas alternáveis a qualquer momento.
// - 'fantasy'   (escuro): na tela se chama "Topography", pelo fundo de curvas de nível —
//               a chave interna continua 'fantasy' para não mexer nos seletores do CSS;
// - 'rose'      (claro): na tela se chama "Lugia" — branco-pérola, azul das asas e o
//               fundo Iridescence; a chave interna continua 'rose' (CSS e localStorage);
// - 'cyberpunk' (escuro): Night City — amarelo, ciano e magenta sobre preto, fundo de
//               pixels (Pixel Blast).
// Aplica data-theme na raiz (<html>) e persiste a escolha em localStorage. Os temas
// escuros também ligam a classe .dark para manter utilitários dark: coerentes.
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Tema = "fantasy" | "rose" | "cyberpunk";

export const TEMAS: { id: Tema; nome: string; escuro: boolean }[] = [
  { id: "fantasy", nome: "Topography", escuro: true },
  { id: "rose", nome: "Lugia", escuro: false },
  { id: "cyberpunk", nome: "Cyberpunk", escuro: true },
];

export const nomeDoTema = (t: Tema) => TEMAS.find((x) => x.id === t)!.nome;
export const proximoTema = (t: Tema): Tema => TEMAS[(TEMAS.findIndex((x) => x.id === t) + 1) % TEMAS.length].id;

interface ThemeContextValue {
  tema: Tema;
  alternar: () => void;
  definir: (t: Tema) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

// Chave nova: em "q_theme" o valor "cyberpunk" queria dizer o tema rosa. Ler a chave
// antiga com o significado novo jogaria quem estava no rosa direto no Cyberpunk escuro.
const STORAGE_KEY = "q_tema";
const STORAGE_KEY_ANTIGA = "q_theme";

function ehTema(v: string | null): v is Tema {
  return v === "fantasy" || v === "rose" || v === "cyberpunk";
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

  useEffect(() => {
    aplicar(tema);
  }, [tema]);

  return (
    <ThemeContext.Provider
      value={{
        tema,
        alternar: () => setTema(proximoTema),
        definir: setTema,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme precisa estar dentro de <ThemeProvider>");
  return ctx;
}

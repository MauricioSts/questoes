// Tema do app: três temas alternáveis a qualquer momento.
// - 'fantasy'   (escuro): na tela se chama "Topography", pelo fundo de curvas de nível —
//               a chave interna continua 'fantasy' para não mexer nos seletores do CSS;
// - 'rose'      (claro): o antigo "Cyberpunk" rosa/magenta com o Molten Metal;
// - 'cyberpunk' (escuro): Night City — amarelo, ciano e magenta sobre preto, fundo de
//               pixels (Pixel Blast).
// Aplica data-theme na raiz (<html>) e persiste a escolha em localStorage. Os temas
// escuros também ligam a classe .dark para manter utilitários dark: coerentes.
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Tema = "fantasy" | "rose" | "cyberpunk";

export const TEMAS: { id: Tema; nome: string; escuro: boolean }[] = [
  { id: "fantasy", nome: "Topography", escuro: true },
  { id: "rose", nome: "Rose", escuro: false },
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
  try {
    localStorage.setItem(STORAGE_KEY, tema);
    localStorage.removeItem(STORAGE_KEY_ANTIGA);
  } catch {
    /* ignora */
  }
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

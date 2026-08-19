// Tema do app: dois temas alternáveis a qualquer momento, 'grimorio' (escuro,
// mística) e 'neon' (claro, cyberpunk). Aplica data-theme na raiz (<html>) e
// persiste a escolha em localStorage. Grimório também liga a classe .dark para
// manter utilitários dark: coerentes.
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Tema = "grimorio" | "neon";

interface ThemeContextValue {
  tema: Tema;
  alternar: () => void;
  definir: (t: Tema) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = "q_theme";

function aplicar(tema: Tema) {
  const root = document.documentElement;
  root.setAttribute("data-theme", tema);
  root.classList.toggle("dark", tema === "grimorio");
  localStorage.setItem(STORAGE_KEY, tema);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [tema, setTema] = useState<Tema>(() => {
    const salvo = localStorage.getItem(STORAGE_KEY) as Tema | null;
    // migra o valor antigo ("light"/"dark") para os novos temas
    if (salvo === "grimorio" || salvo === "neon") return salvo;
    if (salvo === "light") return "neon";
    return "grimorio";
  });

  useEffect(() => {
    aplicar(tema);
  }, [tema]);

  return (
    <ThemeContext.Provider
      value={{
        tema,
        alternar: () => setTema((t) => (t === "grimorio" ? "neon" : "grimorio")),
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

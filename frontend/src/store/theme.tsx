// Tema do app: dois temas alternáveis a qualquer momento, 'fantasy' (escuro,
// mística) e 'cyberpunk' (claro). Aplica data-theme na raiz (<html>) e persiste a
// escolha em localStorage. Fantasy também liga a classe .dark para manter
// utilitários dark: coerentes.
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Tema = "fantasy" | "cyberpunk";

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
  root.classList.toggle("dark", tema === "fantasy");
  localStorage.setItem(STORAGE_KEY, tema);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [tema, setTema] = useState<Tema>(() => {
    const salvo = localStorage.getItem(STORAGE_KEY);
    if (salvo === "fantasy" || salvo === "cyberpunk") return salvo;
    // Nomes anteriores, para quem já tinha um tema escolhido: "light"/"dark" viraram
    // "neon"/"grimorio", que agora viraram "cyberpunk"/"fantasy".
    if (salvo === "neon" || salvo === "light") return "cyberpunk";
    return "fantasy";
  });

  useEffect(() => {
    aplicar(tema);
  }, [tema]);

  return (
    <ThemeContext.Provider
      value={{
        tema,
        alternar: () => setTema((t) => (t === "fantasy" ? "cyberpunk" : "fantasy")),
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

// Tema claro/escuro persistido. Aplica a classe `dark` no <html> (Tailwind darkMode: class).
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Tema = "light" | "dark";
interface ThemeContextValue {
  tema: Tema;
  alternar: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [tema, setTema] = useState<Tema>(() => {
    const salvo = localStorage.getItem("q_tema") as Tema | null;
    if (salvo) return salvo;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", tema === "dark");
    localStorage.setItem("q_tema", tema);
  }, [tema]);

  return (
    <ThemeContext.Provider value={{ tema, alternar: () => setTema((t) => (t === "dark" ? "light" : "dark")) }}>
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

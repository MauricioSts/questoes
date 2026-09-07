// Equivalente mobile de store/theme.tsx. No web o tema é um atributo data-theme
// na raiz <html>; aqui é o style vars() aplicado à View raiz (SDD §6.6).
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { View } from "react-native";
import { kv } from "@/lib/kv";
import { HEX, RAIO, VARS, type NomeTema } from "./tokens";

const CHAVE = "q_tema";

type Contexto = {
  tema: NomeTema;
  setTema: (t: NomeTema) => void;
  alternar: () => void;
  hex: (typeof HEX)[NomeTema];
  raio: (typeof RAIO)[NomeTema];
};

const Ctx = createContext<Contexto | null>(null);

function lerTemaSalvo(): NomeTema {
  return kv.get(CHAVE) === "cyberpunk" ? "cyberpunk" : "fantasy";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [tema, setTemaEstado] = useState<NomeTema>(lerTemaSalvo);

  const valor = useMemo<Contexto>(() => {
    const setTema = (t: NomeTema) => {
      setTemaEstado(t);
      kv.set(CHAVE, t);
    };
    return {
      tema,
      setTema,
      alternar: () => setTema(tema === "fantasy" ? "cyberpunk" : "fantasy"),
      hex: HEX[tema],
      raio: RAIO[tema],
    };
  }, [tema]);

  return (
    <Ctx.Provider value={valor}>
      {/* As vars precisam estar acima de tudo que usa classe de cor. */}
      <View style={VARS[tema]} className="flex-1 bg-bg">
        {children}
      </View>
    </Ctx.Provider>
  );
}

export function useTema(): Contexto {
  const c = useContext(Ctx);
  if (!c) throw new Error("useTema fora do ThemeProvider");
  return c;
}

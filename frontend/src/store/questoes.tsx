// Carrega as questões do IndexedDB no boot e popula o repositório em memória.
// Enquanto carrega, mostra um loader; expõe o total e um recarregar() após importações.
import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { carregarTudo } from "../lib/questoesStore";
import { setDados, totalQuestoes } from "../lib/questoesRepo";

interface QuestoesContextValue {
  pronto: boolean;
  total: number;
  recarregar: () => Promise<void>;
}

const QuestoesContext = createContext<QuestoesContextValue | null>(null);

export function QuestoesProvider({ children }: { children: ReactNode }) {
  const [pronto, setPronto] = useState(false);
  const [total, setTotal] = useState(0);

  const recarregar = useCallback(async () => {
    const { questoes, textosBase } = await carregarTudo();
    setDados(questoes, textosBase);
    setTotal(totalQuestoes());
  }, []);

  useEffect(() => {
    recarregar().finally(() => setPronto(true));
  }, [recarregar]);

  if (!pronto) {
    return <div className="grid h-full place-items-center text-slate-400">Carregando questões…</div>;
  }

  return (
    <QuestoesContext.Provider value={{ pronto, total, recarregar }}>{children}</QuestoesContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useQuestoes() {
  const ctx = useContext(QuestoesContext);
  if (!ctx) throw new Error("useQuestoes precisa estar dentro de <QuestoesProvider>");
  return ctx;
}

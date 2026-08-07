// Estado multi-concurso: carrega os concursos do usuário, controla o concurso ativo
// (persistido em localStorage via lib/concurso) e reexpõe para o app. Ao trocar de
// concurso, o cliente HTTP passa a escopar as chamadas automaticamente.
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "../lib/api";
import { getConcursoId, setConcursoId } from "../lib/concurso";

export type EstadoConcurso = "EM_CURSO" | "PAUSADO" | "VAZIO";

export interface Concurso {
  id: string;
  nome: string;
  iniciais: string;
  banca: string;
  ano: number;
  cargo: string;
  dataProva: string;
  metaDiaria: number;
  arquivado: boolean;
  noBanco: number;
  respondidas: number;
  diasProva: number;
  estado: EstadoConcurso;
}

interface ConcursoContextValue {
  concursos: Concurso[];
  ativo: Concurso | null;
  activeId: string | null;
  loading: boolean;
  setAtivo: (id: string) => void;
  refresh: () => Promise<void>;
}

const ConcursoContext = createContext<ConcursoContextValue | null>(null);

export function ConcursoProvider({ children }: { children: ReactNode }) {
  const [concursos, setConcursos] = useState<Concurso[]>([]);
  const [activeId, setActiveId] = useState<string | null>(getConcursoId());
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { concursos } = await api<{ concursos: Concurso[] }>("/concursos");
    setConcursos(concursos);
    // Garante um ativo válido: mantém o salvo se ainda existir, senão pega o primeiro
    // em curso (ou o primeiro qualquer).
    setActiveId((cur) => {
      const valido = cur && concursos.some((c) => c.id === cur);
      if (valido) return cur;
      const preferido = concursos.find((c) => c.estado === "EM_CURSO") ?? concursos[0];
      const id = preferido?.id ?? null;
      setConcursoId(id);
      return id;
    });
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const setAtivo = useCallback((id: string) => {
    setConcursoId(id);
    setActiveId(id);
  }, []);

  const ativo = concursos.find((c) => c.id === activeId) ?? null;

  return (
    <ConcursoContext.Provider value={{ concursos, ativo, activeId, loading, setAtivo, refresh }}>
      {children}
    </ConcursoContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useConcurso() {
  const ctx = useContext(ConcursoContext);
  if (!ctx) throw new Error("useConcurso precisa estar dentro de <ConcursoProvider>");
  return ctx;
}

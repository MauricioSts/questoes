// Concurso ativo. O id fica no KeyValueStore porque o cliente HTTP precisa lê-lo
// de forma síncrona ao montar cada URL (lib/concurso.ts, SDD §6.1); este contexto
// cuida da lista, do carregamento e da troca.
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "@/lib/api";
import { getConcursoId, setConcursoId } from "@/lib/concurso";
import { useAuth } from "./auth";

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
  estado: "VAZIO" | "PAUSADO" | "EM_CURSO";
}

interface ConcursoContextValue {
  concursos: Concurso[];
  ativo: Concurso | null;
  carregando: boolean;
  erro: string | null;
  trocar: (id: string) => void;
  recarregar: () => Promise<void>;
}

const Ctx = createContext<ConcursoContextValue | null>(null);

export function ConcursoProvider({ children }: { children: ReactNode }) {
  const { usuario } = useAuth();
  const [concursos, setConcursos] = useState<Concurso[]>([]);
  const [ativoId, setAtivoId] = useState<string | null>(getConcursoId);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const recarregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const { concursos: lista } = await api<{ concursos: Concurso[] }>("/concursos");
      setConcursos(lista);

      // Se o id guardado não existe mais (concurso apagado noutro aparelho), cai
      // no primeiro não arquivado em vez de deixar o app escopado num id morto.
      const guardado = getConcursoId();
      const valido = lista.some((c) => c.id === guardado);
      if (!valido) {
        const padrao = lista.find((c) => !c.arquivado) ?? lista[0] ?? null;
        setConcursoId(padrao?.id ?? null);
        setAtivoId(padrao?.id ?? null);
      }
    } catch {
      setErro("Não foi possível carregar os concursos.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    if (usuario) void recarregar();
    else setConcursos([]);
  }, [usuario, recarregar]);

  function trocar(id: string) {
    setConcursoId(id);
    setAtivoId(id);
  }

  const ativo = concursos.find((c) => c.id === ativoId) ?? null;

  return (
    <Ctx.Provider value={{ concursos, ativo, carregando, erro, trocar, recarregar }}>
      {children}
    </Ctx.Provider>
  );
}

export function useConcurso(): ConcursoContextValue {
  const c = useContext(Ctx);
  if (!c) throw new Error("useConcurso fora do ConcursoProvider");
  return c;
}

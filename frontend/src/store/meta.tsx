// Estado da meta do dia, num lugar só.
//
// Antes o painel e a barra de topo buscavam /goals/today cada um por sua conta, e nenhum
// dos dois sabia quando uma resposta era enviada — a ofensiva no topo só mudava depois de
// um F5. Agora existe um dono: ele recarrega a meta quando as respostas sincronizam e,
// no instante em que a meta do dia vira cumprida, dispara a comemoração em tela cheia.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { api } from "../lib/api";
import { EVENTO_RESPOSTAS_SINCRONIZADAS } from "../lib/answers";
import { useConcurso } from "./concurso";

export interface GoalHoje {
  meta: number;
  respondidasHoje: number;
  acertosHoje?: number;
  cumpriuHoje: boolean;
  streak: number;
  feriasAtivo?: boolean;
  dataProva?: string | null;
  progressoPlano?: number;
  progressoTempo?: number | null;
  totalQuestoes?: number;
  respondidasTotal?: number;
  respondidasSempre?: number;
  revisaoPendente?: number;
}

export interface Festa {
  streak: number;
  respondidas: number;
  meta: number;
}

interface MetaContextValue {
  goal: GoalHoje | null;
  setGoal: (atualizar: (g: GoalHoje | null) => GoalHoje | null) => void;
  atualizar: () => Promise<void>;
  festa: Festa | null;
  /** Repete a comemoração sob demanda (clique na ofensiva da barra de topo). */
  celebrar: () => void;
  fecharFesta: () => void;
}

const MetaContext = createContext<MetaContextValue | null>(null);

// Pré-visualização: `?festa=1` em qualquer rota dispara a comemoração uma vez, com os
// números reais do dia. Serve para conferir a animação sem ter de bater a meta de novo
// (ou depois de já tê-la batido e perdido o momento por causa de um F5).
function pediuFesta(): boolean {
  try {
    return new URLSearchParams(window.location.search).has("festa");
  } catch {
    return false;
  }
}

export function MetaProvider({ children }: { children: ReactNode }) {
  const { activeId } = useConcurso();
  const [goal, setGoalState] = useState<GoalHoje | null>(null);
  const [festa, setFesta] = useState<Festa | null>(null);
  // null = ainda não sabemos como o dia estava. A primeira leitura só REGISTRA o estado:
  // quem abre o app com a meta já batida não merece uma comemoração de novo.
  const cumpriuAntes = useRef<boolean | null>(null);
  const festaForcada = useRef(pediuFesta());
  // Espelho do goal para quem precisa do valor atual fora do render (celebrar()).
  const goalRef = useRef<GoalHoje | null>(null);

  const atualizar = useCallback(async () => {
    try {
      const g = await api<GoalHoje>("/goals/today");
      setGoalState(g);
      goalRef.current = g;
      const antes = cumpriuAntes.current;
      cumpriuAntes.current = g.cumpriuHoje;
      if (festaForcada.current) {
        festaForcada.current = false;
        setFesta({ streak: g.streak, respondidas: g.respondidasHoje, meta: g.meta });
        return;
      }
      if (antes === false && g.cumpriuHoje) {
        setFesta({ streak: g.streak, respondidas: g.respondidasHoje, meta: g.meta });
      }
    } catch {
      // Offline: a meta continua com o último valor conhecido.
    }
  }, []);

  // Troca de concurso é outro dia de estudo: a referência recomeça do zero.
  useEffect(() => {
    cumpriuAntes.current = null;
    void atualizar();
  }, [activeId, atualizar]);

  // Respostas sincronizadas (inclusive as que estavam na fila offline) → recontar.
  useEffect(() => {
    const aoSincronizar = () => void atualizar();
    window.addEventListener(EVENTO_RESPOSTAS_SINCRONIZADAS, aoSincronizar);
    return () => window.removeEventListener(EVENTO_RESPOSTAS_SINCRONIZADAS, aoSincronizar);
  }, [atualizar]);

  const setGoal = useCallback((fn: (g: GoalHoje | null) => GoalHoje | null) => {
    setGoalState((g) => fn(g));
  }, []);

  // Sem meta carregada não há o que comemorar; com ofensiva zerada também não.
  const celebrar = useCallback(() => {
    const g = goalRef.current;
    if (!g || g.streak <= 0) return;
    setFesta({ streak: g.streak, respondidas: g.respondidasHoje, meta: g.meta });
  }, []);

  const fecharFesta = useCallback(() => setFesta(null), []);

  return (
    <MetaContext.Provider value={{ goal, setGoal, atualizar, festa, celebrar, fecharFesta }}>
      {children}
    </MetaContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useMeta() {
  const ctx = useContext(MetaContext);
  if (!ctx) throw new Error("useMeta precisa estar dentro de <MetaProvider>");
  return ctx;
}

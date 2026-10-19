// Liga lib/execucao (envio + polling com backoff) ao estado da tela. Uma execução por vez:
// executar de novo, trocar de exercício ou sair da tela cancela a consulta anterior.
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { executarEAcompanhar, type EstadoExecucao, type RespostaExecucao, type StatusExecucao } from "../lib/execucao";

const esperar = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function useExecucao(exercicioId: string | undefined) {
  const [estado, setEstado] = useState<EstadoExecucao>({ fase: "ocioso" });
  const controle = useRef<AbortController | null>(null);

  useEffect(() => {
    setEstado({ fase: "ocioso" });
    return () => controle.current?.abort();
  }, [exercicioId]);

  const executar = useCallback(
    (codigo: string) => {
      if (!exercicioId) return;
      controle.current?.abort();
      const c = new AbortController();
      controle.current = c;
      void executarEAcompanhar({
        enviar: () =>
          api<{ id: string; status: StatusExecucao }>("/execucoes", { method: "POST", body: { exercicioId, codigo } }),
        buscar: (id) => api<RespostaExecucao>(`/execucoes/${encodeURIComponent(id)}`),
        esperar,
        onEstado: setEstado,
        sinal: c.signal,
      });
    },
    [exercicioId]
  );

  const ocupado = estado.fase === "enviando" || estado.fase === "aguardando";
  return { estado, executar, ocupado };
}

// GET /goals/today do concurso ativo: meta do dia, ofensiva, totais.
//
// O escopo por concurso é aplicado dentro de lib/api.ts (?concursoId=), então este
// hook só precisa reagir à troca de concurso para refazer a chamada.
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

export interface Progresso {
  meta: number;
  respondidasHoje: number;
  acertosHoje: number;
  cumpriuHoje: boolean;
  streak: number;
  feriasAtivo: boolean;
  semana: boolean[];
  hojeIdx: number;
  dataProva: string | null;
  totalQuestoes: number;
  respondidasTotal: number;
  respondidasSempre: number;
  progressoPlano: number;
  progressoTempo: number | null;
  revisaoPendente: number;
}

export function useProgresso(concursoId: string | null) {
  const [dados, setDados] = useState<Progresso | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const recarregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      setDados(await api<Progresso>("/goals/today"));
    } catch {
      setErro("Não foi possível carregar o progresso.");
    } finally {
      setCarregando(false);
    }
  }, []);

  // concursoId entra como dependência para refazer a chamada ao trocar de concurso.
  useEffect(() => {
    void recarregar();
  }, [recarregar, concursoId]);

  return { dados, carregando, erro, recarregar };
}

// GET /answers/stats e GET /stats/heatmap do concurso ativo.
//
// Nenhuma agregação acontece aqui: quem calcula taxa por matéria, pontos fracos e
// tempo médio é o backend (`backend/src/lib/stats.ts`). Duplicar essa conta no
// cliente criaria uma segunda verdade — o app mostraria número diferente do web.
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

export interface TaxaItem {
  chave: string;
  total: number;
  acertos: number;
  taxa: number;
}

export interface Stats {
  totalRespondidas: number;
  totalAcertos: number;
  taxaGlobal: number;
  tempoMedioSegundos: number | null;
  porDia: { dia: string; total: number; acertos: number }[];
  porMateria: TaxaItem[];
  porAssunto: TaxaItem[];
  pontosFracos: TaxaItem[];
  streak: number;
}

export interface DiaHeatmap {
  dia: string;
  total: number;
}

export interface PeriodoFerias {
  inicio: string;
  fim: string | null;
}

export type PeriodoStats = "7d" | "30d" | "all";

export function useStats(concursoId: string | null, periodo: PeriodoStats = "all") {
  const [stats, setStats] = useState<Stats | null>(null);
  const [dias, setDias] = useState<DiaHeatmap[]>([]);
  const [ferias, setFerias] = useState<PeriodoFerias[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const recarregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      // As duas são independentes: o heatmap falhar não pode esconder os números.
      const [s, h] = await Promise.allSettled([
        api<Stats>(`/answers/stats?period=${periodo}`),
        api<{ dias: DiaHeatmap[]; periodos: PeriodoFerias[] }>("/stats/heatmap"),
      ]);

      if (s.status === "fulfilled") setStats(s.value);
      else setErro("Não foi possível carregar as estatísticas.");

      if (h.status === "fulfilled") {
        setDias(h.value.dias);
        setFerias(h.value.periodos);
      }
    } finally {
      setCarregando(false);
    }
  }, [periodo]);

  useEffect(() => {
    void recarregar();
  }, [recarregar, concursoId]);

  return { stats, dias, ferias, carregando, erro, recarregar };
}

// Monta a lista de questões de cada modo de estudo.
//
// A regra de montagem em si é a copiada do web (`lib/sessionBuilder.ts`); o que este
// hook faz é buscar no backend os insumos que ela pede — erradas priorizadas, respostas
// da semana, revisões pendentes — e entregar a lista pronta.
import { useCallback, useState } from "react";
import { api } from "@/lib/api";
import * as repo from "@/lib/questoesRepo";
import { montarFlash, montarSimulado, montarTopico, type SemanaItem, type TopicoInput } from "@/lib/sessionBuilder";
import type { Questao } from "@/types/questao";
import { useQuestoes } from "@/store/questoes";

export type ModoSessao = "flash" | "simulado" | "topico" | "revisar";

export function useMontarSessao() {
  const { respondidas, erradas } = useQuestoes();
  const [montando, setMontando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  /** Sessão montada, mas sem os insumos do servidor. Não é erro: é modo degradado. */
  const [aviso, setAviso] = useState<string | null>(null);

  const flash = useCallback(
    async (quantidade = 10): Promise<Questao[]> => {
      setMontando(true);
      setErro(null);
      setAviso(null);

      // Sem rede, monta mesmo assim: o montarFlash completa com questões não
      // respondidas quando não há erradas priorizadas. Melhor um Flash sem
      // priorização do que nenhum Flash.
      let idsErrados: number[] = [];
      try {
        // A ordem dos ids importa: o backend já devolve por prioridade de erro.
        const r = await api<{ ids: number[] }>(`/answers/wrong?modulo=II&limit=${quantidade}`);
        idsErrados = r.ids;
      } catch {
        setAviso("Sem conexão. Flash montado sem priorizar as suas erradas.");
      }

      try {
        return montarFlash({
          idsErradosPriorizados: idsErrados,
          todasModuloII: repo.todas().filter((q) => q.modulo === "II"),
          respondidasIds: respondidas,
          quantidade,
        }).questoes;
      } finally {
        setMontando(false);
      }
    },
    [respondidas]
  );

  const simulado = useCallback(async (): Promise<Questao[]> => {
    setMontando(true);
    setErro(null);
    setAviso(null);

    let semana: SemanaItem[] = [];
    try {
      const r = await api<{ questoes: SemanaItem[] }>("/answers/week");
      semana = r.questoes ?? [];
    } catch {
      setAviso("Sem conexão. Simulado montado sem o histórico da semana.");
    }

    try {
      return montarSimulado({ semana, todas: repo.todas() });
    } finally {
      setMontando(false);
    }
  }, []);

  const topico = useCallback(
    (filtro: Omit<TopicoInput, "todas" | "respondidasIds" | "erradasIds">): Questao[] =>
      // Puramente local: o filtro roda sobre o acervo em memória, então funciona offline.
      montarTopico({
        ...filtro,
        todas: repo.todas(),
        respondidasIds: respondidas,
        erradasIds: erradas,
      }),
    [respondidas, erradas]
  );

  const revisar = useCallback(async (limite = 60): Promise<Questao[]> => {
    setMontando(true);
    setErro(null);
    setAviso(null);
    try {
      // A fila de revisão espaçada (SRS) é calculada no backend, e não há como
      // reproduzi-la offline: aqui a falha é falha mesmo.
      const { ids } = await api<{ ids: number[] }>(`/answers/revisao?limit=${limite}`);
      return repo.getQuestoes(ids);
    } catch {
      setErro("Não foi possível carregar as revisões. Elas dependem de conexão.");
      return [];
    } finally {
      setMontando(false);
    }
  }, []);

  return { flash, simulado, topico, revisar, montando, erro, aviso };
}

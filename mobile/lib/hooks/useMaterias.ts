// Cobertura por matéria: quantas questões existem e quantas já foram respondidas.
//
// Roda inteiro em memória sobre o `questoesRepo` e os ids de respondidas/erradas que
// o QuestoesProvider já tem. Sem chamada de rede, então funciona offline — e é a
// diferença em relação à tela de Stats, que depende do servidor.
import { useMemo } from "react";
import * as repo from "@/lib/questoesRepo";
import type { Modulo } from "@/types/questao";
import { useQuestoes } from "@/store/questoes";

export interface CoberturaMateria {
  materia: string;
  modulo: Modulo;
  total: number;
  respondidas: number;
  erradas: number;
  /** 0–1. Quanto do acervo daquela matéria já foi visto. */
  cobertura: number;
}

export function useMaterias(): CoberturaMateria[] {
  const { respondidas, erradas, versao } = useQuestoes();

  return useMemo(() => {
    const mapa = new Map<string, CoberturaMateria>();

    for (const q of repo.todas()) {
      const atual =
        mapa.get(q.materia) ??
        { materia: q.materia, modulo: q.modulo, total: 0, respondidas: 0, erradas: 0, cobertura: 0 };

      atual.total++;
      if (respondidas.has(q.id)) atual.respondidas++;
      if (erradas.has(q.id)) atual.erradas++;
      mapa.set(q.materia, atual);
    }

    return [...mapa.values()]
      .map((m) => ({ ...m, cobertura: m.total ? m.respondidas / m.total : 0 }))
      .sort((a, b) => a.cobertura - b.cobertura); // menos coberta primeiro: é o que falta estudar
    // `versao` sobe a cada troca de acervo; sem ela este memo não recalcularia.
  }, [respondidas, erradas, versao]);
}

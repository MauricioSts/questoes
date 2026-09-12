// Meta FIXA por matéria do dia (rodízio de segunda a sexta), servida pelo backend em
// /goals/materia-do-dia. O backend sorteia e GRAVA as questões do dia; aqui só lemos.
import { api } from "./api";

export interface MetaMateriaHoje {
  diaIndex: number; // 0=segunda … 6=domingo
  materia: string | null; // null no fim de semana
  meta: number; // quantas questões a meta do dia tem (10, ou menos se faltar questão)
  questaoIds: number[];
  feitasIds?: number[]; // as que já respondi hoje
  feitas: number;
  acertos: number;
  concluida: boolean;
  semQuestoes?: boolean; // o concurso não tem questões dessa matéria
}

export function carregarMetaMateria(): Promise<MetaMateriaHoje> {
  return api<MetaMateriaHoje>("/goals/materia-do-dia");
}

// Ordem de estudo: o que ainda falta primeiro, na ordem sorteada; depois as já feitas
// (revisão do dia). Sair e voltar retoma de onde parou, sem repetir o que já saiu.
export function ordemDeEstudo(meta: MetaMateriaHoje): number[] {
  const feitas = new Set(meta.feitasIds ?? []);
  const faltando = meta.questaoIds.filter((id) => !feitas.has(id));
  const jaFeitas = meta.questaoIds.filter((id) => feitas.has(id));
  return [...faltando, ...jaFeitas];
}

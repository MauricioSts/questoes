// Simulado configurável por concurso: que matérias entram, quantas questões de cada, o
// peso de cada uma na nota, a duração do cronômetro, a nota de corte e se só abre aos
// sábados. Fica no servidor (Concurso.simuladoConfig); sem configuração salva, vale o
// padrão: o da prova da Dataprev para a trilha dela, e um montado com as matérias do
// acervo para as outras.
import { PROPORCAO_SIMULADO, PESOS, SIMULADO_DURACAO_MIN, NOTA_CORTE_PONTOS, TOTAL_PONTOS } from "../config/prova";
import type { Questao } from "../types/questao";

export interface ItemSimulado {
  nome: string; // rótulo na tela ("Português", "Conhecimentos específicos")
  materias: string[]; // matérias do acervo que este item sorteia
  qtd: number;
  peso: number; // pontos por acerto
}

export interface ConfigSimulado {
  itens: ItemSimulado[];
  duracaoMin: number;
  notaCortePct: number; // % dos pontos possíveis
  soSabado: boolean;
}

const TRILHA_DATAPREV = "dataprev-analista-ti";
// Tamanho do simulado padrão nas trilhas que não têm prova de referência.
const TOTAL_PADRAO = 40;

function contarPorMateria(todas: Questao[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const q of todas) m.set(q.materia, (m.get(q.materia) ?? 0) + 1);
  return m;
}

// A prova da Dataprev: Módulo I por matéria (peso 1) e Módulo II sorteado entre as
// específicas (peso 2,5), 70 questões, 4 h, sábado.
export function configDataprev(todas: Questao[]): ConfigSimulado {
  const especificas = [...new Set(todas.filter((q) => q.modulo === "II").map((q) => q.materia))].sort();
  const itens: ItemSimulado[] = Object.entries(PROPORCAO_SIMULADO.moduloI).map(([materia, qtd]) => ({
    nome: materia,
    materias: [materia],
    qtd,
    peso: PESOS.I,
  }));
  if (especificas.length) {
    itens.push({ nome: "Conhecimentos específicos", materias: especificas, qtd: PROPORCAO_SIMULADO.moduloIITotal, peso: PESOS.II });
  }
  return {
    itens,
    duracaoMin: SIMULADO_DURACAO_MIN,
    notaCortePct: Math.round((NOTA_CORTE_PONTOS / TOTAL_PONTOS) * 100),
    soSabado: true,
  };
}

// Padrão de uma trilha qualquer: cada matéria do acervo com quantidade proporcional ao
// que ela tem (no mínimo 1), somando até TOTAL_PADRAO; 3 minutos por questão.
export function configAutomatica(todas: Questao[]): ConfigSimulado {
  const contagem = [...contarPorMateria(todas).entries()].sort((a, b) => b[1] - a[1]);
  const totalBanco = todas.length;
  const alvo = Math.min(TOTAL_PADRAO, totalBanco);
  const itens: ItemSimulado[] = contagem.map(([materia, n]) => ({
    nome: materia,
    materias: [materia],
    qtd: Math.max(1, Math.min(n, Math.round((n / Math.max(1, totalBanco)) * alvo))),
    peso: 1,
  }));
  const total = itens.reduce((s, i) => s + i.qtd, 0);
  return {
    itens,
    duracaoMin: Math.max(30, Math.round((total * 3) / 10) * 10),
    notaCortePct: 60,
    soSabado: false,
  };
}

export function configPadrao(trilhaId: string | null | undefined, todas: Questao[]): ConfigSimulado {
  // Concurso sem trilha é a Dataprev de antes das trilhas.
  return !trilhaId || trilhaId === TRILHA_DATAPREV ? configDataprev(todas) : configAutomatica(todas);
}

export const totalQuestoes = (c: ConfigSimulado) => c.itens.reduce((s, i) => s + i.qtd, 0);
export const totalPontos = (c: ConfigSimulado) => c.itens.reduce((s, i) => s + i.qtd * i.peso, 0);

// Peso de uma matéria na nota: o do item que a contém (1 se nenhum contém).
export function pesoDaMateria(c: ConfigSimulado, materia: string): number {
  return c.itens.find((i) => i.materias.includes(materia))?.peso ?? 1;
}

export interface NotaSimulado {
  pontos: number;
  totalPontosPossivel: number;
  acertos: number;
  total: number;
  corte: number; // em pontos
  aprovadoEstimado: boolean;
}

export function notaSimulado(c: ConfigSimulado, respostas: { materia: string; acertou: boolean }[]): NotaSimulado {
  let pontos = 0;
  let possivel = 0;
  let acertos = 0;
  for (const r of respostas) {
    const peso = pesoDaMateria(c, r.materia);
    possivel += peso;
    if (r.acertou) {
      pontos += peso;
      acertos++;
    }
  }
  const corte = (possivel * c.notaCortePct) / 100;
  return { pontos, totalPontosPossivel: possivel, acertos, total: respostas.length, corte, aprovadoEstimado: pontos >= corte };
}

export const formatarPeso = (p: number) => p.toLocaleString("pt-BR", { maximumFractionDigits: 2 });

// Contagem regressiva até a prova do perfil: data_prova + horario_prova.inicio no fuso
// do perfil (Brasília quando não vier). Nada de data fixa: muda o perfil, muda a conta.
import type { PerfilProva } from "./notaCE";

const FUSO_PADRAO = "America/Sao_Paulo";

// Diferença (ms) entre o relógio do fuso e o UTC num instante: Brasília dá -3 h.
function deslocamento(fuso: string, instante: number): number {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: fuso,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(instante));
  const v = (t: string) => Number(partes.find((p) => p.type === t)?.value);
  return Date.UTC(v("year"), v("month") - 1, v("day"), v("hour"), v("minute"), v("second")) - instante;
}

// Instante (ms UTC) do início da prova; null se o perfil não tem data.
export function inicioDaProva(perfil: Pick<PerfilProva, "data_prova" | "horario_prova">): number | null {
  const m = perfil.data_prova?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const [h, min] = (perfil.horario_prova?.inicio ?? "00:00").split(":").map(Number);
  const fuso = perfil.horario_prova?.fuso ?? FUSO_PADRAO;
  // Hora de parede lida como UTC e corrigida pelo deslocamento do fuso naquele dia.
  const comoUtc = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), h || 0, min || 0);
  return comoUtc - deslocamento(fuso, comoUtc);
}

// Instante (ms UTC) do fim da prova: horario_prova.fim no mesmo dia (sem fim, o início).
export function fimDaProva(perfil: Pick<PerfilProva, "data_prova" | "horario_prova">): number | null {
  const fim = perfil.horario_prova?.fim;
  if (!fim || !perfil.horario_prova) return inicioDaProva(perfil);
  return inicioDaProva({ ...perfil, horario_prova: { ...perfil.horario_prova, inicio: fim } });
}

// A contagem oficial só vale para perfil com data E horário (edital publicado) e prova
// que ainda não terminou. Fora disso (CGU sem horário, Bacen de 2024, prova já feita)
// devolve null e a tela fica com a data manual do concurso.
export function contagemOficial(
  perfil: Pick<PerfilProva, "data_prova" | "horario_prova">,
  agora: number = Date.now()
): { inicio: number; fim: number } | null {
  if (!perfil.horario_prova?.inicio) return null;
  const inicio = inicioDaProva(perfil);
  const fim = fimDaProva(perfil);
  if (inicio == null || fim == null || agora >= fim) return null;
  return { inicio, fim };
}

// Nome do fuso para a tela: Brasília para o de São Paulo; os demais, pela cidade do IANA.
export function rotuloFuso(fuso: string = FUSO_PADRAO): string {
  if (fuso === FUSO_PADRAO) return "Brasília";
  return (fuso.split("/").pop() ?? fuso).replace(/_/g, " ");
}

// Dias até a prova, arredondados para cima (como a contagem da data manual).
export const diasAte = (alvo: number, agora: number = Date.now()) => Math.max(0, Math.ceil((alvo - agora) / 86400000));

export interface Restante {
  dias: number;
  horas: number;
  minutos: number;
  passou: boolean;
}

export function tempoRestante(alvo: number, agora: number = Date.now()): Restante {
  const ms = Math.max(0, alvo - agora);
  const minutosTotais = Math.floor(ms / 60000);
  return {
    dias: Math.floor(minutosTotais / 1440),
    horas: Math.floor((minutosTotais % 1440) / 60),
    minutos: minutosTotais % 60,
    passou: alvo <= agora,
  };
}

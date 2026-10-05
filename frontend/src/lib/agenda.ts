// Agenda semanal de estudo: dias especiais do plano.
// getDay(): 0=domingo … 6=sábado (fuso local do navegador).

// Reta final da prova: o simulado fica liberado todos os dias.
// Para voltar a travar fora de sábado, trocar por `d.getDay() === 6`.
export function ehDiaDeSimulado(_d = new Date()): boolean {
  return true;
}

// Sábado e domingo são dias de descanso: a ofensiva não morre (tratado no backend).
// getDay(): 0=domingo, 6=sábado.
export function ehDiaDeDescanso(d = new Date()): boolean {
  return d.getDay() === 0 || d.getDay() === 6;
}

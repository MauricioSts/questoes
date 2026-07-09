// Agenda semanal de estudo: dias especiais do plano.
// getDay(): 0=domingo … 6=sábado (fuso local do navegador).

// Sábado é dia de simulado — o modo só fica liberado nesse dia.
export function ehDiaDeSimulado(d = new Date()): boolean {
  return d.getDay() === 6;
}

// Domingo é dia de descanso — a ofensiva não morre (tratado no backend).
export function ehDiaDeDescanso(d = new Date()): boolean {
  return d.getDay() === 0;
}

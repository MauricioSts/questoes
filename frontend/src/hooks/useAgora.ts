// Relógio da tela, de minuto em minuto: a contagem da prova mostra dias, horas e minutos,
// e a Home troca o dia (data, saudação, "Hoje é dia de prova") sem F5. Ao voltar para a
// aba, acerta na hora: o navegador segura os timers de aba escondida.
import { useEffect, useState } from "react";

export function useAgora(intervaloMs = 60_000): number {
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    const tique = () => setAgora(Date.now());
    const t = window.setInterval(tique, intervaloMs);
    const aoVoltar = () => {
      if (document.visibilityState === "visible") tique();
    };
    document.addEventListener("visibilitychange", aoVoltar);
    return () => {
      window.clearInterval(t);
      document.removeEventListener("visibilitychange", aoVoltar);
    };
  }, [intervaloMs]);
  return agora;
}

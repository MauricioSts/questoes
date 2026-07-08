import { Check } from "lucide-react";

interface StreakCalendarProps {
  diasConcluidos: boolean[]; // Array de 7 dias (seg-dom)
  hojeEhIndice?: number; // Índice do dia de hoje (0-6)
}

const diasDaSemana = ["S", "T", "Q", "Q", "S", "S", "D"];

export function StreakCalendar({ diasConcluidos, hojeEhIndice = -1 }: StreakCalendarProps) {
  return (
    <div className="flex gap-2">
      {diasDaSemana.map((dia, idx) => {
        const concluido = diasConcluidos[idx] ?? false;
        const ehHoje = idx === hojeEhIndice;

        if (concluido) {
          return (
            <div
              key={idx}
              className="h-10 w-10 rounded-lg bg-gradient-to-r from-flame-from to-flame-to flex items-center justify-center flex-shrink-0"
            >
              <Check size={20} className="text-white" strokeWidth={3} />
            </div>
          );
        }

        if (ehHoje) {
          return (
            <div
              key={idx}
              className="h-10 w-10 rounded-lg border-2 border-dashed border-flame-text flex items-center justify-center flex-shrink-0 bg-white font-bold text-flame-text"
            >
              {dia}
            </div>
          );
        }

        return (
          <div
            key={idx}
            className="h-10 w-10 rounded-lg bg-brand-100 flex items-center justify-center flex-shrink-0 text-xs font-medium text-brand-600"
          >
            {dia}
          </div>
        );
      })}
    </div>
  );
}

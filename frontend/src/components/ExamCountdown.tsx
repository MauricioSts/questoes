import { CalendarDays } from "lucide-react";

interface ExamCountdownProps {
  diasRestantes: number;
  dataProva: Date | string;
  progressoPorcentagem?: number;
}

export function ExamCountdown({ diasRestantes, dataProva, progressoPorcentagem = 0 }: ExamCountdownProps) {
  const dataFormatada =
    typeof dataProva === "string"
      ? new Date(dataProva).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })
      : dataProva.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="rounded-3xl bg-gradient-to-br from-[#1C1840] to-[#332A6E] p-6 text-white space-y-4">
      <div className="text-xs font-bold uppercase tracking-widest text-cyan-from opacity-80">
        Contagem para a Prova
      </div>

      <div className="flex items-end gap-2">
        <div className="font-display font-extrabold text-5xl leading-none">{diasRestantes}</div>
        <div className="pb-1 text-sm opacity-80">dias restantes</div>
      </div>

      <div className="flex items-center gap-2 text-sm opacity-90">
        <CalendarDays size={18} strokeWidth={1.5} />
        <span>{dataFormatada}</span>
      </div>

      <div className="space-y-1">
        <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-cyan-from to-cyan-to transition-all duration-500"
            style={{ width: `${progressoPorcentagem}%` }}
          />
        </div>
        <div className="text-xs opacity-70">{progressoPorcentagem}% do plano concluído</div>
      </div>
    </div>
  );
}

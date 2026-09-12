// META FIXA DO DIA (Home). Ao lado da meta livre do anel, cada dia útil tem um rodízio
// fechado de 10 questões de UMA matéria — segunda português, terça legislação, quarta
// lógica, quinta inglês, sexta banco de dados. Quem sorteia e congela as questões do dia
// é o backend (/goals/materia-do-dia); aqui é só a leitura e o atalho para resolvê-las.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, CalendarRange, Trophy } from "lucide-react";
import { carregarMetaMateria, type MetaMateriaHoje } from "../lib/metaMateria";
import { useConcurso } from "../store/concurso";

const DIAS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

export function MetaDoDia() {
  const { activeId } = useConcurso();
  const navigate = useNavigate();
  const [meta, setMeta] = useState<MetaMateriaHoje | null>(null);

  // Recarrega ao trocar de concurso: o rodízio é das questões DAQUELE concurso.
  useEffect(() => {
    carregarMetaMateria().then(setMeta).catch(() => setMeta(null));
  }, [activeId]);

  if (!meta) return null;

  const dia = DIAS[meta.diaIndex] ?? "";

  // Fim de semana: nada de rodízio (sábado é dia de simulado, domingo é folga).
  if (!meta.materia) {
    return (
      <div className="card p-6">
        <p className="legenda text-[11px] font-bold uppercase tracking-[.16em] text-faint">Meta fixa de hoje</p>
        <p className="mt-2 font-display text-xl font-bold text-brand-ink">{dia} não tem matéria fixa</p>
        <p className="mt-1 text-sm text-muted">
          O rodízio por matéria roda de segunda a sexta. Sábado é dia de simulado.
        </p>
      </div>
    );
  }

  // O concurso ativo não tem questões dessa matéria: dizer isso é melhor do que
  // mostrar uma meta de zero questão e deixar procurar o que quebrou.
  if (meta.semQuestoes || meta.meta === 0) {
    return (
      <div className="card p-6">
        <p className="legenda text-[11px] font-bold uppercase tracking-[.16em] text-faint">Meta fixa de hoje</p>
        <p className="mt-2 font-display text-xl font-bold text-brand-ink">
          {dia} · {meta.materia}
        </p>
        <p className="mt-1 text-sm text-muted">
          Este concurso ainda não tem questões de {meta.materia}. Importe um lote para o rodízio começar.
        </p>
      </div>
    );
  }

  const faltam = Math.max(0, meta.meta - meta.feitas);
  const pct = meta.meta > 0 ? Math.round((meta.feitas / meta.meta) * 100) : 0;

  return (
    <div className="card p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="legenda text-[11px] font-bold uppercase tracking-[.16em] text-faint">Meta fixa de hoje</p>
          <p className="mt-2 flex items-center gap-2 font-display text-[22px] font-bold leading-tight text-brand-ink">
            <CalendarRange size={20} strokeWidth={2} style={{ color: "var(--accentText)" }} />
            {dia} · {meta.materia}
          </p>
          <p className="mt-1 text-sm text-muted">
            {meta.meta} questões sorteadas para hoje, com preferência para questão de prova e para o que
            você mais errou.
          </p>
        </div>
        {meta.concluida && (
          <span className="selo-meta">
            <Trophy size={13} strokeWidth={2.4} />
            Concluída
          </span>
        )}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <div className="h-2.5 flex-1 overflow-hidden rounded-full" style={{ background: "var(--track)" }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: "var(--accent)" }} />
        </div>
        <span className="text-sm font-semibold tabular-nums text-brand-ink">
          {meta.feitas} de {meta.meta}
        </span>
      </div>

      <p className="mt-2 text-xs text-faint">
        {meta.concluida
          ? `Você acertou ${meta.acertos} de ${meta.meta} na matéria de hoje.`
          : `Faltam ${faltam} ${faltam === 1 ? "questão" : "questões"} da matéria de hoje.`}
      </p>

      <button
        onClick={() => navigate("/estudar?meta=dia")}
        className="btn-primary mt-4 inline-flex items-center gap-2 text-base"
      >
        {meta.concluida ? "Refazer a matéria do dia" : meta.feitas > 0 ? "Continuar a matéria do dia" : `Fazer as ${meta.meta} de hoje`}
        <ArrowRight size={18} strokeWidth={2.4} />
      </button>
    </div>
  );
}

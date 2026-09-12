// META FIXA DO DIA (Home). Ao lado da meta livre do anel, cada dia útil tem um rodízio
// fechado de 10 questões de UMA matéria: segunda português, terça legislação, quarta
// lógica, quinta inglês, sexta banco de dados. Quem sorteia e congela as questões do dia
// é o backend (/goals/materia-do-dia); aqui é só a leitura e o atalho para resolvê-las.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, CalendarRange, Trophy } from "lucide-react";
import { carregarMetaMateria, type MetaMateriaHoje } from "../lib/metaMateria";
import { useConcurso } from "../store/concurso";
import { ProgressRing } from "./ProgressRing";

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
  const erros = Math.max(0, meta.feitas - meta.acertos);
  // Fim de semana: o anel continua na tela. O rodízio é de segunda a sexta, mas quem
  // quiser adiantar não deveria esbarrar num cartão que só diz "hoje não".
  const rotulo = meta.extra ? "Matéria extra de hoje" : "Meta fixa de hoje";

  // Mesmo desenho da meta diária: anel à esquerda, o que falta em letra grande à direita.
  // São as duas metas do dia lado a lado, então ler uma tem que ensinar a ler a outra.
  return (
    <div className="card">
      {/* Abaixo de sm o anel vai para CIMA do texto: lado a lado, a coluna de texto fica
          com ~145px e um "Portuguesa" de 28px estoura a borda do cartão. */}
      <div className="flex flex-1 flex-col items-center gap-6 p-6 text-center sm:flex-row sm:items-center sm:gap-7 sm:p-8 sm:text-left">
        {/* key: o anel remonta quando a meta chega da API, para desenhar a partir do valor
            real (e não comemorar de novo a cada F5 com a matéria já concluída). */}
        <ProgressRing key={meta.questaoIds.join(",")} valor={meta.feitas} meta={meta.meta} size={148} />

        <div className="w-full min-w-0 flex-1 space-y-2.5">
          <div className="flex items-center justify-center gap-2 sm:justify-start">
            <p className="legenda text-[11px] font-bold uppercase tracking-[.16em] text-faint">{rotulo}</p>
            <CalendarRange size={13} strokeWidth={2} style={{ color: "var(--accentText)" }} />
          </div>

          {meta.concluida && (
            <span className="selo-meta">
              <Trophy size={13} strokeWidth={2.4} />
              {meta.materia} em dia
            </span>
          )}

          <p className="font-display text-[24px] font-bold leading-[1.15] text-brand-ink sm:text-[28px]">
            {meta.concluida
              ? `${meta.materia} concluída`
              : `Faltam ${faltam} ${faltam === 1 ? "questão" : "questões"} de ${meta.materia}`}
          </p>

          <p className="text-[15px] leading-relaxed text-muted">
            {meta.concluida
              ? `Você fez as ${meta.meta} de ${dia.toLowerCase()}. Tudo daqui pra frente é vantagem.`
              : meta.extra
                ? `${dia} não cobra matéria: o rodízio é de segunda a sexta. Se quiser adiantar, as ${meta.meta} de ${meta.materia} de segunda já estão sorteadas.`
                : `${dia} é dia de ${meta.materia}: ${meta.meta} questões sorteadas, com preferência para questão de prova e para o que você mais errou.`}
          </p>

          <div className="mt-1 flex flex-wrap items-stretch justify-center gap-x-6 gap-y-3 border-t border-hair pt-3 sm:justify-start">
            <MiniDado rotulo="acertos" valor={meta.acertos} cor="var(--goodText)" />
            <MiniDado rotulo="erros" valor={erros} cor="var(--accentText)" />
            <MiniDado rotulo={`de ${meta.meta} feitas`} valor={meta.feitas} />
          </div>

          <button
            onClick={() => navigate("/estudar?meta=dia")}
            className="btn-primary mt-2 inline-flex items-center gap-2 text-base"
          >
            {meta.concluida
              ? "Refazer a matéria do dia"
              : meta.feitas > 0
                ? "Continuar a matéria do dia"
                : meta.extra
                  ? `Adiantar as ${meta.meta} de segunda`
                  : `Fazer as ${meta.meta} de hoje`}
            <ArrowRight size={18} strokeWidth={2.4} />
          </button>
        </div>
      </div>
    </div>
  );
}

// Número com rótulo embaixo, do mesmo tamanho dos da meta diária.
function MiniDado({ rotulo, valor, cor }: { rotulo: string; valor: number; cor?: string }) {
  return (
    <div className="min-w-[64px]">
      <p className="font-display text-xl font-bold leading-none tabular-nums" style={{ color: cor ?? "rgb(var(--ink))" }}>
        {valor}
      </p>
      <p className="mt-1 text-[11px] uppercase tracking-[.12em] text-faint">{rotulo}</p>
    </div>
  );
}

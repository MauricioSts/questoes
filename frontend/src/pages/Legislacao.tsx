// "Legislação": reúne todas as questões de legislação para uma rodada de estudo.
// Num ciclo de 2 dias, sinaliza quando é "dia de legislação".
import { useMemo, useState } from "react";
import { Scale } from "lucide-react";
import { SessionRunner, type RespostaSessao } from "../components/SessionRunner";
import { ResumoSessao } from "../components/ResumoSessao";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { questoesLegislacao, ehDiaDeLegislacao } from "../lib/legislacao";
import type { Questao } from "../types/questao";

export function Legislacao() {
  const questoes = useMemo(() => questoesLegislacao(), []);
  const diaHoje = ehDiaDeLegislacao();
  const [sessao, setSessao] = useState<Questao[] | null>(null);
  const [resultado, setResultado] = useState<RespostaSessao[] | null>(null);

  if (resultado) {
    return <ResumoSessao respostas={resultado} onNovaSessao={() => setResultado(null)} />;
  }

  if (sessao) {
    return (
      <SessionRunner
        questoes={sessao}
        contexto="ESTUDO"
        feedbackImediato
        permiteNota
        permiteMarcar
        onFinalizar={(rs) => { setResultado(rs); setSessao(null); }}
      />
    );
  }

  return (
    <div className="mx-auto max-w-[620px] space-y-6 px-1 py-6">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-2xl bg-[#E8F7EF] flex items-center justify-center flex-shrink-0">
          <Scale size={24} className="text-[#12995B]" strokeWidth={1.8} />
        </div>
        <div>
          <h1 className="font-display text-2xl font-extrabold text-brand-ink">Legislação</h1>
          <p className="text-sm text-faint">SI e Proteção de Dados · a cada 2 dias</p>
        </div>
      </div>

      <Card
        className={`p-4 ${diaHoje ? "border-l-4 border-l-[#12995B] bg-[#E8F7EF]/50" : ""}`}
      >
        <p className="font-semibold text-brand-ink">
          {diaHoje ? "📜 Hoje é dia de legislação!" : "Hoje não é dia de legislação"}
        </p>
        <p className="text-sm text-faint mt-1">
          {diaHoje
            ? "Aproveite para revisar tudo de legislação hoje."
            : "Volta amanhã — mas você pode adiantar quando quiser."}
        </p>
      </Card>

      {questoes.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-3xl mb-3">📭</p>
          <p className="font-semibold text-brand-ink">Nenhuma questão de legislação no banco</p>
          <p className="text-sm text-faint mt-2">Importe questões de legislação para começar.</p>
        </Card>
      ) : (
        <>
          <Button onClick={() => setSessao(questoes)} fullWidth size="lg">
            Fazer {questoes.length} {questoes.length === 1 ? "questão" : "questões"} de legislação
          </Button>

          <div className="space-y-2">
            {questoes.map((q) => (
              <Card key={q.id} className="flex items-center gap-3 p-4 overflow-hidden">
                <div className="h-14 w-1.5 rounded-full bg-[#12995B] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-brand-ink text-sm truncate">{q.assunto}</p>
                  <p className="text-xs text-faint">Mód. {q.modulo} · {q.materia}</p>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Histórico de simulados anteriores. Lista as sessões vindas do backend (/answers/simulados)
// e, ao abrir uma, reconstrói as RespostaSessao com as questões do repositório local para
// reaproveitar a tela de resultado (nota ponderada, acertos por matéria e revisão questão a questão).
import { useEffect, useState } from "react";
import { History, ChevronRight } from "lucide-react";
import { api } from "../lib/api";
import { getQuestao } from "../lib/questoesRepo";
import { calcularNotaSimulado } from "../lib/sessionBuilder";
import { ResultadoSimulado } from "./ResultadoSimulado";
import type { RespostaSessao } from "./SessionRunner";
import type { Alternativa, Questao } from "../types/questao";
import { Card } from "./Card";

interface RespostaHist {
  questaoId: number;
  alternativaMarcada: string;
  acertou: boolean;
  tempoSegundos: number | null;
  moduloSnapshot: string;
  materiaSnapshot: string;
  assuntoSnapshot: string;
  dificuldadeSnapshot: string;
}

interface SimuladoHist {
  id: string;
  data: string;
  total: number;
  acertos: number;
  tempoTotalSegundos: number;
  respostas: RespostaHist[];
}

// Constrói uma Questao "de reserva" a partir dos snapshots, quando a questão não está
// no banco local (ex.: outro dispositivo). O gabarito é derivado do acertou registrado
// para que o resultado continue coerente.
function questaoDeReserva(r: RespostaHist): Questao {
  const marcada = r.alternativaMarcada as Alternativa;
  const gabarito: Alternativa = r.acertou ? marcada : marcada === "A" ? "B" : "A";
  return {
    id: r.questaoId,
    modulo: (r.moduloSnapshot === "II" ? "II" : "I") as Questao["modulo"],
    materia: r.materiaSnapshot,
    assunto: r.assuntoSnapshot,
    dificuldade: (r.dificuldadeSnapshot as Questao["dificuldade"]) ?? "media",
    enunciado: "(Enunciado não disponível neste dispositivo — importe o banco de questões para revisar o conteúdo.)",
    alternativas: { [marcada]: "—", [gabarito]: "—" },
    gabarito,
    explicacao: "",
  };
}

function reconstruir(s: SimuladoHist): RespostaSessao[] {
  return s.respostas.map((r) => {
    const questao = getQuestao(r.questaoId) ?? questaoDeReserva(r);
    return {
      questao,
      marcada: r.alternativaMarcada as Alternativa,
      acertou: r.acertou,
      tempoSegundos: r.tempoSegundos ?? 0,
    };
  });
}

function formatarData(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function SimuladosAnteriores() {
  const [simulados, setSimulados] = useState<SimuladoHist[] | null>(null);
  const [erro, setErro] = useState(false);
  const [aberto, setAberto] = useState<SimuladoHist | null>(null);

  useEffect(() => {
    api<{ simulados: SimuladoHist[] }>("/answers/simulados")
      .then((r) => setSimulados(r.simulados))
      .catch(() => setErro(true));
  }, []);

  if (aberto) {
    return <ResultadoSimulado respostas={reconstruir(aberto)} onSair={() => setAberto(null)} />;
  }

  if (erro) {
    return (
      <Card className="p-6 text-center text-sm text-faint">
        Não foi possível carregar seus simulados. Verifique a conexão e tente de novo.
      </Card>
    );
  }

  if (!simulados) {
    return <p className="py-8 text-center text-sm text-faint">Carregando simulados…</p>;
  }

  if (simulados.length === 0) {
    return (
      <Card className="p-8 text-center space-y-2">
        <div className="mx-auto h-12 w-12 rounded-2xl bg-brand-50 flex items-center justify-center">
          <History size={24} className="text-brand-500" strokeWidth={1.5} />
        </div>
        <p className="font-display font-extrabold text-brand-ink">Nenhum simulado ainda</p>
        <p className="text-sm text-faint">
          Quando você terminar um simulado, ele aparece aqui para você revisar suas respostas.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {simulados.map((s) => {
        const nota = calcularNotaSimulado(
          s.respostas.map((r) => ({ modulo: (r.moduloSnapshot === "II" ? "II" : "I") as "I" | "II", acertou: r.acertou }))
        );
        const pct = Math.round((s.acertos / s.total) * 100);
        return (
          <button
            key={s.id}
            onClick={() => setAberto(s)}
            className="tap w-full text-left"
            aria-label={`Ver simulado de ${formatarData(s.data)}`}
          >
            <Card className="flex items-center gap-4 p-4 transition hover:border-brand-400">
              <div className="h-11 w-11 flex-shrink-0 rounded-xl bg-success-soft flex items-center justify-center">
                <History size={22} className="text-success-from" strokeWidth={1.5} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-brand-ink capitalize">{formatarData(s.data)}</p>
                <p className="text-xs text-faint">
                  {s.acertos}/{s.total} acertos · {pct}% · {nota.pontos.toFixed(1)} pts
                </p>
              </div>
              <ChevronRight size={20} className="flex-shrink-0 text-faint" />
            </Card>
          </button>
        );
      })}
    </div>
  );
}

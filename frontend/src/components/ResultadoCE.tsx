// Resultado do simulado certo/errado: nota por grupo com os pesos e o desconto do perfil,
// mínimos (proporcionais ao tamanho do simulado), aprovado ou eliminado e revisão item
// a item, com os brancos marcados como brancos.
import { useMemo, useState } from "react";
import { Check, TrendingUp, Trophy, X } from "lucide-react";
import type { RespostaSessao } from "./SessionRunner";
import { QuestaoView } from "./QuestaoView";
import { formatarPontos, itensDaProva, notaCE, type PerfilProva } from "../lib/notaCE";

export function ResultadoCE({
  respostas,
  perfil,
  onSair,
}: {
  respostas: RespostaSessao[];
  perfil: PerfilProva;
  onSair: () => void;
}) {
  const [revisando, setRevisando] = useState(false);
  const nota = useMemo(
    () =>
      notaCE(
        perfil,
        respostas.map((r) => ({
          grupo: r.questao.comando?.grupo ?? "",
          marcada: r.marcada as "C" | "E" | undefined,
          acertou: r.acertou,
        }))
      ),
    [respostas, perfil]
  );
  const { acerto, erro } = perfil.pontuacao;
  const menor = respostas.length < itensDaProva(perfil);

  if (revisando) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 p-4">
        <button onClick={() => setRevisando(false)} className="text-sm text-brand">← Voltar ao resultado</button>
        {respostas.map((r, i) => (
          <div key={r.questao.id} className="border-b border-hair pb-6">
            <p className="mb-2 text-xs text-faint">Item {i + 1}</p>
            <QuestaoView
              questao={r.questao}
              selecionada={r.marcada}
              revelado
              emBranco={!r.marcada}
              mostrarComando={i === 0 || respostas[i - 1].questao.comando?.id !== r.questao.comando?.id}
              metadados="origem"
              onSelecionar={() => {}}
            />
          </div>
        ))}
        <button onClick={onSair} className="btn-primary w-full">Concluir</button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-5 p-4 text-center">
      <div
        className="mx-auto grid h-16 w-16 place-items-center rounded-2xl"
        style={{ background: "var(--accentBg)", color: "var(--accentText)" }}
      >
        {nota.aprovado ? <Trophy size={30} strokeWidth={2} /> : <TrendingUp size={30} strokeWidth={2} />}
      </div>
      <h1 className="text-2xl font-bold">Resultado do Simulado</h1>

      <div className="card space-y-1 p-6">
        <p className="text-sm text-muted">Nota (cada erro desconta {formatarPontos(Math.abs(erro))} de {formatarPontos(acerto)} ponto)</p>
        <p className="text-4xl font-bold tabular-nums">
          {formatarPontos(nota.pontos)}
          <span className="text-xl text-faint"> / {formatarPontos(nota.maximo)}</span>
        </p>
        <p className={`mt-2 flex items-center justify-center gap-1.5 font-semibold ${nota.aprovado ? "text-acerto" : "text-erro"}`}>
          {nota.aprovado ? <Check size={18} strokeWidth={2.6} /> : <X size={18} strokeWidth={2.6} />}
          {nota.aprovado ? "Aprovado nos mínimos do edital" : "Eliminado"}
        </p>
        {nota.motivos.length > 0 && (
          <ul className="mt-1 space-y-0.5 text-sm text-erro">
            {nota.motivos.map((m) => <li key={m}>{m}</li>)}
          </ul>
        )}
      </div>

      <div className="card p-4 text-left">
        <p className="mb-3 text-sm font-semibold">Por grupo</p>
        <ul className="space-y-3 text-sm">
          {nota.grupos.map((g) => {
            const pct = g.maximo > 0 ? Math.max(0, Math.min(100, (g.pontos / g.maximo) * 100)) : 0;
            const pctMin = g.maximo > 0 && Number.isFinite(g.minimo) ? Math.max(0, Math.min(100, (g.minimo / g.maximo) * 100)) : null;
            return (
              <li key={g.grupo} className="space-y-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate font-semibold text-brand-ink">{g.grupo} · {g.nome}</span>
                  <span className={`flex-shrink-0 tabular-nums ${g.aprovado ? "text-acerto" : "text-erro"}`}>
                    {formatarPontos(g.pontos)} / {formatarPontos(g.maximo)}
                  </span>
                </div>
                <div className="relative h-2 overflow-hidden rounded-full" style={{ background: "var(--track)" }}>
                  <div className={`h-full ${g.aprovado ? "bg-acerto" : "bg-erro"}`} style={{ width: `${pct}%` }} />
                  {pctMin != null && (
                    <div className="absolute inset-y-0 w-0.5 bg-brand-ink" style={{ left: `${pctMin}%` }} title="Mínimo" />
                  )}
                </div>
                <p className="text-xs text-faint">
                  {g.acertos} {g.acertos === 1 ? "certo" : "certos"} · {g.erros} {g.erros === 1 ? "errado" : "errados"} · {g.brancos} em branco
                  {Number.isFinite(g.minimo) && <> · mínimo {formatarPontos(g.minimo)}</>}
                </p>
              </li>
            );
          })}
        </ul>
        {menor && (
          <p className="mt-3 text-xs text-faint">
            O simulado tem {respostas.length} dos {itensDaProva(perfil)} itens da prova, então os mínimos estão na mesma proporção.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <button onClick={() => setRevisando(true)} className="btn-primary w-full">Revisar item a item</button>
        <button onClick={onSair} className="tap rounded-xl px-4 py-2 text-muted">Sair</button>
      </div>
    </div>
  );
}

import { useState } from "react";
import { Zap } from "lucide-react";
import { api } from "../lib/api";
import { filtrar, temModulos } from "../lib/questoesRepo";
import { montarFlash } from "../lib/sessionBuilder";
import { useProgresso } from "../hooks/useProgresso";
import { SessionRunner, type RespostaSessao } from "../components/SessionRunner";
import { ResumoSessao } from "../components/ResumoSessao";
import { Spinner } from "../components/Spinner";
import type { Questao } from "../types/questao";

export function Flash() {
  const progresso = useProgresso();
  // Só a Dataprev separa Módulo I/II; nas outras trilhas o Flash usa o acervo inteiro.
  const soModuloII = temModulos();
  const recorte = soModuloII ? " no Módulo II" : "";
  const [sessao, setSessao] = useState<Questao[] | null>(null);
  const [resultado, setResultado] = useState<RespostaSessao[] | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function iniciar() {
    setCarregando(true);
    setAviso(null);
    try {
      const { ids } = await api<{ ids: number[] }>(`/answers/wrong?${soModuloII ? "modulo=II&" : ""}limit=10`);
      const elegiveis = filtrar(soModuloII ? { modulo: "II" } : {});
      const r = montarFlash({
        idsErradosPriorizados: ids,
        acervo: elegiveis,
        respondidasIds: progresso.respondidas,
        quantidade: 10,
      });
      if (r.completadoComNaoRespondidas) {
        setAviso(`Você tem menos de 10 erradas${recorte}, completamos com questões novas.`);
      }
      setResultado(null);
      if (r.questoes.length === 0) {
        setAviso("Esta trilha ainda não tem questões para montar o Flash.");
        return;
      }
      setSessao(r.questoes);
    } catch {
      const elegiveis = filtrar(soModuloII ? { modulo: "II" } : {});
      const r = montarFlash({
        idsErradosPriorizados: [...progresso.erradas],
        acervo: elegiveis,
        respondidasIds: progresso.respondidas,
        quantidade: 10,
      });
      setAviso("Sem conexão. Montamos o Flash com os dados locais.");
      if (r.questoes.length > 0) setSessao(r.questoes);
    } finally {
      setCarregando(false);
    }
  }

  function finalizar(rs: RespostaSessao[]) {
    setResultado(rs);
    setSessao(null);
    progresso.recarregar();
  }

  if (resultado) return <ResumoSessao respostas={resultado} onNovaSessao={() => setResultado(null)} />;

  if (sessao) {
    return (
      <SessionRunner
        questoes={sessao}
        contexto="FLASH"
        feedbackImediato
        permiteCaderno
        permiteMarcar
        onFinalizar={finalizar}
      />
    );
  }

  return (
    <div className="mx-auto max-w-[520px] space-y-6 px-4 py-6 flex flex-col items-center">
      {/* Hero */}
      <div className="w-full rounded-3xl bg-gradient-to-br from-flame-from to-flame-to p-8 text-white relative overflow-hidden text-center">
        {/* Círculos decorativos */}
        <div
          className="absolute top-4 right-4 w-32 h-32 rounded-full bg-white/10 blur-3xl animate-floaty"
          style={{ animationDuration: "6s" }}
        />
        <div
          className="absolute bottom-2 left-4 w-24 h-24 rounded-full bg-white/5 blur-2xl animate-floaty"
          style={{ animationDuration: "8s", animationDelay: "2s" }}
        />

        <div className="relative z-10 space-y-4">
          {/* Ícone */}
          <div className="h-16 w-16 rounded-2xl bg-white/20 flex items-center justify-center mx-auto">
            <Zap size={32} className="text-white" strokeWidth={1.5} fill="currentColor" />
          </div>

          {/* Título */}
          <h1 className="font-display text-4xl font-extrabold">Flash</h1>

          {/* Descrição */}
          <p className="text-sm leading-relaxed opacity-95">
            10 questões{soModuloII ? <> do <strong>Módulo II</strong></> : ""} que você já errou. Revisão espaçada em 5 minutos
          </p>

          {/* Badges */}
          <div className="flex flex-wrap gap-2 justify-center pt-2">
            <span className="inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">
              10 questões
            </span>
            {soModuloII && (
              <span className="inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">
                Módulo II
              </span>
            )}
            <span className="inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">
              Prioriza erradas
            </span>
          </div>
        </div>
      </div>

      {/* Aviso */}
      {aviso && (
        <div
          className="w-full rounded-xl border p-4 text-sm font-semibold"
          style={{ background: "var(--accentBg)", borderColor: "var(--accentBd)", color: "var(--accentText)" }}
          role="status"
        >
          {aviso}
        </div>
      )}

      {/* Botão escuro */}
      <button
        onClick={iniciar}
        disabled={carregando}
        className="tap w-full rounded-2xl bg-brand-ink py-4 font-display text-lg font-extrabold text-white transition hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-brand-ink/30"
      >
        {carregando && <Spinner className="" />}
        {carregando ? "Montando…" : "Começar Flash"}
        {!carregando && <Zap size={20} strokeWidth={2} fill="currentColor" />}
      </button>
    </div>
  );
}

// Tela de um exercício prático: enunciado + exemplos à esquerda, editor e resultado à
// direita (no celular, um embaixo do outro). O enunciado e tudo o que volta do sandbox são
// mostrados como TEXTO — nada de HTML vindo do servidor.
import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, Database, EyeOff, Play, RotateCcw } from "lucide-react";
import { api, ApiError } from "../lib/api";
import {
  apagarRascunho,
  codigoDeAbertura,
  ROTULO_LINGUAGEM,
  salvarRascunho,
  textoEspera,
  type ExercicioDetalhe,
} from "../lib/execucao";
import { useExecucao } from "../hooks/useExecucao";
import { invalidarExercicios } from "../hooks/useExercicios";
import { Card } from "../components/Card";
import { Skeleton } from "../components/Skeleton";
import { Spinner } from "../components/Spinner";
import { PageHeader } from "../components/PageHeader";
import { BlocoSaida, ResultadoExecucaoView } from "../components/exercicio/ResultadoExecucao";
import { PillDificuldade } from "./Exercicios";

// CodeMirror só baixa quando alguém abre um exercício.
const EditorCodigo = lazy(() => import("../components/exercicio/EditorCodigo"));

const MODO_DICA: Record<string, string> = {
  io: "Leia da entrada padrão (stdin) e escreva a resposta na saída padrão (stdout).",
  sql: "Escreva a consulta SQL (SQLite). O banco de partida está abaixo.",
  testes: "Escreva testes que passem na implementação certa e peguem as versões com bug.",
  shell: "Escreva os comandos em bash. Eles rodam dentro de um repositório git preparado.",
};

export function Exercicio() {
  const { id = "" } = useParams<{ id: string }>();
  const [ex, setEx] = useState<ExercicioDetalhe | null>(null);
  const [erro, setErro] = useState<"nao_encontrado" | "falha" | null>(null);
  const [codigo, setCodigo] = useState("");
  const { estado, executar, ocupado } = useExecucao(ex?.id);

  useEffect(() => {
    let vivo = true;
    setEx(null);
    setErro(null);
    api<ExercicioDetalhe>(`/exercicios/${encodeURIComponent(id)}`)
      .then((d) => {
        if (!vivo) return;
        setEx(d);
        setCodigo(codigoDeAbertura(d));
      })
      .catch((e) => vivo && setErro(e instanceof ApiError && e.status === 404 ? "nao_encontrado" : "falha"));
    return () => {
      vivo = false;
    };
  }, [id]);

  // Rascunho local: recarregar a página não perde o que foi digitado.
  useEffect(() => {
    if (!ex) return;
    const t = setTimeout(() => salvarRascunho(ex.id, codigo), 300);
    return () => clearTimeout(t);
  }, [ex, codigo]);

  // Resolveu: a lista (e o ✓) precisa refletir na próxima visita.
  useEffect(() => {
    if (estado.fase === "concluida") invalidarExercicios();
  }, [estado]);

  const rodar = useCallback(() => {
    if (ocupado || codigo.trim().length === 0) return;
    executar(codigo);
  }, [ocupado, codigo, executar]);

  function restaurar() {
    if (!ex) return;
    if (codigo !== ex.codigoInicial && !window.confirm("Trocar seu código pelo código inicial do exercício?")) return;
    apagarRascunho(ex.id);
    setCodigo(ex.codigoInicial);
  }

  const voltar = (
    <Link
      to="/exercicios"
      className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-brand-500"
    >
      <ArrowLeft size={16} strokeWidth={2} />
      Todos os exercícios
    </Link>
  );

  if (erro) {
    return (
      <div className="fadeup mx-auto max-w-[820px] pt-2">
        {voltar}
        <Card className="p-8 text-center">
          <p className="font-display text-lg font-bold text-brand-ink">
            {erro === "nao_encontrado" ? "Exercício não encontrado" : "Não deu para carregar o exercício"}
          </p>
          <p className="mx-auto mt-2 max-w-[46ch] text-sm text-faint">
            {erro === "nao_encontrado"
              ? "Ele pode ter sido removido ou ainda não foi publicado."
              : "Confira sua conexão e recarregue a página."}
          </p>
        </Card>
      </div>
    );
  }

  if (!ex) {
    return (
      <div className="mx-auto pt-2">
        {voltar}
        <Skeleton className="mb-5 h-16 max-w-[420px]" />
        <div className="grid gap-5 lg:grid-cols-2">
          <Skeleton className="h-[360px]" />
          <Skeleton className="h-[360px]" />
        </div>
      </div>
    );
  }

  const espera = textoEspera(estado);

  return (
    <div className="fadeup mx-auto pt-2">
      {voltar}
      <PageHeader rotulo={`${ROTULO_LINGUAGEM[ex.linguagem] ?? ex.linguagem} · ${ex.topico}`} titulo={ex.titulo} />

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        {/* Enunciado e exemplos */}
        <div className="space-y-4">
          <Card className="space-y-4 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="meta-pill meta-modulo">{ROTULO_LINGUAGEM[ex.linguagem] ?? ex.linguagem}</span>
              <PillDificuldade dificuldade={ex.dificuldade} />
            </div>
            <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed text-brand-ink" data-enunciado>
              {ex.enunciado}
            </p>
            {MODO_DICA[ex.modo] && <p className="text-xs text-faint">{MODO_DICA[ex.modo]}</p>}
          </Card>

          {ex.seedSql && (
            <Card className="p-5">
              <p className="mb-3 inline-flex items-center gap-2 font-display text-base font-bold text-brand-ink">
                <Database size={16} strokeWidth={2} aria-hidden /> Banco de partida
              </p>
              <BlocoSaida rotulo="SQL" texto={ex.seedSql} />
            </Card>
          )}

          {(ex.testesVisiveis.length > 0 || ex.testesOcultos > 0) && (
            <Card className="space-y-4 p-5">
              <p className="font-display text-base font-bold text-brand-ink">Exemplos</p>
              {ex.testesVisiveis.map((t, i) => (
                <div key={i} className="space-y-2">
                  <p className="text-xs font-semibold text-muted">{t.nome}</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <BlocoSaida rotulo="Entrada" texto={t.entrada} />
                    <BlocoSaida rotulo="Saída esperada" texto={t.saidaEsperada} />
                  </div>
                </div>
              ))}
              {ex.testesOcultos > 0 && (
                <p className="inline-flex items-center gap-1.5 text-xs text-faint">
                  <EyeOff size={13} aria-hidden />
                  Mais {ex.testesOcultos} {ex.testesOcultos === 1 ? "teste oculto" : "testes ocultos"} na correção.
                </p>
              )}
            </Card>
          )}
        </div>

        {/* Editor, execução e resultado */}
        <div className="space-y-4 lg:sticky lg:top-4">
          <Card className="overflow-hidden p-0">
            <div className="flex items-center justify-between gap-2 border-b border-hair px-4 py-2.5">
              <p className="text-xs font-bold uppercase tracking-[.12em] text-faint">Seu código</p>
              <button
                type="button"
                onClick={restaurar}
                className="tap inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-muted transition hover:text-brand-500"
              >
                <RotateCcw size={13} strokeWidth={2.2} aria-hidden /> Código inicial
              </button>
            </div>
            <div className="p-2">
              <Suspense fallback={<Skeleton className="h-[260px]" />}>
                <EditorCodigo
                  valor={codigo}
                  linguagem={ex.linguagem}
                  onChange={setCodigo}
                  onExecutar={rodar}
                  rotulo={`Editor de código ${ROTULO_LINGUAGEM[ex.linguagem] ?? ""}`}
                />
              </Suspense>
            </div>
            <div className="flex flex-wrap items-center gap-3 border-t border-hair px-4 py-3">
              <button
                type="button"
                onClick={rodar}
                disabled={ocupado || codigo.trim().length === 0}
                className="btn-primary inline-flex items-center gap-2 !px-5 !py-2.5 text-base"
              >
                {ocupado ? <Spinner tamanho={16} className="" /> : <Play size={16} strokeWidth={2.4} aria-hidden />}
                {ocupado ? "Executando…" : "Executar"}
              </button>
              {espera ? (
                <span role="status" className="text-sm font-semibold text-muted">
                  {espera}
                </span>
              ) : (
                <span className="hidden text-xs text-faint sm:inline">Ctrl + Enter também executa</span>
              )}
            </div>
          </Card>

          {estado.fase === "erro" && (
            <Card className="flex items-start gap-3 p-4">
              <AlertTriangle size={18} strokeWidth={2.2} className="mt-0.5 flex-shrink-0 text-danger-from" aria-hidden />
              <p role="alert" className="text-sm text-brand-ink">
                {estado.mensagem}
              </p>
            </Card>
          )}

          {estado.fase === "concluida" && (
            <Card className="p-4">
              <ResultadoExecucaoView key={estado.id} resultado={estado.resultado} />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

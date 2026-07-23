// Tela admin de importação de lotes de questões (upload de JSON).
// Valida, mostra prévia, trata colisão de IDs (rejeitar ou deslocar) e grava no IndexedDB.
import { useMemo, useState } from "react";
import { validarLote, type ResultadoValidacao } from "../lib/validarLote";
import {
  importarLote,
  limparTudo,
  excluirLote,
  parseIdsInput,
  type ImportarResultado,
  type ExcluirLoteResultado,
} from "../lib/questoesStore";
import { getQuestao } from "../lib/questoesRepo";
import { useQuestoes } from "../store/questoes";
import exemplo from "../data/questoes.json";

export function Importar() {
  const { total, recarregar } = useQuestoes();
  const [validacao, setValidacao] = useState<ResultadoValidacao | null>(null);
  const [nomeArquivo, setNomeArquivo] = useState("");
  const [deslocar, setDeslocar] = useState(true);
  const [resultado, setResultado] = useState<ImportarResultado | null>(null);
  const [erroLeitura, setErroLeitura] = useState<string | null>(null);
  const [gravando, setGravando] = useState(false);

  // --- excluir lote específico por IDs ---
  const [idsTexto, setIdsTexto] = useState("");
  const [excluindo, setExcluindo] = useState(false);
  const [resultadoExcluir, setResultadoExcluir] = useState<ExcluirLoteResultado | null>(null);

  const idsParaExcluir = useMemo(() => parseIdsInput(idsTexto), [idsTexto]);
  const idsExistentes = useMemo(
    () => idsParaExcluir.filter((id) => getQuestao(id)),
    [idsParaExcluir]
  );

  async function excluir() {
    if (idsExistentes.length === 0) return;
    if (!confirm(`Excluir ${idsExistentes.length} questão(ões) do app? Essa ação não tem volta (seu histórico de respostas é preservado).`)) return;
    setExcluindo(true);
    setResultadoExcluir(null);
    try {
      const r = await excluirLote(idsParaExcluir);
      setResultadoExcluir(r);
      await recarregar();
      setIdsTexto("");
    } catch {
      setErroLeitura("Falha ao excluir no servidor (sem conexão?). Tente novamente.");
    } finally {
      setExcluindo(false);
    }
  }

  function carregarJson(json: unknown, nome: string) {
    setErroLeitura(null);
    setResultado(null);
    setNomeArquivo(nome);
    setValidacao(validarLote(json));
  }

  async function onArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const texto = await file.text();
      carregarJson(JSON.parse(texto), file.name);
    } catch {
      setErroLeitura("Não consegui ler o arquivo como JSON válido.");
      setValidacao(null);
    }
  }

  async function confirmar() {
    if (!validacao?.ok) return;
    setGravando(true);
    try {
      const r = await importarLote(validacao.questoes, validacao.textosBase, {
        deslocarSeColidir: deslocar,
      });
      setResultado(r);
      if (r.ok) {
        await recarregar();
        setValidacao(null);
      }
    } catch {
      setResultado({ ok: false, colisoes: [] });
      setErroLeitura("Falha ao enviar para o servidor (sem conexão?). Tente novamente.");
    } finally {
      setGravando(false);
    }
  }

  async function limpar() {
    if (!confirm("Isso apaga TODAS as questões importadas do app (seu histórico de respostas no servidor é preservado). Continuar?")) return;
    await limparTudo();
    await recarregar();
    setResultado(null);
    setValidacao(null);
  }

  return (
    <div className="mx-auto max-w-md space-y-4 p-4">
      <header>
        <h1 className="text-xl font-bold">Importar questões 📥</h1>
        <p className="text-sm text-slate-400">{total} questões no app atualmente.</p>
      </header>

      <div className="card space-y-3 p-4">
        <label className="block text-sm font-medium">Arquivo do lote (.json)</label>
        <input
          type="file"
          accept="application/json,.json"
          onChange={onArquivo}
          className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand file:px-3 file:py-2 file:text-brand-fg"
        />
        <button
          onClick={() => carregarJson(exemplo, "dataprev_lote1.json (exemplo incluído)")}
          className="tap text-sm text-brand"
        >
          ou importar o lote de exemplo incluído
        </button>
      </div>

      {erroLeitura && <p className="card border border-erro p-3 text-sm text-erro">{erroLeitura}</p>}

      {/* prévia da validação */}
      {validacao && (
        <div className="card space-y-3 p-4 text-sm">
          <p className="font-semibold">{nomeArquivo}</p>
          <p>
            {validacao.questoes.length} questões
            {validacao.faixaIds && (
              <> · IDs {validacao.faixaIds[0]}–{validacao.faixaIds[1]}</>
            )}
          </p>

          {validacao.erros.length > 0 ? (
            <div className="space-y-1 text-erro">
              <p className="font-semibold">❌ {validacao.erros.length} erro(s) — corrija antes de importar:</p>
              <ul className="max-h-40 list-disc space-y-0.5 overflow-auto pl-5">
                {validacao.erros.slice(0, 30).map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          ) : (
            <p className="text-acerto">✓ Estrutura válida.</p>
          )}

          {validacao.avisos.length > 0 && (
            <details className="text-amber-500">
              <summary className="cursor-pointer">⚠️ {validacao.avisos.length} aviso(s)</summary>
              <ul className="mt-1 max-h-32 list-disc space-y-0.5 overflow-auto pl-5">
                {validacao.avisos.slice(0, 30).map((a, i) => <li key={i}>{a}</li>)}
              </ul>
            </details>
          )}

          {validacao.ok && (
            <>
              <label className="flex items-start gap-2">
                <input type="checkbox" checked={deslocar} onChange={(e) => setDeslocar(e.target.checked)} className="mt-1" />
                <span>
                  Deslocar IDs automaticamente se colidirem
                  <span className="block text-xs text-slate-400">
                    Recomendado se seus lotes recomeçam do 1. Renumera este lote para depois do
                    maior ID já existente (nada é sobrescrito).
                  </span>
                </span>
              </label>
              <button onClick={confirmar} disabled={gravando} className="btn-primary w-full">
                {gravando ? "Importando…" : `Importar ${validacao.questoes.length} questões`}
              </button>
            </>
          )}
        </div>
      )}

      {/* resultado da importação */}
      {resultado && (
        <div className={`card p-4 text-sm ${resultado.ok ? "border border-acerto" : "border border-erro"}`}>
          {resultado.ok ? (
            <div className="space-y-1 text-acerto">
              <p className="font-semibold">✓ {resultado.adicionadas} questões importadas!</p>
              {resultado.deslocamento != null && (
                <p className="text-slate-500">
                  IDs deslocados em +{resultado.deslocamento} (agora {resultado.faixaFinal?.[0]}–
                  {resultado.faixaFinal?.[1]}) para evitar colisão.
                </p>
              )}
              <p className="text-slate-500">Total no app: {resultado.totalAgora}.</p>
            </div>
          ) : (resultado.colisoes && resultado.colisoes.length > 0) ? (
            <div className="space-y-1 text-erro">
              <p className="font-semibold">❌ Importação recusada: {resultado.colisoes.length} ID(s) já existem.</p>
              <p className="text-slate-500">
                IDs em conflito: {resultado.colisoes.slice(0, 20).join(", ")}
                {resultado.colisoes.length > 20 ? "…" : ""}. Marque "deslocar IDs" ou renumere o lote.
              </p>
            </div>
          ) : (
            <p className="text-erro">❌ Não foi possível importar. Verifique a conexão e tente novamente.</p>
          )}
        </div>
      )}

      {/* excluir um lote específico de questões por ID */}
      {total > 0 && (
        <div className="card space-y-3 p-4">
          <div>
            <h2 className="text-sm font-semibold">Excluir questões específicas 🗑️</h2>
            <p className="text-xs text-slate-400">
              Digite os IDs separados por vírgula. Aceita intervalos, ex.: <code>1, 3, 5-10, 42</code>.
            </p>
          </div>

          <input
            type="text"
            inputMode="numeric"
            value={idsTexto}
            onChange={(e) => {
              setIdsTexto(e.target.value);
              setResultadoExcluir(null);
            }}
            placeholder="1, 3, 5-10"
            className="w-full rounded-lg border border-slate-700 bg-transparent px-3 py-2 text-sm"
          />

          {idsParaExcluir.length > 0 && (
            <p className="text-xs text-slate-400">
              {idsExistentes.length} de {idsParaExcluir.length} ID(s) existem no app.
              {idsExistentes.length < idsParaExcluir.length && (
                <span className="text-amber-500"> Os demais serão ignorados.</span>
              )}
            </p>
          )}

          <button
            onClick={excluir}
            disabled={excluindo || idsExistentes.length === 0}
            className="tap w-full rounded-xl border border-erro py-2 text-sm text-erro disabled:opacity-40"
          >
            {excluindo ? "Excluindo…" : `Excluir ${idsExistentes.length} questão(ões)`}
          </button>

          {resultadoExcluir && (
            <div className="space-y-1 text-sm text-acerto">
              <p className="font-semibold">✓ {resultadoExcluir.excluidas} questão(ões) excluída(s).</p>
              {resultadoExcluir.naoEncontradas.length > 0 && (
                <p className="text-slate-500">
                  {resultadoExcluir.naoEncontradas.length} ID(s) não existiam:{" "}
                  {resultadoExcluir.naoEncontradas.slice(0, 20).join(", ")}
                  {resultadoExcluir.naoEncontradas.length > 20 ? "…" : ""}.
                </p>
              )}
              <p className="text-slate-500">Total no app: {resultadoExcluir.totalAgora}.</p>
            </div>
          )}
        </div>
      )}

      {total > 0 && (
        <button onClick={limpar} className="tap w-full rounded-xl py-2 text-sm text-erro">
          Limpar todas as questões do app
        </button>
      )}
    </div>
  );
}

// Editor do simulado do concurso: composição (matérias, quantidade, peso), duração,
// nota de corte e se abre só aos sábados. Salva no servidor; "Restaurar padrão" volta
// ao padrão da trilha (ver lib/simuladoConfig).
import { useMemo, useState } from "react";
import { Plus, RotateCcw, Trash2 } from "lucide-react";
import { Card } from "./Card";
import { Button } from "./Button";
import { Toggle } from "./Toggle";
import { formatarPeso, totalPontos, totalQuestoes, type ConfigSimulado, type ItemSimulado } from "../lib/simuladoConfig";

const numero = "w-full rounded-lg border border-hair bg-surface px-2 py-1.5 text-right text-sm tabular-nums text-brand-ink";

export function EditorSimulado({
  config,
  personalizado,
  disponivelPorMateria,
  onSalvar,
  onRestaurar,
}: {
  config: ConfigSimulado;
  personalizado: boolean; // false = está valendo o padrão da trilha
  disponivelPorMateria: Map<string, number>;
  onSalvar: (c: ConfigSimulado) => Promise<void>;
  onRestaurar: () => Promise<void>;
}) {
  const [rascunho, setRascunho] = useState<ConfigSimulado>(config);
  const [ocupado, setOcupado] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const alterado = JSON.stringify(rascunho) !== JSON.stringify(config);

  const usadas = new Set(rascunho.itens.flatMap((i) => i.materias));
  const livres = [...disponivelPorMateria.keys()].filter((m) => !usadas.has(m)).sort((a, b) => a.localeCompare(b, "pt-BR"));
  const disponivel = (i: ItemSimulado) => i.materias.reduce((s, m) => s + (disponivelPorMateria.get(m) ?? 0), 0);
  const total = totalQuestoes(rascunho);
  const pontos = totalPontos(rascunho);
  const faltando = useMemo(() => rascunho.itens.filter((i) => i.qtd > disponivel(i)), [rascunho, disponivelPorMateria]); // eslint-disable-line react-hooks/exhaustive-deps

  const mudaItem = (k: number, parte: Partial<ItemSimulado>) =>
    setRascunho((r) => ({ ...r, itens: r.itens.map((i, j) => (j === k ? { ...i, ...parte } : i)) }));
  const tiraItem = (k: number) => setRascunho((r) => ({ ...r, itens: r.itens.filter((_, j) => j !== k) }));
  const poeItem = (materia: string) =>
    setRascunho((r) => ({
      ...r,
      itens: [...r.itens, { nome: materia, materias: [materia], qtd: Math.min(5, disponivelPorMateria.get(materia) ?? 1) || 1, peso: 1 }],
    }));

  async function salvar() {
    if (rascunho.itens.length === 0) return setMsg({ ok: false, texto: "Inclua pelo menos uma matéria." });
    setOcupado(true);
    setMsg(null);
    try {
      await onSalvar(rascunho);
      setMsg({ ok: true, texto: "Simulado salvo." });
    } catch {
      setMsg({ ok: false, texto: "Não foi possível salvar. Confira os números e tente de novo." });
    } finally {
      setOcupado(false);
    }
  }

  async function restaurar() {
    setOcupado(true);
    setMsg(null);
    try {
      await onRestaurar();
      setMsg({ ok: true, texto: "Voltou ao padrão da trilha." });
    } finally {
      setOcupado(false);
    }
  }

  return (
    <Card className="space-y-5 p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display font-extrabold text-brand-ink">Seu simulado</h2>
        <span className="text-xs text-faint">{personalizado ? "Configuração sua" : "Padrão da trilha"}</span>
      </div>

      <div>
        <div className="mb-1.5 grid grid-cols-[1fr_4.5rem_4rem_2rem] gap-2 text-[10px] font-bold uppercase tracking-[.12em] text-faint">
          <span>Matéria</span>
          <span className="text-right">Questões</span>
          <span className="text-right">Peso</span>
          <span />
        </div>
        <ul className="space-y-2">
          {rascunho.itens.map((item, k) => {
            const tem = disponivel(item);
            return (
              <li key={item.materias.join("|")} className="grid grid-cols-[1fr_4.5rem_4rem_2rem] items-center gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-brand-ink" title={item.materias.join(", ")}>
                    {item.nome}
                  </p>
                  <p className={`text-[11px] ${item.qtd > tem ? "text-[color:rgb(var(--danger-from))]" : "text-faint"}`}>
                    {tem} no banco{item.materias.length > 1 ? ` · ${item.materias.length} matérias` : ""}
                  </p>
                </div>
                <input
                  type="number"
                  min={1}
                  max={200}
                  aria-label={`Questões de ${item.nome}`}
                  value={item.qtd}
                  onChange={(e) => mudaItem(k, { qtd: Math.max(1, Math.min(200, Number(e.target.value) || 1)) })}
                  className={numero}
                />
                <input
                  type="number"
                  min={0.1}
                  max={10}
                  step={0.5}
                  aria-label={`Peso de ${item.nome}`}
                  value={item.peso}
                  onChange={(e) => mudaItem(k, { peso: Math.max(0.1, Math.min(10, Number(e.target.value) || 1)) })}
                  className={numero}
                />
                <button type="button" aria-label={`Tirar ${item.nome}`} onClick={() => tiraItem(k)} className="grid place-items-center text-faint hover:text-[color:rgb(var(--danger-from))]">
                  <Trash2 size={16} />
                </button>
              </li>
            );
          })}
        </ul>
        {livres.length > 0 && (
          <label className="mt-3 flex items-center gap-2 text-sm text-muted">
            <Plus size={16} className="text-brand-500" />
            <select
              value=""
              onChange={(e) => e.target.value && poeItem(e.target.value)}
              className="flex-1 rounded-lg border border-hair bg-surface px-2 py-1.5 text-sm text-brand-ink"
              aria-label="Adicionar matéria"
            >
              <option value="">Adicionar matéria…</option>
              {livres.map((m) => (
                <option key={m} value={m}>
                  {m} ({disponivelPorMateria.get(m)})
                </option>
              ))}
            </select>
          </label>
        )}
        <p className="mt-3 text-sm text-muted">
          Total: <strong className="text-brand-ink">{total} questões</strong> · {formatarPeso(pontos)} pontos possíveis
        </p>
        {faltando.length > 0 && (
          <p className="mt-1 text-xs text-[color:rgb(var(--danger-from))]">
            {faltando.map((i) => i.nome).join(", ")}: o banco tem menos questões do que o pedido. O simulado sai com o que houver.
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm text-muted">
          Cronômetro (minutos)
          <input
            type="number"
            min={5}
            max={600}
            value={rascunho.duracaoMin}
            onChange={(e) => setRascunho((r) => ({ ...r, duracaoMin: Math.max(5, Math.min(600, Number(e.target.value) || 5)) }))}
            className={`${numero} mt-1.5 py-2.5 text-left`}
          />
        </label>
        <label className="block text-sm text-muted">
          Nota de corte (% dos pontos)
          <input
            type="number"
            min={0}
            max={100}
            value={rascunho.notaCortePct}
            onChange={(e) => setRascunho((r) => ({ ...r, notaCortePct: Math.max(0, Math.min(100, Number(e.target.value) || 0)) }))}
            className={`${numero} mt-1.5 py-2.5 text-left`}
          />
        </label>
      </div>

      <Toggle
        checked={rascunho.soSabado}
        onChange={(v) => setRascunho((r) => ({ ...r, soSabado: v }))}
        label="Liberar só aos sábados"
        ariaLabel="Liberar o simulado só aos sábados"
      />

      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" onClick={salvar} disabled={ocupado || !alterado}>
          {ocupado ? "Salvando…" : "Salvar simulado"}
        </Button>
        {personalizado && (
          <button type="button" onClick={restaurar} disabled={ocupado} className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-brand-ink">
            <RotateCcw size={14} /> Restaurar padrão
          </button>
        )}
        {alterado && !ocupado && (
          <button type="button" onClick={() => setRascunho(config)} className="text-sm font-semibold text-faint hover:text-brand-ink">
            Desfazer mudanças
          </button>
        )}
      </div>
      {msg && (
        <p role={msg.ok ? "status" : "alert"} className={`text-sm font-semibold ${msg.ok ? "text-brand-700" : "text-[color:rgb(var(--danger-from))]"}`}>
          {msg.texto}
        </p>
      )}
    </Card>
  );
}

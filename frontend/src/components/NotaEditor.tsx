// Editor de anotação da questão. Aparece já com o textarea aberto (a visibilidade
// é controlada pelo botão "Anotar" na questão). Oculto no simulado.
import { useEffect, useState } from "react";
import { useNota } from "../hooks/useNota";

export function NotaEditor({ questaoId }: { questaoId: number }) {
  const { texto, setTexto, salvando, salvar, carregando } = useNota(questaoId);
  const [salvo, setSalvo] = useState(false);

  // reseta o aviso "salvo" ao trocar de questão
  useEffect(() => setSalvo(false), [questaoId]);

  async function handleSalvar() {
    await salvar(texto);
    setSalvo(true);
    setTimeout(() => setSalvo(false), 2000);
  }

  return (
    <div className="card p-4 text-sm space-y-2" style={{ animation: "pop .25s ease both" }}>
      <label className="block font-display font-bold text-brand-ink">📝 Sua anotação</label>
      <textarea
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value);
          setSalvo(false);
        }}
        disabled={carregando}
        rows={3}
        autoFocus
        placeholder="Sua anotação sobre esta questão…"
        className="w-full rounded-xl border border-hair bg-surface p-2 focus:outline-none focus:ring-2 focus:ring-brand-300"
      />
      <div className="flex items-center gap-3">
        <button
          onClick={handleSalvar}
          disabled={salvando || carregando}
          className="rounded-xl bg-brand-500 px-4 py-2 font-display font-bold text-white transition hover:-translate-y-0.5 disabled:opacity-50"
        >
          {salvando ? "Salvando…" : "Salvar anotação"}
        </button>
        {salvo && <span className="text-xs font-semibold text-acerto">✓ Salvo</span>}
      </div>
    </div>
  );
}

// Editor de anotação da questão (salva no blur/botão). Oculto no simulado.
import { useEffect, useState } from "react";
import { useNota } from "../hooks/useNota";

export function NotaEditor({ questaoId }: { questaoId: number }) {
  const { texto, setTexto, salvando, salvar, carregando } = useNota(questaoId);
  const [aberto, setAberto] = useState(false);

  // fecha ao trocar de questão
  useEffect(() => setAberto(false), [questaoId]);

  return (
    <div className="text-sm">
      {!aberto ? (
        <button
          onClick={() => setAberto(true)}
          className="tap rounded-lg text-brand"
          aria-expanded={false}
        >
          📝 {texto ? "Editar anotação" : "Adicionar anotação"}
        </button>
      ) : (
        <div className="space-y-2">
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            disabled={carregando}
            rows={3}
            placeholder="Sua anotação sobre esta questão…"
            className="w-full rounded-xl border border-slate-300 bg-transparent p-2 dark:border-slate-700"
          />
          <div className="flex gap-2">
            <button onClick={() => salvar(texto)} disabled={salvando} className="btn-primary text-sm">
              {salvando ? "Salvando…" : "Salvar"}
            </button>
            <button onClick={() => setAberto(false)} className="tap rounded-lg px-3 text-slate-500">
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

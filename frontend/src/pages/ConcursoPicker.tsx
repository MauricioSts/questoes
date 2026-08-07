// Tela seletora de concursos: grid de cartões (um por concurso) + cartão "Adicionar".
// Trocar de concurso muda o escopo de todo o app.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { useConcurso, type Concurso, type EstadoConcurso } from "../store/concurso";
import { criarConcurso } from "../lib/multiApi";

const BADGE: Record<EstadoConcurso, { texto: string; cls: string }> = {
  EM_CURSO: { texto: "Em curso", cls: "bg-success-soft text-success-from" },
  PAUSADO: { texto: "Pausado", cls: "bg-brand-100 text-brand-700" },
  VAZIO: { texto: "Vazio", cls: "bg-danger-soft text-danger-from" },
};

export function ConcursoPicker() {
  const { concursos, activeId, setAtivo, refresh, loading } = useConcurso();
  const navigate = useNavigate();
  const [criando, setCriando] = useState(false);

  function escolher(c: Concurso) {
    setAtivo(c.id);
    navigate("/");
  }

  return (
    <div className="fadeup space-y-6 pt-4">
      <div>
        <h1 className="font-display text-4xl font-bold text-brand-ink" style={{ fontWeight: "var(--displayWeight)" as never }}>
          Seus concursos
        </h1>
        <p className="text-muted mt-1">Escolha em qual concurso quer estudar agora.</p>
      </div>

      {loading ? (
        <p className="text-faint">Carregando…</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {concursos.map((c) => (
            <button
              key={c.id}
              onClick={() => escolher(c)}
              className={`card p-5 text-left transition hover:-translate-y-0.5 ${
                c.id === activeId ? "ring-2 ring-brand-500" : ""
              }`}
            >
              <div className="flex items-start justify-between">
                <span
                  className="grid h-14 w-14 place-items-center rounded-full border font-brand text-sm font-bold"
                  style={{ background: "var(--accentBg)", borderColor: "var(--accentBd)", color: "var(--accentText)" }}
                >
                  {c.iniciais}
                </span>
                <span className={`meta-pill ${BADGE[c.estado].cls}`}>{BADGE[c.estado].texto}</span>
              </div>
              <h2 className="mt-4 font-display text-2xl font-bold text-brand-ink leading-tight">{c.nome}</h2>
              <p className="text-sm text-faint">{c.cargo}</p>
              <div className="mt-4 flex items-center gap-4 text-sm">
                <Num n={c.respondidas} label="respondidas" />
                <span className="text-hair">·</span>
                <Num n={c.noBanco} label="no banco" />
                <span className="text-hair">·</span>
                <Num n={c.diasProva} label="dias p/ prova" />
              </div>
            </button>
          ))}

          {/* Cartão "Adicionar concurso" */}
          <button
            onClick={() => setCriando(true)}
            className="grid min-h-[210px] place-items-center rounded-2xl border-2 border-dashed border-hair p-5 text-center transition hover:border-brand-300"
          >
            <div>
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-brand-100 text-brand-600">
                <Plus size={24} strokeWidth={2} />
              </span>
              <p className="mt-3 font-display font-bold text-brand-ink">Adicionar concurso</p>
              <p className="mx-auto mt-1 max-w-[220px] text-xs text-faint">
                Começa vazio. Importe um lote ou reaproveite questões de matérias iguais.
              </p>
            </div>
          </button>
        </div>
      )}

      {criando && (
        <NovoConcursoForm
          onClose={() => setCriando(false)}
          onCriado={async (id) => {
            await refresh();
            setAtivo(id);
            setCriando(false);
            navigate("/");
          }}
        />
      )}
    </div>
  );
}

function Num({ n, label }: { n: number; label: string }) {
  return (
    <span className="flex flex-col leading-tight">
      <span className="font-display text-lg font-bold text-brand-ink">{n}</span>
      <span className="text-[11px] uppercase tracking-wide text-faint">{label}</span>
    </span>
  );
}

function NovoConcursoForm({ onClose, onCriado }: { onClose: () => void; onCriado: (id: string) => void }) {
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setSalvando(true);
    setErro(null);
    try {
      const { concurso } = await criarConcurso({
        nome: String(fd.get("nome")),
        iniciais: String(fd.get("iniciais")),
        banca: String(fd.get("banca")),
        ano: Number(fd.get("ano")),
        cargo: String(fd.get("cargo")),
        dataProva: String(fd.get("dataProva")),
        metaDiaria: Number(fd.get("metaDiaria")) || 30,
      });
      onCriado(concurso.id);
    } catch {
      setErro("Não foi possível criar. Confira os campos.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="card w-full max-w-md space-y-3 p-6"
      >
        <h2 className="font-display text-2xl font-bold text-brand-ink">Novo concurso</h2>
        <Campo name="nome" label="Nome" placeholder="Banco do Brasil" required />
        <div className="grid grid-cols-2 gap-3">
          <Campo name="iniciais" label="Iniciais" placeholder="BB" required />
          <Campo name="banca" label="Banca" placeholder="CESGRANRIO" required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Campo name="ano" label="Ano" type="number" placeholder="2026" required />
          <Campo name="metaDiaria" label="Meta diária" type="number" placeholder="30" />
        </div>
        <Campo name="cargo" label="Cargo" placeholder="Escriturário" required />
        <Campo name="dataProva" label="Data da prova" type="date" required />
        {erro && <p className="text-sm text-danger-from">{erro}</p>}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="text-sm font-semibold text-muted hover:text-brand-ink">
            Cancelar
          </button>
          <button type="submit" disabled={salvando} className="btn-primary text-base disabled:opacity-60">
            {salvando ? "Criando…" : "Criar concurso"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Campo({
  name,
  label,
  type = "text",
  placeholder,
  required,
}: {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="filter-label">{label}</span>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        className="filter-select"
      />
    </label>
  );
}

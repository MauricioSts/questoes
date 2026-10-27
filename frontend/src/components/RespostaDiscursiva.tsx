// Entrega de uma discursiva: a foto da folha escrita à mão (o treino de verdade, como na
// prova) ou o texto digitado, com a contagem de linhas da folha. A nota é a autoavaliação
// do próprio usuário e pode vir agora ou depois, no histórico. Usado na tela Discursiva e
// no fim do simulado.
import { useEffect, useRef, useState } from "react";
import { Camera, Keyboard, X } from "lucide-react";
import { ApiError } from "../lib/api";
import {
  comprimirFoto,
  contarLinhas,
  entregarResposta,
  type Discursiva,
  type OrigemTentativa,
  type TentativaDiscursiva,
} from "../lib/discursiva";
import { formatarPeso } from "../lib/simuladoConfig";
import { Button } from "./Button";

type Modo = "foto" | "texto";
const MAX_FOTOS = 6;

// Rascunho por tema no aparelho: sair da tela (ou F5) não apaga o que foi escrito.
const chaveRascunho = (id: string) => `q_discursiva_${id}`;
function lerRascunho(id: string): string {
  try {
    return localStorage.getItem(chaveRascunho(id)) ?? "";
  } catch {
    return "";
  }
}
function gravarRascunho(id: string, texto: string) {
  try {
    if (texto) localStorage.setItem(chaveRascunho(id), texto);
    else localStorage.removeItem(chaveRascunho(id));
  } catch {
    /* sem armazenamento: segue sem rascunho */
  }
}

// Nota de 0 até o valor da questão; vazio = sem nota.
export function lerNota(bruto: string, valor: number): number | null | "invalida" {
  if (bruto.trim() === "") return null;
  const n = Number(bruto.replace(",", "."));
  if (!Number.isFinite(n) || n < 0 || n > valor) return "invalida";
  return n;
}

interface FotoLocal {
  url: string; // object URL para a prévia
  blob: Blob;
}

export function RespostaDiscursiva({
  discursiva: d,
  origem = "TREINO",
  onEntregue,
}: {
  discursiva: Discursiva;
  origem?: OrigemTentativa;
  onEntregue: (t: TentativaDiscursiva, padraoResposta: string | null) => void;
}) {
  const rascunho = lerRascunho(d.id);
  const [modo, setModo] = useState<Modo>(rascunho ? "texto" : "foto");
  const [texto, setTexto] = useState(rascunho);
  const [fotos, setFotos] = useState<FotoLocal[]>([]);
  const [preparando, setPreparando] = useState(false);
  const [nota, setNota] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Libera as prévias ao sair.
  const fotosRef = useRef(fotos);
  fotosRef.current = fotos;
  useEffect(() => () => fotosRef.current.forEach((f) => URL.revokeObjectURL(f.url)), []);

  const linhas = contarLinhas(texto, d.caracteresPorLinha);
  const passou = linhas > d.maxLinhas;
  const notaLida = lerNota(nota, d.valor);
  const temResposta = modo === "foto" ? fotos.length > 0 : !!texto.trim() && !passou;

  async function adicionar(lista: FileList | null) {
    if (!lista?.length) return;
    setPreparando(true);
    setErro(null);
    const novas: FotoLocal[] = [];
    for (const arq of Array.from(lista).slice(0, MAX_FOTOS - fotos.length)) {
      const blob = await comprimirFoto(arq);
      novas.push({ blob, url: URL.createObjectURL(blob) });
    }
    setFotos((l) => [...l, ...novas]);
    setPreparando(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  function remover(i: number) {
    setFotos((l) => {
      URL.revokeObjectURL(l[i].url);
      return l.filter((_, j) => j !== i);
    });
  }

  async function enviar() {
    if (!temResposta || notaLida === "invalida") return;
    setEnviando(true);
    setErro(null);
    try {
      const r = await entregarResposta(d.id, {
        texto: modo === "texto" ? texto : "",
        nota: notaLida ?? undefined,
        fotos: modo === "foto" ? fotos.map((f) => f.blob) : [],
        origem,
      });
      if (modo === "texto") {
        setTexto("");
        gravarRascunho(d.id, "");
      } else {
        fotos.forEach((f) => URL.revokeObjectURL(f.url));
        setFotos([]);
      }
      setNota("");
      onEntregue(r.tentativa, r.padraoResposta);
    } catch (e) {
      setErro(
        e instanceof ApiError
          ? e.message
          : modo === "texto"
            ? "Não deu para enviar agora. O rascunho continua salvo."
            : "Não deu para enviar agora. As fotos continuam aqui; tente de novo."
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2" role="tablist" aria-label="Como responder">
        {([
          ["foto", "Foto da folha", Camera],
          ["texto", "Digitar", Keyboard],
        ] as const).map(([val, rotulo, Icone]) => (
          <button
            key={val}
            role="tab"
            aria-selected={modo === val}
            onClick={() => setModo(val)}
            className={`tap inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
              modo === val ? "border-brand-500 text-brand-ink" : "border-hair text-muted hover:text-brand-ink"
            }`}
          >
            <Icone size={15} strokeWidth={2.2} /> {rotulo}
          </button>
        ))}
      </div>

      {modo === "foto" ? (
        <div className="space-y-3">
          <p className="text-sm text-muted">
            Escreva à mão em até {d.maxLinhas} linhas, sem consulta, e fotografe a folha. Pode mandar até {MAX_FOTOS} fotos.
          </p>
          {fotos.length > 0 && (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {fotos.map((f, i) => (
                <li key={f.url} className="relative overflow-hidden rounded-xl border border-hair">
                  <img src={f.url} alt={`Foto ${i + 1} da folha`} className="block aspect-[3/4] w-full object-cover" />
                  <button
                    onClick={() => remover(i)}
                    aria-label={`Tirar a foto ${i + 1}`}
                    className="absolute right-1.5 top-1.5 rounded-full p-1 text-white"
                    style={{ background: "rgba(0,0,0,.6)" }}
                  >
                    <X size={14} strokeWidth={2.5} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {fotos.length < MAX_FOTOS && (
            <label className="tap flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-hair p-5 text-sm font-semibold text-muted hover:text-brand-ink">
              <Camera size={18} strokeWidth={2} />
              {preparando ? "Preparando…" : fotos.length ? "Adicionar outra foto" : "Tirar ou escolher foto"}
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                onChange={(e) => adicionar(e.target.files)}
              />
            </label>
          )}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <textarea
              value={texto}
              onChange={(e) => {
                setTexto(e.target.value);
                gravarRascunho(d.id, e.target.value);
              }}
              rows={Math.min(d.maxLinhas, 18)}
              spellCheck
              aria-label="Sua resposta"
              placeholder="Escreva sua resposta…"
              // Largura de caracteresPorLinha colunas: a quebra na tela fica perto da da folha.
              style={{ width: `calc(${d.caracteresPorLinha}ch + 1.5rem)`, maxWidth: "100%" }}
              className="block resize-y rounded-xl border border-hair bg-surface p-3 font-mono text-sm leading-relaxed text-brand-ink outline-none focus:border-brand-300"
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <span className="tabular-nums" style={{ color: passou ? "var(--accentText)" : undefined }}>
              <b className={passou ? "" : "text-brand-ink"}>{linhas}</b>
              <span className={passou ? "" : "text-muted"}> / {d.maxLinhas} linhas</span>
              {passou && " · passou do limite"}
            </span>
            <span className="text-xs text-faint">{d.caracteresPorLinha} caracteres por linha</span>
          </div>
        </>
      )}

      <label className="flex flex-wrap items-center gap-3 text-sm text-muted">
        Sua nota (autoavaliação)
        <input
          type="text"
          inputMode="decimal"
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          placeholder="—"
          className="filter-select !w-24"
        />
        <span>de {formatarPeso(d.valor)}</span>
      </label>
      {notaLida === "invalida" && (
        <p className="text-xs" style={{ color: "var(--accentText)" }}>
          A nota vai de 0 a {formatarPeso(d.valor)}.
        </p>
      )}
      {erro && (
        <p className="rounded-xl border p-3 text-sm" style={{ borderColor: "var(--accentBd)", background: "var(--accentBg)", color: "var(--accentText)" }}>
          {erro}
        </p>
      )}
      <Button onClick={enviar} disabled={enviando || preparando || !temResposta || notaLida === "invalida"} fullWidth>
        {enviando ? "Enviando…" : modo === "foto" ? "Enviar foto da folha" : "Enviar tentativa"}
      </Button>
      <p className="text-xs text-faint">Pode dar a nota agora ou depois da correção, no histórico.</p>
    </div>
  );
}

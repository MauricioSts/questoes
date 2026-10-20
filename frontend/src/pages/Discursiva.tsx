// Prova discursiva da trilha ativa: os temas cadastrados, um editor que conta as linhas
// como a folha de resposta (quebra a cada caracteresPorLinha, respeitando o Enter) e a
// autoavaliação — a nota é o próprio usuário que dá, olhando o padrão de resposta, que
// só abre depois da primeira tentativa. As regras (linhas, pontos, quem é corrigido)
// vêm do perfil da prova; a tela só aparece na navegação quando o perfil tem discursiva.
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ChevronRight, PenLine, RefreshCw } from "lucide-react";
import { useConcurso } from "../store/concurso";
import { usePerfilProva } from "../hooks/usePerfilProva";
import { ApiError } from "../lib/api";
import {
  contarLinhas,
  darNota,
  enviarTentativa,
  listarDiscursivas,
  listarTentativas,
  type Discursiva as DiscursivaT,
  type TentativaDiscursiva,
} from "../lib/discursiva";
import { formatarPeso } from "../lib/simuladoConfig";
import type { PerfilProva } from "../lib/notaCE";
import { PageHeader } from "../components/PageHeader";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { Carregando } from "../components/Spinner";

type RegrasDiscursiva = NonNullable<PerfilProva["discursiva"]>;

function textoRegras(r: RegrasDiscursiva): string {
  const partes = [`${r.max_linhas} linhas`, `${formatarPeso(r.valor)} pontos`];
  if (r.corrigidas_top) partes.push(`corrigida só para os ${r.corrigidas_top} melhores na objetiva`);
  return partes.join(" · ");
}

export function Discursiva() {
  const { ativo } = useConcurso();
  const perfil = usePerfilProva();
  const trilhaId = ativo?.trilhaId ?? null;
  const regras = perfil?.dados.discursiva;
  const [lista, setLista] = useState<DiscursivaT[] | null>(null);
  const [erro, setErro] = useState(false);
  const [abertaId, setAbertaId] = useState<string | null>(null);

  const carregar = useCallback(() => {
    if (!trilhaId) {
      setLista([]);
      return () => {};
    }
    let vivo = true;
    setErro(false);
    listarDiscursivas(trilhaId)
      .then((l) => vivo && setLista(l))
      .catch((e) => {
        if (!vivo) return;
        // 404: servidor ainda sem as discursivas; para quem usa, é o mesmo que nenhuma.
        if (e instanceof ApiError && e.status === 404) setLista([]);
        else {
          setErro(true);
          setLista([]);
        }
      });
    return () => {
      vivo = false;
    };
  }, [trilhaId]);

  useEffect(() => {
    setLista(null);
    setAbertaId(null);
    return carregar();
  }, [carregar]);

  if (perfil === undefined || lista === null) return <Carregando />;

  const aberta = lista.find((d) => d.id === abertaId);
  if (aberta) {
    return <EditorDiscursiva discursiva={aberta} onVoltar={() => setAbertaId(null)} onEnviada={carregar} />;
  }

  return (
    <div className="fadeup mx-auto max-w-[820px] pt-2">
      <PageHeader
        rotulo="Prova discursiva"
        titulo="Discursiva"
        subtitulo={
          regras
            ? `Escreva como na folha de resposta e dê sua nota pelo padrão de resposta. ${textoRegras(regras)}.`
            : "Escreva como na folha de resposta e dê sua nota pelo padrão de resposta."
        }
      />

      {!regras ? (
        <Card className="p-6 text-sm text-muted">A prova da trilha ativa não tem etapa discursiva.</Card>
      ) : erro ? (
        <Card className="flex flex-wrap items-center justify-between gap-3 p-6">
          <p className="text-sm text-muted">Não deu para carregar as discursivas agora.</p>
          <button onClick={carregar} className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-500">
            <RefreshCw size={14} strokeWidth={2.2} /> Tentar de novo
          </button>
        </Card>
      ) : lista.length === 0 ? (
        <Card className="space-y-3 p-6">
          <div className="flex items-center gap-3">
            <PenLine size={20} strokeWidth={2} style={{ color: "var(--accent)" }} />
            <h2 className="font-display font-extrabold text-brand-ink">Nenhuma discursiva cadastrada ainda</h2>
          </div>
          <p className="text-sm text-muted">Os temas entram aqui assim que forem cadastrados. Como vai ser a prova:</p>
          <ul className="space-y-1.5 text-sm text-muted">
            <li>
              <b className="text-brand-ink">{regras.questoes}</b> {regras.questoes === 1 ? "questão" : "questões"} de até{" "}
              <b className="text-brand-ink">{regras.max_linhas} linhas</b> ({regras.caracteres_por_linha} caracteres por linha)
            </li>
            <li>
              Vale <b className="text-brand-ink">{formatarPeso(regras.valor)} pontos</b>
            </li>
            {regras.corrigidas_top != null && (
              <li>
                Corrigida só para os <b className="text-brand-ink">{regras.corrigidas_top} melhores</b> na objetiva
              </li>
            )}
          </ul>
        </Card>
      ) : (
        <ul className="space-y-3">
          {lista.map((d, i) => (
            <li key={d.id}>
              <button onClick={() => setAbertaId(d.id)} className="card card-hover flex w-full items-center gap-4 p-5 text-left">
                <span className="font-display text-lg font-bold text-faint tabular-nums">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm text-brand-ink">{d.enunciado}</p>
                  <p className="mt-1 text-xs text-faint">
                    {d.maxLinhas} linhas · {formatarPeso(d.valor)} pontos
                    {d.padraoResposta != null && " · já tentada"}
                  </p>
                </div>
                <ChevronRight size={18} className="flex-shrink-0 text-faint" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

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
function lerNota(bruto: string, valor: number): number | null | "invalida" {
  if (bruto.trim() === "") return null;
  const n = Number(bruto.replace(",", "."));
  if (!Number.isFinite(n) || n < 0 || n > valor) return "invalida";
  return n;
}

function EditorDiscursiva({
  discursiva: d,
  onVoltar,
  onEnviada,
}: {
  discursiva: DiscursivaT;
  onVoltar: () => void;
  onEnviada: () => void;
}) {
  const [texto, setTexto] = useState(() => lerRascunho(d.id));
  const [nota, setNota] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [tentativas, setTentativas] = useState<TentativaDiscursiva[] | null>(null);

  useEffect(() => {
    let vivo = true;
    listarTentativas(d.id)
      .then((t) => vivo && setTentativas(t))
      .catch(() => vivo && setTentativas([]));
    return () => {
      vivo = false;
    };
  }, [d.id]);

  const linhas = contarLinhas(texto, d.caracteresPorLinha);
  const passou = linhas > d.maxLinhas;
  const notaLida = lerNota(nota, d.valor);

  async function enviar() {
    if (!texto.trim() || passou || notaLida === "invalida") return;
    setEnviando(true);
    setErro(null);
    try {
      const t = await enviarTentativa(d.id, texto, notaLida ?? undefined);
      setTentativas((l) => [t, ...(l ?? [])]);
      setTexto("");
      setNota("");
      gravarRascunho(d.id, "");
      onEnviada(); // recarrega a lista: o padrão de resposta abre depois da 1ª tentativa
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não deu para enviar agora. O rascunho continua salvo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="fadeup mx-auto max-w-[820px] space-y-5 pt-2">
      <button onClick={onVoltar} className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-brand-ink">
        <ArrowLeft size={15} strokeWidth={2.2} /> Discursivas
      </button>

      <Card className="space-y-2 p-6">
        <p className="text-[11px] font-bold uppercase tracking-[.14em] text-faint">
          Vale {formatarPeso(d.valor)} pontos · até {d.maxLinhas} linhas
        </p>
        <p className="whitespace-pre-line text-brand-ink">{d.enunciado}</p>
      </Card>

      <Card className="space-y-4 p-6">
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

        <label className="flex flex-wrap items-center gap-3 text-sm text-muted">
          Sua nota (autoavaliação)
          <input
            type="number"
            inputMode="decimal"
            min={0}
            max={d.valor}
            step={0.5}
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
        <Button onClick={enviar} disabled={enviando || !texto.trim() || passou || notaLida === "invalida"} fullWidth>
          {enviando ? "Enviando…" : "Enviar tentativa"}
        </Button>
        <p className="text-xs text-faint">
          Pode dar a nota agora ou depois de ler o padrão de resposta, no histórico.
        </p>
      </Card>

      {d.padraoResposta != null && (
        <Card className="space-y-2 p-6">
          <p className="text-[11px] font-bold uppercase tracking-[.14em] text-faint">Padrão de resposta</p>
          <p className="whitespace-pre-line text-sm leading-relaxed text-brand-ink">{d.padraoResposta}</p>
        </Card>
      )}

      <div className="space-y-3">
        <p className="text-[11px] font-bold uppercase tracking-[.14em] text-faint">Suas tentativas</p>
        {tentativas === null ? (
          <Carregando className="py-4" />
        ) : tentativas.length === 0 ? (
          <p className="text-sm text-muted">Nenhuma ainda. O padrão de resposta abre depois da primeira.</p>
        ) : (
          <ul className="space-y-3">
            {tentativas.map((t) => (
              <ItemTentativa
                key={t.id}
                tentativa={t}
                discursiva={d}
                onNota={(nova) => setTentativas((l) => l?.map((x) => (x.id === nova.id ? nova : x)) ?? null)}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ItemTentativa({
  tentativa: t,
  discursiva: d,
  onNota,
}: {
  tentativa: TentativaDiscursiva;
  discursiva: DiscursivaT;
  onNota: (t: TentativaDiscursiva) => void;
}) {
  const [nota, setNota] = useState(t.nota == null ? "" : String(t.nota));
  const [salvando, setSalvando] = useState(false);
  const [falhou, setFalhou] = useState(false);
  const lida = lerNota(nota, d.valor);
  const mudou = typeof lida === "number" && lida !== t.nota;

  async function salvar() {
    if (typeof lida !== "number") return;
    setSalvando(true);
    setFalhou(false);
    try {
      onNota(await darNota(t.id, lida));
    } catch {
      setFalhou(true);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <li>
      <Card className="space-y-3 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-faint">
            {new Date(t.createdAt).toLocaleString("pt-BR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
            {" · "}
            {contarLinhas(t.texto, d.caracteresPorLinha)} linhas
          </span>
          <span className="flex items-center gap-2 text-sm text-muted">
            <input
              type="number"
              inputMode="decimal"
              min={0}
              max={d.valor}
              step={0.5}
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="—"
              aria-label="Nota desta tentativa"
              className="filter-select !w-20"
            />
            / {formatarPeso(d.valor)}
            {mudou && (
              <button onClick={salvar} disabled={salvando} className="text-sm font-semibold text-brand-500 disabled:opacity-50">
                {salvando ? "Salvando…" : "Salvar"}
              </button>
            )}
          </span>
        </div>
        {(lida === "invalida" || falhou) && (
          <p className="text-xs" style={{ color: "var(--accentText)" }}>
            {falhou ? "Não deu para salvar a nota." : `A nota vai de 0 a ${formatarPeso(d.valor)}.`}
          </p>
        )}
        <details>
          <summary className="cursor-pointer text-sm font-semibold text-muted hover:text-brand-ink">Ver texto</summary>
          <p className="mt-2 whitespace-pre-wrap break-words font-mono text-sm leading-relaxed text-brand-ink">{t.texto}</p>
        </details>
      </Card>
    </li>
  );
}

// Prova discursiva da trilha ativa: os temas cadastrados, um editor que conta as linhas
// como a folha de resposta (quebra a cada caracteresPorLinha, respeitando o Enter) e a
// autoavaliação — a nota é o próprio usuário que dá, olhando o padrão de resposta, que
// só abre depois da primeira tentativa. As regras (linhas, pontos, quem é corrigido)
// vêm do perfil da prova; a tela só aparece na navegação quando o perfil tem discursiva.
// Os temas de lote abrem um por terça; o próximo da fila aparece fechado, para adiantar.
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, CalendarClock, ChevronRight, PenLine, RefreshCw, Trash2 } from "lucide-react";
import { useConcurso } from "../store/concurso";
import { usePerfilProva } from "../hooks/usePerfilProva";
import { ApiError } from "../lib/api";
import {
  apagarTentativa,
  buscarDiscursiva,
  contarLinhas,
  darNota,
  listarDiscursivas,
  listarTentativas,
  type Discursiva as DiscursivaT,
  type ListaDiscursivas,
  type TentativaDiscursiva,
} from "../lib/discursiva";
import { formatarPeso } from "../lib/simuladoConfig";
import type { PerfilProva } from "../lib/notaCE";
import { PageHeader } from "../components/PageHeader";
import { Card } from "../components/Card";
import { Carregando } from "../components/Spinner";
import { RespostaDiscursiva, lerNota } from "../components/RespostaDiscursiva";
import { FotoDiscursiva } from "../components/FotoDiscursiva";

type RegrasDiscursiva = NonNullable<PerfilProva["discursiva"]>;

function textoRegras(r: RegrasDiscursiva): string {
  const partes = [`${r.max_linhas} linhas`, `${formatarPeso(r.valor)} pontos`];
  if (r.corrigidas_top) partes.push(`corrigida só para os ${r.corrigidas_top} melhores na objetiva`);
  return partes.join(" · ");
}

// "terça, 3 de nov."
const diaDaLiberacao = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "short" });

export function Discursiva() {
  const { ativo } = useConcurso();
  const perfil = usePerfilProva();
  const trilhaId = ativo?.trilhaId ?? null;
  const regras = perfil?.dados.discursiva;
  const [dados, setDados] = useState<ListaDiscursivas | null>(null);
  const [erro, setErro] = useState(false);
  const [abertaId, setAbertaId] = useState<string | null>(null);
  // Tema adiantado: ainda não está na lista (abre na terça), veio pelo GET /:id.
  const [adiantada, setAdiantada] = useState<DiscursivaT | null>(null);
  const [adiantando, setAdiantando] = useState(false);
  const vazio: ListaDiscursivas = { discursivas: [], proxima: null, restantes: 0 };

  const carregar = useCallback(() => {
    if (!trilhaId) {
      setDados(vazio);
      return () => {};
    }
    let vivo = true;
    setErro(false);
    listarDiscursivas(trilhaId)
      .then((l) => vivo && setDados(l))
      .catch((e) => {
        if (!vivo) return;
        // 404: servidor ainda sem as discursivas; para quem usa, é o mesmo que nenhuma.
        if (e instanceof ApiError && e.status === 404) setDados(vazio);
        else {
          setErro(true);
          setDados(vazio);
        }
      });
    return () => {
      vivo = false;
    };
  }, [trilhaId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setDados(null);
    setAbertaId(null);
    setAdiantada(null);
    return carregar();
  }, [carregar]);

  async function adiantar(id: string) {
    setAdiantando(true);
    try {
      setAdiantada(await buscarDiscursiva(id));
      setAbertaId(id);
    } catch {
      setErro(true);
    } finally {
      setAdiantando(false);
    }
  }

  if (perfil === undefined || dados === null) return <Carregando />;
  const lista = dados.discursivas;

  const aberta = lista.find((d) => d.id === abertaId) ?? (adiantada?.id === abertaId ? adiantada : undefined);
  if (aberta) {
    return (
      <EditorDiscursiva
        discursiva={aberta}
        onVoltar={() => {
          setAbertaId(null);
          setAdiantada(null);
        }}
        onEnviada={carregar}
      />
    );
  }

  const cartaoProxima = dados.proxima && (
    <Card className="flex flex-wrap items-center gap-4 p-5">
      <CalendarClock size={20} className="flex-shrink-0 text-faint" strokeWidth={2} />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-brand-ink">
          Próxima: <b>{dados.proxima.titulo ?? "novo tema"}</b>
        </p>
        <p className="mt-0.5 text-xs text-faint">
          Abre {diaDaLiberacao(dados.proxima.liberaEm)}
          {dados.restantes > 0 && ` · mais ${dados.restantes} na fila`}
        </p>
      </div>
      <button
        onClick={() => adiantar(dados.proxima!.id)}
        disabled={adiantando}
        className="text-sm font-semibold text-brand-500 disabled:opacity-50"
      >
        {adiantando ? "Abrindo…" : "Adiantar"}
      </button>
    </Card>
  );

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
      ) : lista.length === 0 && dados.proxima ? (
        cartaoProxima
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
        <div className="space-y-3">
        {cartaoProxima}
        <ul className="space-y-3">
          {[...lista].reverse().map((d) => (
            <li key={d.id}>
              <button onClick={() => setAbertaId(d.id)} className="card card-hover flex w-full items-center gap-4 p-5 text-left">
                <span className="font-display text-lg font-bold text-faint tabular-nums">{lista.indexOf(d) + 1}</span>
                <div className="min-w-0 flex-1">
                  {d.titulo && <p className="font-display font-bold text-brand-ink">{d.titulo}</p>}
                  <p className={`line-clamp-2 text-sm ${d.titulo ? "text-muted" : "text-brand-ink"}`}>{d.enunciado}</p>
                  <p className="mt-1 text-xs text-faint">
                    {d.maxLinhas} linhas · {formatarPeso(d.valor)} pontos
                    {(d.tentativas ?? 0) > 0
                      ? ` · ${d.tentativas} ${d.tentativas === 1 ? "tentativa" : "tentativas"}`
                      : d.padraoResposta != null && " · já tentada"}
                  </p>
                </div>
                <ChevronRight size={18} className="flex-shrink-0 text-faint" />
              </button>
            </li>
          ))}
        </ul>
        </div>
      )}
    </div>
  );
}

export function EditorDiscursiva({
  discursiva: d,
  onVoltar,
  onEnviada,
}: {
  discursiva: DiscursivaT;
  onVoltar: () => void;
  onEnviada: () => void;
}) {
  const [tentativas, setTentativas] = useState<TentativaDiscursiva[] | null>(null);
  // Padrão de resposta: vem na lista, nas tentativas e na resposta do envio.
  const [padrao, setPadrao] = useState<string | null>(d.padraoResposta);

  useEffect(() => {
    let vivo = true;
    listarTentativas(d.id)
      .then((r) => {
        if (!vivo) return;
        setTentativas(r.tentativas);
        if (r.padraoResposta != null) setPadrao(r.padraoResposta);
      })
      .catch(() => vivo && setTentativas([]));
    return () => {
      vivo = false;
    };
  }, [d.id]);

  return (
    <div className="fadeup mx-auto max-w-[820px] space-y-5 pt-2">
      <button onClick={onVoltar} className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-brand-ink">
        <ArrowLeft size={15} strokeWidth={2.2} /> Discursivas
      </button>

      <Card className="space-y-2 p-6">
        <p className="text-[11px] font-bold uppercase tracking-[.14em] text-faint">
          Vale {formatarPeso(d.valor)} pontos · até {d.maxLinhas} linhas
        </p>
        {d.titulo && <h2 className="font-display text-lg font-extrabold text-brand-ink">{d.titulo}</h2>}
        <p className="whitespace-pre-line text-brand-ink">{d.enunciado}</p>
      </Card>

      <Card className="p-6">
        <RespostaDiscursiva
          discursiva={d}
          onEntregue={(t, padraoResposta) => {
            setTentativas((l) => [t, ...(l ?? [])]);
            if (padraoResposta != null) setPadrao(padraoResposta);
            onEnviada(); // recarrega a lista: contagem de tentativas
          }}
        />
      </Card>

      {d.temPadrao === false && (tentativas?.length ?? 0) > 0 && (
        <Card className="p-5 text-sm text-muted">
          Este tema não tem padrão de resposta: mande a foto (ou o texto) para correção e lance a nota no histórico.
        </Card>
      )}

      {padrao != null && (
        <Card className="space-y-2 p-6">
          <p className="text-[11px] font-bold uppercase tracking-[.14em] text-faint">Padrão de resposta</p>
          <p className="whitespace-pre-line text-sm leading-relaxed text-brand-ink">{padrao}</p>
        </Card>
      )}

      <div className="space-y-3">
        <p className="text-[11px] font-bold uppercase tracking-[.14em] text-faint">Suas tentativas</p>
        {tentativas === null ? (
          <Carregando className="py-4" />
        ) : tentativas.length === 0 ? (
          <p className="text-sm text-muted">
            {d.temPadrao === false ? "Nenhuma ainda." : "Nenhuma ainda. O padrão de resposta abre depois da primeira."}
          </p>
        ) : (
          <ul className="space-y-3">
            {tentativas.map((t) => (
              <ItemTentativa
                key={t.id}
                tentativa={t}
                discursiva={d}
                onNota={(nova) => setTentativas((l) => l?.map((x) => (x.id === nova.id ? { ...x, ...nova } : x)) ?? null)}
                onApagada={() => {
                  setTentativas((l) => l?.filter((x) => x.id !== t.id) ?? null);
                  onEnviada();
                }}
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
  onApagada,
}: {
  tentativa: TentativaDiscursiva;
  discursiva: DiscursivaT;
  onNota: (t: TentativaDiscursiva) => void;
  onApagada: () => void;
}) {
  const [apagando, setApagando] = useState(false);
  const fotos = t.fotos ?? [];

  async function apagar() {
    if (!window.confirm("Apagar esta tentativa (e as fotos dela)?")) return;
    setApagando(true);
    try {
      await apagarTentativa(t.id);
      onApagada();
    } catch {
      setApagando(false);
    }
  }
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
            {t.texto.trim()
              ? `${t.linhas ?? contarLinhas(t.texto, d.caracteresPorLinha)} linhas`
              : `${fotos.length} ${fotos.length === 1 ? "foto" : "fotos"}`}
            {t.origem === "SIMULADO" && " · simulado"}
          </span>
          <span className="flex items-center gap-2 text-sm text-muted">
            <input
              type="text"
              inputMode="decimal"
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
        {fotos.length > 0 && (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {fotos.map((id, i) => (
              <li key={id}>
                <FotoDiscursiva id={id} rotulo={`Foto ${i + 1} da folha`} />
              </li>
            ))}
          </ul>
        )}
        {t.texto.trim() && (
          <details>
            <summary className="cursor-pointer text-sm font-semibold text-muted hover:text-brand-ink">Ver texto</summary>
            <p className="mt-2 whitespace-pre-wrap break-words font-mono text-sm leading-relaxed text-brand-ink">{t.texto}</p>
          </details>
        )}
        <button
          onClick={apagar}
          disabled={apagando}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-faint hover:text-brand-ink disabled:opacity-50"
        >
          <Trash2 size={13} strokeWidth={2.2} /> {apagando ? "Apagando…" : "Apagar tentativa"}
        </button>
      </Card>
    </li>
  );
}

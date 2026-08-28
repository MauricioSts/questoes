// Editor de uma página do Caderno (cabeçalho de status + título + EditorRico).
//
// Vive aqui, e não dentro da página do Caderno, porque duas telas usam o mesmo
// editor: o Caderno em si e o painel que abre ao lado da questão
// (CadernoDrawer) para anotar sem sair da questão.
//
// O salvamento é por debounce (800ms parado) e, além disso, é forçado ao trocar de
// página, ao esconder a aba e ao sair — antes o conteúdo dependia só do timer, e
// tudo que fosse digitado nos últimos instantes se perdia.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { EditorRico } from "./EditorRico";
import { htmlParaTexto, sanitizeHtml, textoParaHtml } from "../lib/sanitizeHtml";
import { salvarPagina, type PaginaCaderno } from "../lib/multiApi";

function tempoRelativo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  return `há ${Math.floor(h / 24)} d`;
}

type EstadoSalvamento = "salvo" | "pendente" | "salvando" | "erro";

const ROTULO: Record<EstadoSalvamento, string> = {
  salvo: "Salvo",
  pendente: "Alterações não salvas",
  salvando: "Salvando…",
  erro: "Falha ao salvar — tentando de novo",
};

interface Props {
  pagina: PaginaCaderno;
  materias: string[];
  onSalvo: (p: PaginaCaderno) => void;
  onExcluir?: () => void;
  // No painel lateral não há espaço para cartão alto nem para a contagem de palavras.
  compacto?: boolean;
}

export function EditorPagina({ pagina, materias, onSalvo, onExcluir, compacto = false }: Props) {
  // Páginas antigas foram gravadas como texto puro: viram parágrafos ao abrir e,
  // no primeiro salvamento, passam a ser html.
  const htmlInicial = useMemo(
    () => (pagina.formato === "texto" ? textoParaHtml(pagina.conteudo) : pagina.conteudo),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pagina.id]
  );

  const [titulo, setTitulo] = useState(pagina.titulo);
  const [materia, setMateria] = useState(pagina.materia);
  const [editadoEm, setEditadoEm] = useState(pagina.updatedAt);
  const [estado, setEstado] = useState<EstadoSalvamento>("salvo");
  const [contagem, setContagem] = useState(() => contar(htmlParaTexto(htmlInicial)));

  // O que será enviado vive em refs: o corpo do documento não é estado de React
  // (ele mora no DOM do editor), e o salvamento precisa poder ler o valor atual
  // de dentro de um timer ou de um cleanup de unmount.
  const dados = useRef({ titulo: pagina.titulo, conteudo: htmlInicial, materia: pagina.materia });
  const sujo = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const salvar = useCallback(async () => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    if (!sujo.current) return;
    sujo.current = false;
    setEstado("salvando");
    try {
      const { pagina: salva } = await salvarPagina(pagina.id, {
        titulo: dados.current.titulo.slice(0, 200),
        conteudo: sanitizeHtml(dados.current.conteudo),
        materia: dados.current.materia,
        formato: "html",
      });
      setEditadoEm(salva.updatedAt);
      setEstado(sujo.current ? "pendente" : "salvo");
      onSalvo(salva);
    } catch {
      // Devolve a marca de sujo: o próximo debounce (ou a saída da página) tenta de novo.
      sujo.current = true;
      setEstado("erro");
    }
  }, [pagina.id, onSalvo]);

  const agendar = useCallback(() => {
    sujo.current = true;
    setEstado("pendente");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setContagem(contar(htmlParaTexto(dados.current.conteudo)));
      void salvar();
    }, 800);
  }, [salvar]);

  // Salvamento forçado: ao desmontar (trocar de página), ao esconder a aba e ao
  // fechar/atualizar o navegador. Sem isto, os últimos 800ms digitados sumiam.
  const salvarRef = useRef(salvar);
  salvarRef.current = salvar;

  useEffect(() => {
    const aoEsconder = () => { if (document.visibilityState === "hidden") void salvarRef.current(); };
    const aoSair = (e: BeforeUnloadEvent) => {
      if (!sujo.current) return;
      void salvarRef.current();
      e.preventDefault();
      e.returnValue = "";
    };
    document.addEventListener("visibilitychange", aoEsconder);
    window.addEventListener("beforeunload", aoSair);
    return () => {
      document.removeEventListener("visibilitychange", aoEsconder);
      window.removeEventListener("beforeunload", aoSair);
      void salvarRef.current();
    };
  }, []);

  const onConteudo = useCallback((html: string) => {
    dados.current.conteudo = html;
    agendar();
  }, [agendar]);

  return (
    <section
      className={
        compacto
          ? "flex min-h-0 flex-1 flex-col"
          : "card flex min-h-[70vh] flex-col p-5 sm:p-7"
      }
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <select
          value={materia}
          onChange={(e) => {
            setMateria(e.target.value);
            dados.current.materia = e.target.value;
            agendar();
          }}
          className="meta-pill cursor-pointer border-0 bg-brand-100 text-brand-700 outline-none"
          aria-label="Matéria da página"
        >
          {materias.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>

        <div className="flex items-center gap-3">
          <span className="doc-status" title={ROTULO[estado]}>
            <span
              className="doc-status-dot"
              style={{
                background:
                  estado === "salvo" ? "var(--good)"
                  : estado === "erro" ? "rgb(var(--danger-from))"
                  : "var(--accent)",
              }}
            />
            {estado === "salvo" ? `Salvo ${tempoRelativo(editadoEm)}` : ROTULO[estado]}
          </span>
          {!compacto && <span className="doc-status">{contagem.palavras} palavras</span>}
          {onExcluir && (
            <button
              onClick={onExcluir}
              className="inline-flex items-center gap-1 text-xs font-semibold text-muted transition hover:text-danger-from"
              aria-label="Excluir página"
            >
              <Trash2 size={14} strokeWidth={1.8} /> {compacto ? "" : "Excluir"}
            </button>
          )}
        </div>
      </div>

      <input
        value={titulo}
        onChange={(e) => {
          setTitulo(e.target.value);
          dados.current.titulo = e.target.value;
          agendar();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            (e.currentTarget.closest("section")?.querySelector(".doc") as HTMLElement | null)?.focus();
          }
        }}
        maxLength={200}
        placeholder="Sem título"
        aria-label="Título da página"
        className="mb-4 w-full border-0 bg-transparent font-display text-brand-ink outline-none placeholder:text-faint"
        style={{ fontSize: compacto ? 22 : 34, fontWeight: "var(--displayWeight)" as never }}
      />

      <EditorRico htmlInicial={htmlInicial} onChange={onConteudo} onSalvarAgora={() => void salvar()} />
    </section>
  );
}

function contar(texto: string) {
  const limpo = texto.replace(/\s+/g, " ").trim();
  return {
    palavras: limpo ? limpo.split(" ").length : 0,
    caracteres: texto.length,
  };
}

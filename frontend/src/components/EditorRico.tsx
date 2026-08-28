// Editor de texto rico do Caderno: um "mini Docs" sobre contenteditable.
//
// Por que execCommand e não uma lib: o app não tem dependência de editor e o
// conteúdo é HTML simples (parágrafos, títulos, listas, tabelas). execCommand é
// legado mas continua sendo o caminho suportado por todos os navegadores para
// isso, e traz undo/redo nativo de graça — que é justamente o que um editor
// caseiro costuma perder.
//
// O componente é NÃO controlado: o HTML vive no DOM e sobe por onChange. Trocar
// de página remonta o editor por `key`, então o conteúdo inicial é aplicado uma
// única vez.
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  AlignCenter, AlignJustify, AlignLeft, AlignRight, Bold, Check, ChevronDown, Code,
  Highlighter, IndentDecrease, IndentIncrease, Italic, Link2, List, ListOrdered,
  ListTodo, Minus, Quote, Redo2, RemoveFormatting, Strikethrough, Table2, Type,
  Underline, Undo2, Unlink,
} from "lucide-react";
import { sanitizeHtml } from "../lib/sanitizeHtml";

export const FONTES = [
  { nome: "Padrão", css: "" },
  { nome: "Jakarta Sans", css: '"Plus Jakarta Sans", system-ui, sans-serif' },
  { nome: "Cormorant", css: '"Cormorant Garamond", Georgia, serif' },
  { nome: "Cinzel", css: '"Cinzel", Georgia, serif' },
  { nome: "Chakra Petch", css: '"Chakra Petch", system-ui, sans-serif' },
  { nome: "Bricolage", css: '"Bricolage Grotesque", system-ui, sans-serif' },
  { nome: "Georgia", css: 'Georgia, "Times New Roman", serif' },
  { nome: "Times New Roman", css: '"Times New Roman", Times, serif' },
  { nome: "Arial", css: "Arial, Helvetica, sans-serif" },
  { nome: "Verdana", css: "Verdana, Geneva, sans-serif" },
  { nome: "Trebuchet MS", css: '"Trebuchet MS", Tahoma, sans-serif' },
  { nome: "Courier New", css: '"Courier New", ui-monospace, monospace' },
];

const TAMANHOS = [11, 12, 13, 14, 16, 18, 20, 24, 28, 32, 40, 48, 64];

const BLOCOS = [
  { id: "p", rotulo: "Texto normal", estilo: { fontSize: 14 } },
  { id: "h1", rotulo: "Título 1", estilo: { fontSize: 25, fontWeight: 800 } },
  { id: "h2", rotulo: "Título 2", estilo: { fontSize: 20, fontWeight: 700 } },
  { id: "h3", rotulo: "Título 3", estilo: { fontSize: 17, fontWeight: 700 } },
  { id: "h4", rotulo: "Título 4", estilo: { fontSize: 15, fontWeight: 700 } },
  { id: "blockquote", rotulo: "Citação", estilo: { fontSize: 14, fontStyle: "italic" as const } },
  { id: "pre", rotulo: "Bloco de código", estilo: { fontSize: 13, fontFamily: "ui-monospace, monospace" } },
];

// Cores sólidas para texto: legíveis nos dois temas (nada de preto puro nem branco puro
// como padrão — "Automático" devolve a cor do tema).
const CORES_TEXTO = [
  "#E7CE86", "#C9A227", "#E6007E", "#FF3DA8", "#8B5CF6", "#4C6FFF",
  "#00C2FF", "#00B39A", "#4E8F6D", "#EF4444", "#F59E0B", "#94A3B8",
];

// Marca-texto em rgba: fica legível tanto no Fantasy (escuro) quanto no Cyberpunk (claro).
const CORES_MARCA = [
  "rgba(201,162,39,.38)", "rgba(230,0,126,.28)", "rgba(139,92,246,.32)",
  "rgba(0,194,255,.30)", "rgba(0,179,154,.32)", "rgba(239,68,68,.28)",
  "rgba(245,158,11,.32)", "rgba(148,163,184,.28)",
];

interface Estado {
  bold: boolean; italic: boolean; underline: boolean; strike: boolean;
  ul: boolean; ol: boolean; todo: boolean;
  bloco: string; align: string; fonte: string; tamanho: number;
}

const ESTADO_ZERO: Estado = {
  bold: false, italic: false, underline: false, strike: false,
  ul: false, ol: false, todo: false, bloco: "p", align: "left", fonte: "Padrão", tamanho: 14,
};

function comandoAtivo(nome: string): boolean {
  try { return document.queryCommandState(nome); } catch { return false; }
}

// Casa a font-family computada (que vem resolvida, com as fontes de fallback) com a
// primeira entrada da lista que tenha o mesmo nome de fonte principal.
function nomeDaFonte(familia: string): string {
  const principal = (familia.split(",")[0] ?? "").replace(/["']/g, "").trim().toLowerCase();
  if (!principal) return "Padrão";
  const achou = FONTES.find(
    (f) => f.css && (f.css.split(",")[0] ?? "").replace(/["']/g, "").trim().toLowerCase() === principal
  );
  return achou?.nome ?? "Padrão";
}

export interface EditorRicoProps {
  htmlInicial: string;
  onChange: (html: string) => void;
  onSalvarAgora?: () => void;
  placeholder?: string;
}

export function EditorRico({ htmlInicial, onChange, onSalvarAgora, placeholder = "Comece a escrever…" }: EditorRicoProps) {
  const areaRef = useRef<HTMLDivElement>(null);
  const rangeRef = useRef<Range | null>(null);
  const [estado, setEstado] = useState<Estado>(ESTADO_ZERO);
  const [vazio, setVazio] = useState(!htmlInicial);

  // Conteúdo inicial: entra uma vez só (o Caderno remonta o editor por `key` ao
  // trocar de página, então não há risco de sobrescrever o que está sendo digitado).
  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    el.innerHTML = sanitizeHtml(htmlInicial) || "<p><br></p>";
    // Enter passa a criar <p> em vez de <div>: é o que dá margem entre parágrafos.
    try { document.execCommand("defaultParagraphSeparator", false, "p"); } catch { /* navegador antigo */ }
    setVazio(!(el.textContent ?? "").trim());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const emitir = useCallback(() => {
    const el = areaRef.current;
    if (!el) return;
    setVazio(!(el.textContent ?? "").trim() && !el.querySelector("table, hr, img"));
    onChange(el.innerHTML);
  }, [onChange]);

  // ---------- seleção ----------

  function dentro(no: Node | null | undefined): boolean {
    return !!no && !!areaRef.current?.contains(no);
  }

  function guardarSelecao() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount && dentro(sel.anchorNode)) rangeRef.current = sel.getRangeAt(0).cloneRange();
  }

  function restaurarSelecao() {
    const r = rangeRef.current;
    if (!r) { areaRef.current?.focus(); return; }
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(r);
  }

  // Elemento de bloco que contém o cursor (parágrafo, título, item de lista, célula…).
  const blocoDoCursor = useCallback((): HTMLElement | null => {
    const el = areaRef.current;
    const sel = window.getSelection();
    if (!el || !sel || !dentro(sel.anchorNode)) return null;
    let n: Node | null = sel.anchorNode;
    while (n && n !== el) {
      if (n.nodeType === 1 && getComputedStyle(n as HTMLElement).display !== "inline") return n as HTMLElement;
      n = n.parentNode;
    }
    return null;
  }, []);

  // Nome do bloco para a caixinha "Texto normal / Título 1…". Item de lista e célula
  // de tabela contam como texto normal.
  const tagDoBloco = useCallback((): string => {
    const el = areaRef.current;
    const sel = window.getSelection();
    if (!el || !sel || !dentro(sel.anchorNode)) return "p";
    let n: Node | null = sel.anchorNode;
    while (n && n !== el) {
      if (n.nodeType === 1) {
        const t = (n as HTMLElement).tagName.toLowerCase();
        if (BLOCOS.some((b) => b.id === t)) return t;
        if (t === "li" || t === "td" || t === "th") return "p";
      }
      n = n.parentNode;
    }
    return "p";
  }, []);

  const sincronizar = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || !dentro(sel.anchorNode)) return;
    const alvo = sel.anchorNode!.nodeType === 1
      ? (sel.anchorNode as HTMLElement)
      : sel.anchorNode!.parentElement;
    const cs = alvo ? getComputedStyle(alvo) : null;
    const bloco = blocoDoCursor();
    setEstado({
      bold: comandoAtivo("bold"),
      italic: comandoAtivo("italic"),
      underline: comandoAtivo("underline"),
      strike: comandoAtivo("strikeThrough"),
      ul: comandoAtivo("insertUnorderedList"),
      ol: comandoAtivo("insertOrderedList"),
      todo: !!bloco?.closest("ul[data-todo]"),
      bloco: tagDoBloco(),
      align: cs?.textAlign ?? "left",
      fonte: nomeDaFonte(cs?.fontFamily ?? ""),
      tamanho: cs ? Math.round(parseFloat(cs.fontSize)) : 14,
    });
  }, [blocoDoCursor, tagDoBloco]);

  useEffect(() => {
    const h = () => { guardarSelecao(); sincronizar(); };
    document.addEventListener("selectionchange", h);
    return () => document.removeEventListener("selectionchange", h);
  }, [sincronizar]);

  // ---------- comandos ----------

  const cmd = useCallback((nome: string, valor?: string, comCss = false) => {
    const el = areaRef.current;
    if (!el) return;
    if (!dentro(window.getSelection()?.anchorNode)) restaurarSelecao();
    el.focus();
    try {
      document.execCommand("styleWithCSS", false, String(comCss));
      document.execCommand(nome, false, valor);
    } catch { /* comando não suportado: ignora em silêncio */ }
    emitir();
    sincronizar();
  }, [emitir, sincronizar]);

  // execCommand só aceita os 7 tamanhos do <font size>. O truque padrão é pedir o
  // tamanho 7 e trocar os <font size="7"> resultantes por spans com o px de verdade.
  const aplicarTamanho = useCallback((px: number) => {
    const el = areaRef.current;
    if (!el) return;
    if (!dentro(window.getSelection()?.anchorNode)) restaurarSelecao();
    el.focus();
    try {
      document.execCommand("styleWithCSS", false, "false");
      document.execCommand("fontSize", false, "7");
    } catch { return; }
    const trocados: HTMLElement[] = [];
    el.querySelectorAll('font[size="7"]').forEach((f) => {
      const span = document.createElement("span");
      span.style.fontSize = `${px}px`;
      while (f.firstChild) span.appendChild(f.firstChild);
      f.replaceWith(span);
      trocados.push(span);
    });
    // A troca de nós desfaz a seleção; devolve o intervalo cobrindo o que foi alterado.
    if (trocados.length) {
      const r = document.createRange();
      r.setStartBefore(trocados[0]);
      r.setEndAfter(trocados[trocados.length - 1]);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(r);
    }
    emitir();
    sincronizar();
  }, [emitir, sincronizar]);

  const aplicarBloco = useCallback((tag: string) => {
    cmd("formatBlock", `<${tag}>`);
  }, [cmd]);

  const aplicarFonte = useCallback((css: string) => {
    if (!css) {
      // "Padrão": tira a família aplicada, deixando herdar a fonte da página.
      const el = areaRef.current;
      if (!el) return;
      restaurarSelecao();
      el.focus();
      document.execCommand("styleWithCSS", false, "true");
      document.execCommand("fontName", false, "inherit");
      el.querySelectorAll('[style*="inherit"]').forEach((n) => {
        const h = n as HTMLElement;
        if (h.style.fontFamily.includes("inherit")) h.style.removeProperty("font-family");
        if (!h.getAttribute("style")) h.removeAttribute("style");
      });
      emitir();
      return;
    }
    cmd("fontName", css, true);
  }, [cmd, emitir]);

  const marcaTexto = useCallback((cor: string) => {
    // hiliteColor é o comando do Chrome/Firefox; backColor é o fallback do Safari.
    const el = areaRef.current;
    if (!el) return;
    restaurarSelecao();
    el.focus();
    document.execCommand("styleWithCSS", false, "true");
    const ok = (() => { try { return document.execCommand("hiliteColor", false, cor); } catch { return false; } })();
    if (!ok) { try { document.execCommand("backColor", false, cor); } catch { /* sem marca-texto */ } }
    emitir();
    sincronizar();
  }, [emitir, sincronizar]);

  const listaTarefas = useCallback(() => {
    const el = areaRef.current;
    if (!el) return;
    restaurarSelecao();
    el.focus();
    const jaTodo = !!blocoDoCursor()?.closest("ul[data-todo]");
    if (jaTodo) {
      blocoDoCursor()?.closest("ul[data-todo]")?.removeAttribute("data-todo");
      emitir();
      sincronizar();
      return;
    }
    if (!comandoAtivo("insertUnorderedList")) document.execCommand("insertUnorderedList");
    const ul = blocoDoCursor()?.closest("ul");
    if (ul) ul.setAttribute("data-todo", "");
    emitir();
    sincronizar();
  }, [blocoDoCursor, emitir, sincronizar]);

  const inserirTabela = useCallback((linhas: number, colunas: number) => {
    const celula = "<td><br></td>".repeat(colunas);
    const cabecalho = "<th><br></th>".repeat(colunas);
    const corpo = `<tr>${celula}</tr>`.repeat(Math.max(0, linhas - 1));
    cmd("insertHTML", `<table><tbody><tr>${cabecalho}</tr>${corpo}</tbody></table><p><br></p>`);
  }, [cmd]);

  const limparFormatacao = useCallback(() => {
    const el = areaRef.current;
    if (!el) return;
    restaurarSelecao();
    el.focus();
    document.execCommand("removeFormat");
    document.execCommand("formatBlock", false, "<p>");
    emitir();
    sincronizar();
  }, [emitir, sincronizar]);

  // ---------- link ----------

  const [linkAberto, setLinkAberto] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

  function abrirLink() {
    guardarSelecao();
    const sel = window.getSelection();
    const atual = sel?.anchorNode?.parentElement?.closest("a");
    setLinkUrl(atual?.getAttribute("href") ?? "");
    setLinkAberto(true);
  }

  function confirmarLink() {
    const url = linkUrl.trim();
    setLinkAberto(false);
    if (!url) return;
    const completa = /^(https?:|mailto:|tel:|[/#])/i.test(url) ? url : `https://${url}`;
    restaurarSelecao();
    const sel = window.getSelection();
    if (sel?.isCollapsed) {
      // Sem texto selecionado: insere o próprio endereço como texto do link.
      cmd("insertHTML", `<a href="${completa.replace(/"/g, "&quot;")}" target="_blank" rel="noopener noreferrer">${completa.replace(/</g, "&lt;")}</a>&nbsp;`);
    } else {
      cmd("createLink", completa);
    }
  }

  // ---------- teclado ----------

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const ctrl = e.ctrlKey || e.metaKey;

    if (ctrl && e.key.toLowerCase() === "s") {
      e.preventDefault();
      onSalvarAgora?.();
      return;
    }
    if (ctrl && e.altKey && ["1", "2", "3", "4"].includes(e.key)) {
      e.preventDefault();
      aplicarBloco(`h${e.key}`);
      return;
    }
    if (ctrl && e.altKey && e.key === "0") {
      e.preventDefault();
      aplicarBloco("p");
      return;
    }
    if (ctrl && e.shiftKey && (e.key === "8" || e.key === "*")) {
      e.preventDefault();
      cmd("insertUnorderedList");
      return;
    }
    if (ctrl && e.shiftKey && (e.key === "7" || e.key === "&")) {
      e.preventDefault();
      cmd("insertOrderedList");
      return;
    }
    if (ctrl && e.key === "\\") {
      e.preventDefault();
      limparFormatacao();
      return;
    }

    if (e.key === "Tab") {
      e.preventDefault();
      const bloco = blocoDoCursor();
      const celula = bloco?.closest("td, th");
      if (celula) {
        // Dentro de tabela, Tab anda para a próxima célula; no fim, cria outra linha.
        const celulas = [...(celula.closest("table")?.querySelectorAll("td, th") ?? [])];
        const i = celulas.indexOf(celula as HTMLTableCellElement);
        const proxima = e.shiftKey ? celulas[i - 1] : celulas[i + 1];
        if (proxima) {
          posicionarCursor(proxima as HTMLElement);
        } else if (!e.shiftKey) {
          const linha = celula.closest("tr");
          const nova = linha?.cloneNode(true) as HTMLTableRowElement | undefined;
          if (nova && linha) {
            nova.querySelectorAll("td, th").forEach((c) => { c.innerHTML = "<br>"; });
            nova.querySelectorAll("th").forEach((th) => {
              const td = document.createElement("td");
              td.innerHTML = "<br>";
              th.replaceWith(td);
            });
            linha.after(nova);
            posicionarCursor(nova.cells[0]);
            emitir();
          }
        }
        return;
      }
      cmd(e.shiftKey ? "outdent" : "indent");
      return;
    }
  }

  function posicionarCursor(el: HTMLElement) {
    const r = document.createRange();
    r.selectNodeContents(el);
    r.collapse(true);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(r);
    areaRef.current?.focus();
  }

  // Atalhos de digitação estilo Notion: "- ", "1. ", "# ", "> ", "[] " no começo da linha.
  function autoformatar() {
    const sel = window.getSelection();
    if (!sel || !sel.isCollapsed || sel.anchorNode?.nodeType !== 3) return;
    const bloco = blocoDoCursor();
    if (!bloco || bloco.tagName === "PRE" || bloco.closest("li")) return;
    if (bloco.firstChild !== sel.anchorNode) return;

    const texto = sel.anchorNode.textContent ?? "";
    const regras: Array<[RegExp, () => void]> = [
      [/^[-*]\s$/, () => cmd("insertUnorderedList")],
      [/^1[.)]\s$/, () => cmd("insertOrderedList")],
      [/^\[\s?\]\s$/, () => listaTarefas()],
      [/^>\s$/, () => aplicarBloco("blockquote")],
      [/^#\s$/, () => aplicarBloco("h1")],
      [/^##\s$/, () => aplicarBloco("h2")],
      [/^###\s$/, () => aplicarBloco("h3")],
      [/^```$/, () => aplicarBloco("pre")],
    ];
    for (const [re, acao] of regras) {
      if (!re.test(texto.slice(0, sel.anchorOffset))) continue;
      const r = document.createRange();
      r.setStart(sel.anchorNode, 0);
      r.setEnd(sel.anchorNode, sel.anchorOffset);
      r.deleteContents();
      acao();
      return;
    }
  }

  // Colagem: passa pelo mesmo saneador do resto: o HTML do Word/Docs vem cheio de
  // classes, <o:p> e estilos que estragariam a página.
  function onPaste(e: React.ClipboardEvent<HTMLDivElement>) {
    const html = e.clipboardData.getData("text/html");
    const texto = e.clipboardData.getData("text/plain");
    e.preventDefault();
    if (html) {
      cmd("insertHTML", sanitizeHtml(html));
    } else if (texto) {
      const escapado = texto
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .split(/\r?\n/).join("<br>");
      cmd("insertHTML", escapado);
    }
  }

  // Clicar no quadradinho de um item de checklist marca/desmarca.
  function onMouseDownArea(e: React.MouseEvent<HTMLDivElement>) {
    const alvo = e.target as HTMLElement;
    const li = alvo.closest("li");
    if (!li || !li.parentElement?.hasAttribute("data-todo")) return;
    const x = e.clientX - li.getBoundingClientRect().left;
    if (x > 22) return;
    e.preventDefault();
    if (li.hasAttribute("data-done")) li.removeAttribute("data-done");
    else li.setAttribute("data-done", "");
    emitir();
  }

  const blocoAtual = BLOCOS.find((b) => b.id === estado.bloco) ?? BLOCOS[0];

  return (
    <div className="doc-wrap">
      {/* ---------------- Barra de ferramentas ---------------- */}
      <div className="doc-toolbar">
        <Grupo>
          <Btn titulo="Desfazer (Ctrl+Z)" onClick={() => cmd("undo")}><Undo2 size={15} /></Btn>
          <Btn titulo="Refazer (Ctrl+Shift+Z)" onClick={() => cmd("redo")}><Redo2 size={15} /></Btn>
        </Grupo>

        <Menu rotulo={blocoAtual.rotulo} largura={190} titulo="Estilo do parágrafo">
          {(fechar) => (
            <>
              {BLOCOS.map((b) => (
                <ItemMenu
                  key={b.id}
                  ativo={b.id === estado.bloco}
                  onClick={() => { aplicarBloco(b.id); fechar(); }}
                >
                  <span style={b.estilo}>{b.rotulo}</span>
                </ItemMenu>
              ))}
            </>
          )}
        </Menu>

        <Menu rotulo={estado.fonte} largura={200} titulo="Fonte" icone={<Type size={14} />}>
          {(fechar) => (
            <>
              {FONTES.map((f) => (
                <ItemMenu
                  key={f.nome}
                  ativo={f.nome === estado.fonte}
                  onClick={() => { aplicarFonte(f.css); fechar(); }}
                >
                  <span style={{ fontFamily: f.css || undefined }}>{f.nome}</span>
                </ItemMenu>
              ))}
            </>
          )}
        </Menu>

        <Menu rotulo={String(estado.tamanho)} largura={92} titulo="Tamanho da fonte">
          {(fechar) => (
            <>
              {TAMANHOS.map((t) => (
                <ItemMenu key={t} ativo={t === estado.tamanho} onClick={() => { aplicarTamanho(t); fechar(); }}>
                  {t}
                </ItemMenu>
              ))}
            </>
          )}
        </Menu>

        <Grupo>
          <Btn titulo="Negrito (Ctrl+B)" ativo={estado.bold} onClick={() => cmd("bold")}><Bold size={15} /></Btn>
          <Btn titulo="Itálico (Ctrl+I)" ativo={estado.italic} onClick={() => cmd("italic")}><Italic size={15} /></Btn>
          <Btn titulo="Sublinhado (Ctrl+U)" ativo={estado.underline} onClick={() => cmd("underline")}><Underline size={15} /></Btn>
          <Btn titulo="Tachado" ativo={estado.strike} onClick={() => cmd("strikeThrough")}><Strikethrough size={15} /></Btn>
        </Grupo>

        <Grupo>
          <MenuCor titulo="Cor do texto" icone={<span className="doc-cor-icone">A</span>} cores={CORES_TEXTO}
            onEscolher={(c) => cmd("foreColor", c, true)}
            onLimpar={() => cmd("foreColor", "inherit", true)} rotuloLimpar="Automática" />
          <MenuCor titulo="Marca-texto" icone={<Highlighter size={15} />} cores={CORES_MARCA}
            onEscolher={marcaTexto}
            onLimpar={() => marcaTexto("transparent")} rotuloLimpar="Sem marcação" />
        </Grupo>

        <Grupo>
          <Btn titulo="Lista com marcadores (Ctrl+Shift+8)" ativo={estado.ul && !estado.todo} onClick={() => cmd("insertUnorderedList")}><List size={15} /></Btn>
          <Btn titulo="Lista numerada (Ctrl+Shift+7)" ativo={estado.ol} onClick={() => cmd("insertOrderedList")}><ListOrdered size={15} /></Btn>
          <Btn titulo="Lista de tarefas" ativo={estado.todo} onClick={listaTarefas}><ListTodo size={15} /></Btn>
          <Btn titulo="Diminuir recuo (Shift+Tab)" onClick={() => cmd("outdent")}><IndentDecrease size={15} /></Btn>
          <Btn titulo="Aumentar recuo (Tab)" onClick={() => cmd("indent")}><IndentIncrease size={15} /></Btn>
        </Grupo>

        <Grupo>
          <Btn titulo="Alinhar à esquerda" ativo={estado.align === "left" || estado.align === "start"} onClick={() => cmd("justifyLeft")}><AlignLeft size={15} /></Btn>
          <Btn titulo="Centralizar" ativo={estado.align === "center"} onClick={() => cmd("justifyCenter")}><AlignCenter size={15} /></Btn>
          <Btn titulo="Alinhar à direita" ativo={estado.align === "right"} onClick={() => cmd("justifyRight")}><AlignRight size={15} /></Btn>
          <Btn titulo="Justificar" ativo={estado.align === "justify"} onClick={() => cmd("justifyFull")}><AlignJustify size={15} /></Btn>
        </Grupo>

        <Grupo>
          <Btn titulo="Citação" ativo={estado.bloco === "blockquote"} onClick={() => aplicarBloco("blockquote")}><Quote size={15} /></Btn>
          <Btn titulo="Bloco de código" ativo={estado.bloco === "pre"} onClick={() => aplicarBloco("pre")}><Code size={15} /></Btn>
          <Btn titulo="Linha divisória" onClick={() => cmd("insertHorizontalRule")}><Minus size={15} /></Btn>
          <Menu titulo="Inserir tabela" icone={<Table2 size={15} />} largura={150} soIcone>
            {(fechar) => (
              <>
                {[[2, 2], [3, 3], [4, 3], [5, 4]].map(([l, c]) => (
                  <ItemMenu key={`${l}x${c}`} onClick={() => { inserirTabela(l, c); fechar(); }}>
                    {l} × {c}
                  </ItemMenu>
                ))}
              </>
            )}
          </Menu>
        </Grupo>

        <Grupo semDivisor>
          <Btn titulo="Inserir link" onClick={abrirLink}><Link2 size={15} /></Btn>
          <Btn titulo="Remover link" onClick={() => cmd("unlink")}><Unlink size={15} /></Btn>
          <Btn titulo="Limpar formatação (Ctrl+\)" onClick={limparFormatacao}><RemoveFormatting size={15} /></Btn>
        </Grupo>
      </div>

      {linkAberto && (
        <div className="doc-link-bar">
          <input
            autoFocus
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); confirmarLink(); }
              if (e.key === "Escape") { e.preventDefault(); setLinkAberto(false); }
            }}
            placeholder="cole ou digite um endereço…"
            className="doc-link-input"
          />
          <button type="button" className="doc-link-ok" onMouseDown={(e) => e.preventDefault()} onClick={confirmarLink}>
            <Check size={14} /> Aplicar
          </button>
          <button type="button" className="doc-link-cancel" onMouseDown={(e) => e.preventDefault()} onClick={() => setLinkAberto(false)}>
            Cancelar
          </button>
        </div>
      )}

      {/* ---------------- Folha ---------------- */}
      <div className="doc-sheet-wrap">
        <div className="doc-sheet">
          {vazio && <div className="doc-ph">{placeholder}</div>}
          <div
            ref={areaRef}
            contentEditable
            suppressContentEditableWarning
            spellCheck
            role="textbox"
            aria-multiline="true"
            aria-label="Conteúdo da página"
            className="doc"
            onInput={() => { autoformatar(); emitir(); }}
            onKeyDown={onKeyDown}
            onPaste={onPaste}
            onMouseDown={onMouseDownArea}
            onKeyUp={sincronizar}
            onClick={sincronizar}
          />
        </div>
      </div>
    </div>
  );
}

// ---------------- peças da barra ----------------

function Grupo({ children, semDivisor }: { children: ReactNode; semDivisor?: boolean }) {
  return (
    <div className={`doc-grupo${semDivisor ? "" : " doc-grupo-div"}`}>
      {children}
    </div>
  );
}

function Btn({ children, titulo, ativo, onClick }: { children: ReactNode; titulo: string; ativo?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      title={titulo}
      aria-label={titulo}
      aria-pressed={ativo}
      // preventDefault no mousedown mantém a seleção do texto viva ao clicar no botão.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`doc-btn${ativo ? " doc-btn-on" : ""}`}
    >
      {children}
    </button>
  );
}

function Menu({
  rotulo, titulo, largura, icone, soIcone, children,
}: {
  rotulo?: string; titulo: string; largura: number; icone?: ReactNode; soIcone?: boolean;
  children: (fechar: () => void) => ReactNode;
}) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setAberto(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setAberto(false); };
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", fora); document.removeEventListener("keydown", esc); };
  }, [aberto]);

  return (
    <div className="doc-menu" ref={ref}>
      <button
        type="button"
        title={titulo}
        aria-label={titulo}
        aria-expanded={aberto}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setAberto((a) => !a)}
        className={`doc-btn doc-btn-menu${aberto ? " doc-btn-on" : ""}`}
      >
        {icone}
        {!soIcone && <span className="doc-menu-rotulo">{rotulo}</span>}
        <ChevronDown size={13} className="opacity-60" />
      </button>
      {aberto && (
        <div className="doc-menu-lista" style={{ width: largura }}>
          {children(() => setAberto(false))}
        </div>
      )}
    </div>
  );
}

function ItemMenu({ children, ativo, onClick }: { children: ReactNode; ativo?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`doc-menu-item${ativo ? " doc-menu-item-on" : ""}`}
    >
      <span className="flex-1 truncate text-left">{children}</span>
      {ativo && <Check size={13} />}
    </button>
  );
}

function MenuCor({
  titulo, icone, cores, onEscolher, onLimpar, rotuloLimpar,
}: {
  titulo: string; icone: ReactNode; cores: string[];
  onEscolher: (cor: string) => void; onLimpar: () => void; rotuloLimpar: string;
}) {
  return (
    <Menu titulo={titulo} largura={188} icone={icone} soIcone>
      {(fechar) => (
        <>
          <div className="doc-cores">
            {cores.map((c) => (
              <button
                key={c}
                type="button"
                title={c}
                aria-label={`${titulo}: ${c}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { onEscolher(c); fechar(); }}
                className="doc-cor"
                style={{ background: c }}
              />
            ))}
          </div>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => { onLimpar(); fechar(); }}
            className="doc-menu-item"
          >
            {rotuloLimpar}
          </button>
        </>
      )}
    </Menu>
  );
}

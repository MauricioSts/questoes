// Editor dos exercícios (CodeMirror 6). Este arquivo só é carregado sob demanda pela tela
// do exercício (React.lazy) — o CodeMirror não entra no bundle principal. O pacote da
// linguagem também vem sob demanda: quem abre um exercício de Python não baixa o de Java.
// Cores saem dos tokens do tema (CSS vars), então o editor acompanha Topography/Lugia/Cyberpunk.
import { useEffect, useMemo, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { EditorView } from "@codemirror/view";
import type { Extension } from "@codemirror/state";
import { HighlightStyle, StreamLanguage, syntaxHighlighting } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";
import { TEMAS, useTheme } from "../../store/theme";
import type { Linguagem } from "../../lib/execucao";

async function carregarLinguagem(l: Linguagem): Promise<Extension> {
  switch (l) {
    case "python":
      return (await import("@codemirror/lang-python")).python();
    case "javascript":
      return (await import("@codemirror/lang-javascript")).javascript();
    case "typescript":
      return (await import("@codemirror/lang-javascript")).javascript({ typescript: true });
    case "java":
      return (await import("@codemirror/lang-java")).java();
    case "cpp":
      return (await import("@codemirror/lang-cpp")).cpp();
    case "sql": {
      const m = await import("@codemirror/lang-sql");
      return m.sql({ dialect: m.SQLite });
    }
    case "shell":
      return StreamLanguage.define((await import("@codemirror/legacy-modes/mode/shell")).shell);
    default:
      return [];
  }
}

const destaque = HighlightStyle.define([
  { tag: [t.keyword, t.controlKeyword, t.operatorKeyword, t.modifier, t.definitionKeyword], color: "var(--accentText)", fontWeight: "600" },
  { tag: [t.string, t.special(t.string), t.regexp], color: "var(--goodText)" },
  { tag: [t.number, t.bool, t.null, t.atom], color: "rgb(var(--danger-from))" },
  { tag: [t.comment, t.lineComment, t.blockComment], color: "rgb(var(--faint))", fontStyle: "italic" },
  { tag: [t.function(t.variableName), t.function(t.propertyName), t.definition(t.function(t.variableName))], color: "var(--accentHi)" },
  { tag: [t.typeName, t.className, t.namespace], color: "var(--accentHi)", fontStyle: "italic" },
  { tag: [t.propertyName, t.attributeName], color: "rgb(var(--ink))" },
  { tag: [t.operator, t.punctuation, t.bracket], color: "rgb(var(--muted))" },
  { tag: t.invalid, color: "rgb(var(--danger-from))" },
]);

function temaEditor(escuro: boolean): Extension {
  return [
    EditorView.theme(
      {
        "&": {
          color: "rgb(var(--ink))",
          backgroundColor: "var(--surface2)",
          fontSize: "13.5px",
          borderRadius: "var(--rSm)",
        },
        "&.cm-focused": { outline: "2px solid var(--accentBd)", outlineOffset: "0" },
        ".cm-scroller": { fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace", lineHeight: "1.6" },
        ".cm-content": { caretColor: "var(--accentText)", padding: "10px 0" },
        ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--accentText)", borderLeftWidth: "2px" },
        "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, ::selection":
          { backgroundColor: "var(--accentBg) !important" },
        ".cm-activeLine": { backgroundColor: "var(--accentBg)" },
        ".cm-gutters": {
          backgroundColor: "var(--surface2)",
          color: "rgb(var(--faint))",
          border: "none",
          borderRight: "1px solid rgb(var(--hair))",
        },
        ".cm-activeLineGutter": { backgroundColor: "var(--accentBg)", color: "var(--accentText)" },
        ".cm-matchingBracket, .cm-nonmatchingBracket": { backgroundColor: "var(--accentBg)", outline: "1px solid var(--accentBd)" },
        ".cm-tooltip": { backgroundColor: "var(--surfaceHex)", color: "rgb(var(--ink))", border: "1px solid rgb(var(--hair))" },
        ".cm-tooltip-autocomplete > ul > li[aria-selected]": { backgroundColor: "var(--accentBg)", color: "rgb(var(--ink))" },
        ".cm-panels": { backgroundColor: "var(--surfaceHex)", color: "rgb(var(--ink))" },
        ".cm-searchMatch": { backgroundColor: "var(--accentBg)", outline: "1px solid var(--accentBd)" },
        ".cm-foldPlaceholder": { backgroundColor: "transparent", border: "none", color: "rgb(var(--faint))" },
      },
      { dark: escuro }
    ),
    syntaxHighlighting(destaque),
  ];
}

export default function EditorCodigo({
  valor,
  linguagem,
  onChange,
  onExecutar,
  rotulo,
}: {
  valor: string;
  linguagem: Linguagem;
  onChange: (v: string) => void;
  onExecutar?: () => void;
  rotulo: string;
}) {
  const { tema } = useTheme();
  const escuro = TEMAS.find((x) => x.id === tema)?.escuro ?? true;
  const [lang, setLang] = useState<Extension>([]);
  const tema_ = useMemo(() => temaEditor(escuro), [escuro]);

  useEffect(() => {
    let vivo = true;
    carregarLinguagem(linguagem)
      .then((ext) => vivo && setLang(ext))
      .catch(() => vivo && setLang([])); // sem highlight, mas o editor segue funcionando
    return () => {
      vivo = false;
    };
  }, [linguagem]);

  const extensoes = useMemo(
    () => [
      lang,
      EditorView.lineWrapping,
      EditorView.contentAttributes.of({ "aria-label": rotulo }),
      // Ctrl/Cmd+Enter executa, como nas plataformas de exercício.
      EditorView.domEventHandlers({
        keydown: (e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && onExecutar) {
            e.preventDefault();
            onExecutar();
            return true;
          }
          return false;
        },
      }),
    ],
    [lang, rotulo, onExecutar]
  );

  return (
    <CodeMirror
      value={valor}
      onChange={onChange}
      extensions={extensoes}
      theme={tema_}
      minHeight="260px"
      maxHeight="62vh"
      basicSetup={{ highlightActiveLine: true, foldGutter: false, autocompletion: true, searchKeymap: true }}
      indentWithTab
    />
  );
}

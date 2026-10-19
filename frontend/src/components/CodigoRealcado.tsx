import { Highlight, type PrismTheme } from "prism-react-renderer";
import { linguagemPrism } from "../lib/prismLinguagens";

// Cores do realce SEM paleta própria: cada tipo de token aponta para um token do tema
// ativo (index.css), então o código acompanha fantasy/cyberpunk/rose sem um tema do
// Prism por tema do app. Os pares escolhidos têm contraste nos três fundos.
//   texto → --ink                     comentário/pontuação → --muted (comentário em itálico)
//   palavra-chave/tag → --brand-700   (o "texto de acento" de cada tema)
//   string → --success-from           número/literal → --flame-text
//   função/classe → --danger-from
const cor = (canal: string) => `rgb(var(${canal}))`;

export const TEMA_CODIGO: PrismTheme = {
  plain: { color: cor("--ink") },
  styles: [
    { types: ["comment", "prolog", "doctype", "cdata"], style: { color: cor("--muted"), fontStyle: "italic" } },
    { types: ["punctuation"], style: { color: cor("--muted") } },
    { types: ["keyword", "builtin", "tag", "atrule", "selector", "important"], style: { color: cor("--brand-700"), fontWeight: "600" } },
    { types: ["string", "char", "attr-value", "regex", "url", "inserted"], style: { color: cor("--success-from") } },
    { types: ["number", "boolean", "constant", "symbol", "attr-name", "annotation", "variable"], style: { color: cor("--flame-text") } },
    { types: ["function", "class-name", "namespace"], style: { color: cor("--danger-from") } },
    { types: ["deleted"], style: { color: cor("--danger-from"), textDecorationLine: "line-through" } },
    { types: ["operator", "entity"], style: { color: cor("--ink") } },
  ],
};

// Bloco de código com o rótulo da linguagem (usado na questão e no comando). Tudo vira
// nó React (tokens como <span>), nada de innerHTML: o código da questão é sempre texto.
export function BlocoCodigo({ codigo, linguagem }: { codigo: string; linguagem?: string }) {
  const lang = linguagemPrism(linguagem);
  return (
    <div className="overflow-hidden rounded-xl border border-hair">
      {linguagem && (
        <div className="border-b border-hair bg-brand-100 px-4 py-2 text-xs font-mono font-bold text-brand-700">
          {linguagem}
        </div>
      )}
      <Highlight theme={TEMA_CODIGO} code={codigo.replace(/\n+$/, "")} language={lang ?? "plain"}>
        {({ tokens, getLineProps, getTokenProps }) => (
          // Sem quebra automática: a indentação é parte do código. No celular, rolagem lateral.
          <pre
            className="overflow-x-auto p-4 text-sm leading-relaxed font-mono text-brand-ink"
            style={{ background: "var(--surface2)" }}
            data-linguagem={lang ?? undefined}
          >
            <code>
              {tokens.map((linha, i) => (
                <div key={i} {...getLineProps({ line: linha })}>
                  {linha.map((token, j) => (
                    <span key={j} {...getTokenProps({ token })} />
                  ))}
                </div>
              ))}
            </code>
          </pre>
        )}
      </Highlight>
    </div>
  );
}

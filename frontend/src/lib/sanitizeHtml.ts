// Saneamento do HTML do Caderno. O conteúdo da página é gravado no banco e volta
// para a tela via innerHTML, então tudo que entra passa por aqui: colagem vinda do
// Word/Docs/web, o que o editor produz e o que é lido do servidor.
//
// Quem faz o trabalho pesado é o DOMPurify (parser do próprio navegador, mantido contra
// mXSS e truques de namespace). Por cima dele vai a nossa lista de permissão: tag fora
// da lista é desembrulhada (o texto de dentro sobrevive), atributo fora da lista some, e
// `style` é reescrito propriedade a propriedade. Nada de <script>, <iframe>, on*= ou url()
// dentro de estilo.
import DOMPurify, { type DOMPurify as InstanciaPurify } from "dompurify";

const TAGS_OK = [
  "p", "br", "div", "span", "b", "strong", "i", "em", "u", "s", "strike", "del", "mark",
  "h1", "h2", "h3", "h4", "ul", "ol", "li", "blockquote", "pre", "code", "hr", "a",
  "table", "thead", "tbody", "tr", "td", "th", "sub", "sup", "font",
];

// Tags que somem inteiras (conteúdo junto) em vez de serem desembrulhadas. O DOMPurify
// já faz isso com script/style/iframe/svg/noscript (e áudio, vídeo, math...); aqui vão
// as que ele desembrulharia.
const TAGS_FORA = ["script", "style", "iframe", "object", "embed", "link", "meta", "noscript", "svg", "form", "input", "button"];

const ATTRS_OK: Record<string, Set<string>> = {
  "*": new Set(["style"]),
  a: new Set(["href", "target", "rel"]),
  td: new Set(["colspan", "rowspan"]),
  th: new Set(["colspan", "rowspan"]),
  ul: new Set(["data-todo"]),
  li: new Set(["data-done"]),
};
const TODOS_ATTRS = [...new Set(Object.values(ATTRS_OK).flatMap((s) => [...s]))];

const CSS_OK = new Set([
  "color", "background-color", "font-family", "font-size", "font-weight", "font-style",
  "text-decoration", "text-decoration-line", "text-align", "line-height",
  "margin-left", "padding-left",
]);

// Filtra o atributo style: só as propriedades da lista, e nenhum valor com url()/expression()
// (que reintroduziriam requisições externas ou execução).
function limparStyle(valor: string): string {
  const partes: string[] = [];
  for (const decl of valor.split(";")) {
    const i = decl.indexOf(":");
    if (i < 0) continue;
    const prop = decl.slice(0, i).trim().toLowerCase();
    const val = decl.slice(i + 1).trim();
    if (!CSS_OK.has(prop) || !val) continue;
    if (/url\s*\(|expression\s*\(|javascript:/i.test(val)) continue;
    partes.push(`${prop}: ${val}`);
  }
  return partes.join("; ");
}

function hrefSeguro(href: string): string | null {
  const v = href.trim();
  if (/^(https?:|mailto:|tel:)/i.test(v)) return v;
  // Link relativo/âncora também serve; qualquer outro esquema (javascript:, data:) cai fora.
  if (/^[/#]/.test(v)) return v;
  return null;
}

// Instância própria (os hooks do DOMPurify são por instância) e criada na primeira
// chamada: o módulo pode ser importado fora do navegador sem quebrar.
let purify: InstanciaPurify | null = null;

function instancia(): InstanciaPurify {
  if (purify) return purify;
  const p = DOMPurify(window);

  // Atributo: lista por tag (o ALLOWED_ATTR do DOMPurify é global), style reescrito e
  // href só com esquema seguro.
  p.addHook("uponSanitizeAttribute", (no, dados) => {
    const tag = no.nodeName.toLowerCase();
    const nome = dados.attrName;
    if (!ATTRS_OK["*"].has(nome) && !ATTRS_OK[tag]?.has(nome)) {
      dados.keepAttr = false;
      return;
    }
    if (nome === "style") {
      const limpo = limparStyle(dados.attrValue);
      if (limpo) dados.attrValue = limpo;
      else dados.keepAttr = false;
    }
    if (nome === "href") {
      const seguro = hrefSeguro(dados.attrValue);
      if (seguro) dados.attrValue = seguro;
      else dados.keepAttr = false;
    }
  });

  // Link com destino sempre abre fora, sem dar à página aberta acesso a esta.
  p.addHook("afterSanitizeAttributes", (no) => {
    if (no.nodeName.toLowerCase() === "a" && (no as Element).getAttribute("href")) {
      (no as Element).setAttribute("target", "_blank");
      (no as Element).setAttribute("rel", "noopener noreferrer");
    }
  });

  purify = p;
  return p;
}

export function sanitizeHtml(html: string): string {
  if (!html) return "";
  return instancia().sanitize(html, {
    ALLOWED_TAGS: TAGS_OK,
    ALLOWED_ATTR: TODOS_ATTRS,
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false,
    KEEP_CONTENT: true,
    ADD_FORBID_CONTENTS: TAGS_FORA,
    RETURN_TRUSTED_TYPE: false,
  }) as string;
}

export function escaparTexto(txt: string): string {
  return txt
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Converte as páginas antigas (formato "texto") em parágrafos, preservando linhas
// em branco. Páginas gravadas antes do editor rico já tinham perdido as quebras —
// isto vale para o que ainda tem, e para texto colado como texto puro.
export function textoParaHtml(texto: string): string {
  if (!texto.trim()) return "";
  return texto
    .split(/\r?\n/)
    .map((linha) => (linha.trim() ? `<p>${escaparTexto(linha)}</p>` : "<p><br></p>"))
    .join("");
}

// Só para contagem de palavras/caracteres e para saber se a página está vazia.
export function htmlParaTexto(html: string): string {
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");
  return doc.body.textContent ?? "";
}

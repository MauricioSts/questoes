// Saneamento do HTML do Caderno. O conteúdo da página é gravado no banco e volta
// para a tela via innerHTML, então tudo que entra passa por aqui: colagem vinda do
// Word/Docs/web, o que o editor produz e o que é lido do servidor.
//
// A regra é lista de permissão: tag fora da lista é desembrulhada (o texto de dentro
// sobrevive), atributo fora da lista some, e `style` é reescrito propriedade a
// propriedade. Nada de <script>, <iframe>, on*= ou url() dentro de estilo.

const TAGS_OK = new Set([
  "p", "br", "div", "span", "b", "strong", "i", "em", "u", "s", "strike", "del", "mark",
  "h1", "h2", "h3", "h4", "ul", "ol", "li", "blockquote", "pre", "code", "hr", "a",
  "table", "thead", "tbody", "tr", "td", "th", "sub", "sup", "font",
]);

// Tags que somem inteiras (conteúdo junto) em vez de serem desembrulhadas.
const TAGS_FORA = new Set(["script", "style", "iframe", "object", "embed", "link", "meta", "noscript", "svg", "form", "input", "button"]);

const ATTRS_OK: Record<string, Set<string>> = {
  "*": new Set(["style"]),
  a: new Set(["href", "target", "rel"]),
  td: new Set(["colspan", "rowspan"]),
  th: new Set(["colspan", "rowspan"]),
  ul: new Set(["data-todo"]),
  li: new Set(["data-done"]),
};

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

function limparNo(el: Element) {
  const tag = el.tagName.toLowerCase();

  if (TAGS_FORA.has(tag)) {
    el.remove();
    return;
  }

  // Filhos primeiro: assim desembrulhar o pai não deixa nada sujo para trás.
  for (const filho of [...el.children]) limparNo(filho);

  if (!TAGS_OK.has(tag)) {
    // Desembrulha: mantém o texto, joga a tag fora.
    const pai = el.parentNode;
    if (!pai) return;
    while (el.firstChild) pai.insertBefore(el.firstChild, el);
    el.remove();
    return;
  }

  const permitidos = ATTRS_OK[tag];
  for (const attr of [...el.attributes]) {
    const nome = attr.name.toLowerCase();
    const ok = ATTRS_OK["*"].has(nome) || permitidos?.has(nome);
    if (!ok) {
      el.removeAttribute(attr.name);
      continue;
    }
    if (nome === "style") {
      const limpo = limparStyle(attr.value);
      if (limpo) el.setAttribute("style", limpo);
      else el.removeAttribute("style");
    }
    if (nome === "href") {
      const seguro = hrefSeguro(attr.value);
      if (seguro) el.setAttribute("href", seguro);
      else el.removeAttribute("href");
    }
  }

  if (tag === "a" && el.getAttribute("href")) {
    el.setAttribute("target", "_blank");
    el.setAttribute("rel", "noopener noreferrer");
  }
}

export function sanitizeHtml(html: string): string {
  if (!html) return "";
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");
  for (const filho of [...doc.body.children]) limparNo(filho);
  return doc.body.innerHTML;
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

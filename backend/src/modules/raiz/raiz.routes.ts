import crypto from "node:crypto";
import { Router } from "express";

// Raiz da API: quem abre questoesapi.* no navegador (ou um classificador de filtro web)
// vê uma página explicando o que é isto, em vez do "Cannot GET /" do Express.
export const raizRouter = Router();

export const URL_SITE = "https://questoes.mauriciosts.com";

// CSS fixo: a CSP libera exatamente ele pelo hash, sem 'unsafe-inline' (e nenhum script),
// no mesmo esquema da página de aprovação de conta.
export const ESTILO_RAIZ = `
body{margin:0;min-height:100vh;display:grid;place-items:center;padding:16px;box-sizing:border-box;background:#0f0b1f;color:#ece8ff;font:15px/1.6 system-ui,sans-serif}
main{width:100%;max-width:480px;box-sizing:border-box;background:#1a1430;border:1px solid #2e2650;border-radius:16px;padding:28px}
h1{margin:0 0 12px;font-size:22px}p{margin:0 0 12px}.m{color:#9d95c0;font-size:13px;margin:0}
a.b{display:inline-block;margin:6px 0 18px;padding:11px 18px;border-radius:10px;background:#6d5cff;color:#fff;font-weight:600;text-decoration:none}
`;

export const CSP_RAIZ =
  `default-src 'none'; style-src 'sha256-${crypto.createHash("sha256").update(ESTILO_RAIZ).digest("base64")}'; ` +
  `base-uri 'none'; form-action 'none'; frame-ancestors 'none'`;

const PAGINA_RAIZ = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="description" content="API do devconcursado, plataforma de estudo por questões para concursos públicos de TI.">
<title>API · devconcursado</title>
<style>${ESTILO_RAIZ}</style></head><body><main>
<h1>API do devconcursado</h1>
<p>Este endereço é a API do <strong>devconcursado</strong>, plataforma de estudo por questões para concursos públicos, com foco em carreiras de TI: questões de provas oficiais com explicação, simulados e revisão espaçada.</p>
<p>Ela só atende o aplicativo. Para estudar, acesse o site:</p>
<a class="b" href="${URL_SITE}">${URL_SITE.replace("https://", "")}</a>
<p class="m">devconcursado · estudo para concursos públicos</p>
</main></body></html>`;

// Só a raiz pode ser indexada; as rotas da API não têm nada para um buscador.
export const ROBOTS_API = "User-agent: *\nAllow: /$\nDisallow: /\n";

raizRouter.get("/", (_req, res) => {
  res.setHeader("Content-Security-Policy", CSP_RAIZ);
  res.type("html").send(PAGINA_RAIZ);
});

raizRouter.get("/robots.txt", (_req, res) => {
  res.type("text/plain").send(ROBOTS_API);
});

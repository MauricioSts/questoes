// Gera a imagem de preview de links (Open Graph / Twitter) e o apple-touch-icon.
//
//   node scripts/gerar-og-image.mjs
//
// 1. Monta public/og-image.svg (1200×630): fundo "atlas noturno" do tema fantasy, com curvas
//    de nível calculadas aqui (marching squares sobre um relevo determinístico), o selo `>_`
//    e o nome. As fontes (Fraunces + JetBrains Mono) vêm do Google Fonts por @import.
// 2. Renderiza public/og-image.png e public/apple-touch-icon.png com o Chromium headless.
//
// O SVG é a fonte; os PNGs são o que os robôs de preview (WhatsApp, Telegram, X, LinkedIn)
// conseguem ler. Rode de novo sempre que mudar o SVG.
import { writeFileSync, mkdtempSync, rmSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = join(RAIZ, "public");
const CHROMIUM = process.env.CHROMIUM || "/usr/bin/chromium-browser";

const W = 1200;
const H = 630;

// ---------- relevo ----------
// Soma de morros gaussianos + ondulação suave. Determinístico: a imagem sai igual sempre.
const morros = [
  // x, y, raio, altura
  [1010, 170, 230, 1.0],
  [860, 520, 210, 0.75],
  [1180, 470, 160, 0.55],
  [700, 120, 170, -0.35],
  [520, 640, 260, 0.35],
  [300, -40, 260, 0.3],
];
function altura(x, y) {
  let h = 0;
  for (const [mx, my, r, a] of morros) {
    const d2 = (x - mx) ** 2 + (y - my) ** 2;
    h += a * Math.exp(-d2 / (2 * r * r));
  }
  h += 0.08 * Math.sin(x / 97 + y / 151) + 0.06 * Math.cos(x / 61 - y / 83);
  return h;
}

// ---------- marching squares ----------
const PASSO = 6;
const NX = Math.ceil(W / PASSO) + 2;
const NY = Math.ceil(H / PASSO) + 2;
const campo = [];
for (let j = 0; j <= NY; j++) {
  const linha = [];
  for (let i = 0; i <= NX; i++) linha.push(altura(i * PASSO - PASSO, j * PASSO - PASSO));
  campo.push(linha);
}

function contorno(nivel) {
  const segs = [];
  const p = (i, j) => [i * PASSO - PASSO, j * PASSO - PASSO];
  const interp = (a, b, va, vb) => {
    const t = (nivel - va) / (vb - va);
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  };
  for (let j = 0; j < NY; j++) {
    for (let i = 0; i < NX; i++) {
      const v0 = campo[j][i], v1 = campo[j][i + 1], v2 = campo[j + 1][i + 1], v3 = campo[j + 1][i];
      const c = (v0 > nivel ? 8 : 0) | (v1 > nivel ? 4 : 0) | (v2 > nivel ? 2 : 0) | (v3 > nivel ? 1 : 0);
      if (c === 0 || c === 15) continue;
      const P0 = p(i, j), P1 = p(i + 1, j), P2 = p(i + 1, j + 1), P3 = p(i, j + 1);
      const top = () => interp(P0, P1, v0, v1);
      const right = () => interp(P1, P2, v1, v2);
      const bottom = () => interp(P3, P2, v3, v2);
      const left = () => interp(P0, P3, v0, v3);
      switch (c) {
        case 1: case 14: segs.push([left(), bottom()]); break;
        case 2: case 13: segs.push([bottom(), right()]); break;
        case 3: case 12: segs.push([left(), right()]); break;
        case 4: case 11: segs.push([top(), right()]); break;
        case 6: case 9: segs.push([top(), bottom()]); break;
        case 7: case 8: segs.push([left(), top()]); break;
        case 5: segs.push([left(), top()]); segs.push([bottom(), right()]); break;
        case 10: segs.push([left(), bottom()]); segs.push([top(), right()]); break;
      }
    }
  }
  // Encadeia segmentos em polilinhas para o path ficar enxuto.
  const k = (pt) => `${pt[0].toFixed(2)},${pt[1].toFixed(2)}`;
  const porPonta = new Map();
  segs.forEach((s, idx) => {
    for (const pt of s) {
      const key = k(pt);
      if (!porPonta.has(key)) porPonta.set(key, []);
      porPonta.get(key).push(idx);
    }
  });
  const usado = new Array(segs.length).fill(false);
  const linhas = [];
  for (let s = 0; s < segs.length; s++) {
    if (usado[s]) continue;
    usado[s] = true;
    const linha = [segs[s][0], segs[s][1]];
    for (const lado of [1, 0]) {
      for (;;) {
        const ponta = lado ? linha[linha.length - 1] : linha[0];
        const prox = (porPonta.get(k(ponta)) || []).find((idx) => !usado[idx]);
        if (prox === undefined) break;
        usado[prox] = true;
        const [a, b] = segs[prox];
        const novo = k(a) === k(ponta) ? b : a;
        if (lado) linha.push(novo); else linha.unshift(novo);
      }
    }
    linhas.push(linha);
  }
  return linhas
    .map((l) => "M" + l.map((pt) => `${pt[0].toFixed(1)} ${pt[1].toFixed(1)}`).join("L"))
    .join("");
}

const NIVEIS = 22;
const camadas = [];
for (let n = 1; n <= NIVEIS; n++) {
  const nivel = -0.3 + (n / NIVEIS) * 1.35;
  const d = contorno(nivel);
  if (!d) continue;
  const mestra = n % 5 === 0; // curva mestra, como nas cartas topográficas
  camadas.push(
    `<path d="${d}" stroke="${mestra ? "url(#topoMestra)" : "url(#topo)"}" stroke-width="${mestra ? 1.6 : 1}" fill="none"/>`,
  );
}

// ---------- SVG ----------
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <!-- Gerado por scripts/gerar-og-image.mjs — edite o script, não este arquivo. -->
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&amp;family=JetBrains+Mono:wght@500&amp;display=block');
      .nome { font-family: 'Fraunces', Georgia, serif; font-weight: 600; font-variation-settings: 'opsz' 72; }
      .sub { font-family: 'Fraunces', Georgia, serif; font-weight: 400; font-variation-settings: 'opsz' 48; }
      .mono { font-family: 'JetBrains Mono', ui-monospace, monospace; font-weight: 500; }
    </style>
    <radialGradient id="brilho" cx="${W * 0.82}" cy="${H * 0.42}" r="620" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#2800c9" stop-opacity="0.62"/>
      <stop offset="0.55" stop-color="#2800c9" stop-opacity="0.16"/>
      <stop offset="1" stop-color="#2800c9" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="fundo" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#05040F"/>
      <stop offset="1" stop-color="#0B0A1C"/>
    </linearGradient>
    <!-- as curvas somem à esquerda, atrás do texto -->
    <linearGradient id="topo" x1="0" y1="0" x2="${W}" y2="0" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#9C8BFF" stop-opacity="0.05"/>
      <stop offset="0.45" stop-color="#9C8BFF" stop-opacity="0.16"/>
      <stop offset="1" stop-color="#C9C0FF" stop-opacity="0.42"/>
    </linearGradient>
    <linearGradient id="topoMestra" x1="0" y1="0" x2="${W}" y2="0" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#ECEAFF" stop-opacity="0.07"/>
      <stop offset="0.45" stop-color="#ECEAFF" stop-opacity="0.25"/>
      <stop offset="1" stop-color="#FFFFFF" stop-opacity="0.65"/>
    </linearGradient>
    <linearGradient id="selo" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#9C8BFF"/>
      <stop offset="1" stop-color="#6C4DFF"/>
    </linearGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#fundo)"/>
  <rect width="${W}" height="${H}" fill="url(#brilho)"/>
  <g stroke-linejoin="round" stroke-linecap="round">
    ${camadas.join("\n    ")}
  </g>

  <!-- selo >_ (o mesmo de components/Logo.tsx) -->
  <g transform="translate(88 112) scale(3.25)">
    <rect x="0.5" y="0.5" width="31" height="31" rx="9" fill="url(#selo)"/>
    <rect x="0.5" y="0.5" width="31" height="31" rx="9" fill="none" stroke="#9C8BFF" stroke-opacity="0.55"/>
    <path d="M10 10.5 L16.5 16 L10 21.5" fill="none" stroke="#FFFFFF" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M19 21.5 H23" fill="none" stroke="#FFFFFF" stroke-width="2.6" stroke-linecap="round"/>
  </g>

  <text x="82" y="352" class="nome" font-size="118" letter-spacing="-0.5"><tspan fill="#B9ADFF">dev</tspan><tspan fill="#ECEAFF">concursado</tspan></text>

  <text class="sub" font-size="44" fill="#D9D4FF">
    <tspan x="86" y="436">Banco de questões, simulados e</tspan>
    <tspan x="86" y="492">revisão espaçada para concursos</tspan>
  </text>

  <text x="88" y="566" class="mono" font-size="24" fill="#9C8BFF" letter-spacing="0.5">questoes.mauriciosts.com</text>
</svg>
`;

writeFileSync(join(PUBLIC, "og-image.svg"), svg);

// ---------- render ----------
function render(svgTexto, largura, altura, saida) {
  // O Chromium em snap não lê /tmp; a pasta temporária fica dentro do projeto.
  const tmp = mkdtempSync(join(RAIZ, "og-tmp-"));
  try {
    const html = join(tmp, "p.html");
    writeFileSync(
      html,
      `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:#05040F;overflow:hidden}svg{display:block}</style></head><body>${svgTexto}</body></html>`,
    );
    execFileSync(
      CHROMIUM,
      [
        "--headless=new",
        "--disable-gpu",
        "--hide-scrollbars",
        "--force-device-scale-factor=1",
        "--virtual-time-budget=8000",
        `--window-size=${largura},${altura}`,
        `--screenshot=${join(tmp, "out.png")}`,
        `file://${html}`,
      ],
      { stdio: "ignore" },
    );
    // pngquant (apt install pngquant) reduz a paleta: o degradê cru passa de 450 KB, e os
    // robôs de preview desistem de imagens pesadas. Sem pngquant, copia o PNG cru.
    try {
      execFileSync("pngquant", ["--quality=80-95", "--speed=1", "--force", "--output", saida, join(tmp, "out.png")]);
    } catch {
      console.warn("pngquant indisponível; PNG sem compressão:", saida);
      execFileSync("cp", [join(tmp, "out.png"), saida]);
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

render(svg, W, H, join(PUBLIC, "og-image.png"));

// apple-touch-icon 180×180: o selo sem a borda arredondada (o iOS arredonda sozinho).
const icone = `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 32 32">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9C8BFF"/><stop offset="1" stop-color="#6C4DFF"/></linearGradient></defs>
  <rect width="32" height="32" fill="url(#g)"/>
  <path d="M10 10.5 L16.5 16 L10 21.5" fill="none" stroke="#FFFFFF" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M19 21.5 H23" fill="none" stroke="#FFFFFF" stroke-width="2.6" stroke-linecap="round"/>
</svg>`;
render(icone, 180, 180, join(PUBLIC, "apple-touch-icon.png"));

for (const f of ["og-image.svg", "og-image.png", "apple-touch-icon.png"]) {
  console.log(f, (statSync(join(PUBLIC, f)).size / 1024).toFixed(1), "KB");
}

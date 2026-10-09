// Recorta as folhas do menu de time (POKéMON) do GBA em peças para a lista do time da
// batalha: fundo do painel, cartão do líder, barras dos outros, versões selecionadas e
// selos de status. Entrada: assets/menus/{frlg,emerald}.png. Saída: public/fx/menu/<tema>/.
//
//   node tools/prepare-menus.mjs
//
// Como os gráficos de golpes, são assets da Nintendo/Game Freak: fora do git, só protótipo.
// Sem eles a lista do time continua com o visual normal do app.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(RAIZ, "assets/menus");
const OUT = path.join(RAIZ, "public/fx/menu");

// [x, y, w, h] na folha. O HP de 48 px de cada cartão foi medido nas folhas (trilho cinza).
const TEMAS = {
  frlg: {
    arquivo: "frlg.png",
    pecas: { fundo: [5, 5, 240, 160], lider: [317, 172, 84, 55], liderSel: [406, 170, 84, 57], barra: [162, 179, 150, 22], barraSel: [162, 203, 150, 24] },
  },
  emerald: {
    arquivo: "emerald.png",
    pecas: {
      fundo: [8, 24, 240, 160],
      lider: [256, 26, 78, 49], liderSel: [336, 26, 78, 49], liderCampo: [256, 82, 78, 49], liderCampoSel: [336, 82, 78, 49],
      barra: [256, 178, 142, 22], barraSel: [256, 202, 142, 22], barraCampo: [256, 226, 142, 22], barraCampoSel: [256, 250, 142, 22],
      // selos de status (Emerald tem, FRLG não: os dois temas usam estes)
      fnt: [14, 232, 20, 8], psn: [46, 232, 20, 8], par: [78, 232, 20, 8], slp: [110, 232, 20, 8], frz: [142, 232, 20, 8], brn: [174, 232, 20, 8],
    },
  },
};

for (const [tema, t] of Object.entries(TEMAS)) {
  const f = path.join(SRC, t.arquivo);
  if (!fs.existsSync(f)) {
    console.warn(`sem ${path.relative(RAIZ, f)}: tema ${tema} pulado`);
    continue;
  }
  const folha = PNG.sync.read(fs.readFileSync(f));
  const fundoFolha = [folha.data[0], folha.data[1], folha.data[2]];
  fs.mkdirSync(path.join(OUT, tema), { recursive: true });
  for (const [nome, [x0, y0, w, h]] of Object.entries(t.pecas)) {
    const p = new PNG({ width: w, height: h });
    PNG.bitblt(folha, p, x0, y0, w, h, 0, 0);
    if (nome !== "fundo") tirarFundo(p, fundoFolha);
    fs.writeFileSync(path.join(OUT, tema, `${nome}.png`), PNG.sync.write(p));
  }
  console.log(`${tema}: ${Object.keys(t.pecas).length} peças → ${path.relative(RAIZ, path.join(OUT, tema))}`);
}

// A cor de fundo da folha que encosta na borda da peça vira transparente (cantos
// arredondados, sobra em volta da Poké Ball); a mesma cor dentro do cartão fica.
function tirarFundo(p, [r, g, b]) {
  const { width: W, height: H, data: d } = p;
  const igual = (i) => d[i] === r && d[i + 1] === g && d[i + 2] === b && d[i + 3] > 0;
  const pilha = [];
  for (let x = 0; x < W; x++) pilha.push(x, (H - 1) * W + x);
  for (let y = 0; y < H; y++) pilha.push(y * W, y * W + W - 1);
  while (pilha.length) {
    const q = pilha.pop();
    if (!igual(q * 4)) continue;
    d[q * 4 + 3] = 0;
    const x = q % W;
    if (x > 0) pilha.push(q - 1);
    if (x < W - 1) pilha.push(q + 1);
    if (q >= W) pilha.push(q - W);
    if (q < W * (H - 1)) pilha.push(q + W);
  }
}

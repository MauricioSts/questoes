// Formato das receitas de animação com sprites (src/data/move-anims/<slug>.json) e do atlas
// gerado por tools/prepare-assets.mjs. Tempo sempre em quadros de 1/60 s; posição em pixels
// da tela do DS (256×192), escalados por um fator inteiro na arena.
//
// Receitas são escritas para "meu Pokémon ataca o inimigo" (usuário embaixo à esquerda, alvo
// em cima à direita). Quando o inimigo ataca, o player espelha x (e gira 180° os quadros de
// tela do DS), então a mesma receita serve aos dois lados.

export type Ease = "linear" | "in" | "out" | "inout";
export interface Track {
  keys: { t: number; v: number; ease?: Ease }[];
}

// user/target: centro do Pokémon. field-*: o chão sob ele. screen-center: meio da arena.
export type AnchorName = "user" | "target" | "field-user" | "field-target" | "screen-center";

export interface Layer {
  asset: string; // nome do arquivo no atlas, sem .png
  frame?: number; // quadro fixo
  frameSeq?: { frames: number[]; fps: number; loop?: boolean };
  anchor: AnchorName;
  to?: AnchorName; // com tracks.p (0..1): caminho de anchor até to
  arc?: number; // altura do arco do caminho (px DS, para cima)
  start: number;
  end: number;
  // partículas: `count` cópias com início a cada `interval` quadros, espalhadas em ±spread
  // (px DS) com seed fixa. frames: quadro sorteado por cópia. burst: px/quadro para fora do
  // centro (negativo = para dentro). vy / gravity: queda. spin: graus/quadro (sorteado ±).
  spawn?: {
    count: number;
    spread: number | [number, number];
    interval: number;
    life?: number;
    seed?: number;
    spin?: number;
    frames?: number[];
    burst?: number;
    vy?: number;
    vx?: number;
    gravity?: number;
  };
  // órbita: cada cópia gira em volta da âncora (fase dividida igualmente entre as cópias)
  orbit?: { rx: number; ry: number; speed: number };
  tracks?: { x?: Track; y?: Track; p?: Track; scale?: Track; rot?: Track; alpha?: Track };
  flipWithSide?: boolean; // espelhar o desenho quando o inimigo ataca (padrão: true)
  orient?: boolean; // girar o quadro na direção usuário → alvo
  ds?: boolean; // quadro é uma tela do DS: posição vem de ox/oy em torno do meio usuário–alvo
  blend?: "normal" | "add";
  z?: number; // camada do motor (1 rastro, 2 corpo, 3 impacto, 4 status, 5 clarão). Padrão 2
  perTarget?: boolean; // repete em cada alvo (golpes em área). Padrão: true se ancorado no alvo
  keepColor?: boolean; // não entra no recolor por tipo
  assetVirado?: string; // outra folha quando o inimigo usa (Substitute: costas × frente)
  // textura recortada na silhueta do Pokémon (mudança de atributo, cura): a folha é repetida
  // sobre o sprite e rola com `scroll` (px DS por quadro)
  maskActor?: "user" | "target";
  scroll?: { dx: number; dy: number };
}

export interface Shake {
  t: number;
  dur: number;
  amp: number; // px DS
}
export interface Flash {
  t: number;
  dur: number;
  color: string;
  alpha: number;
}
export interface Tint {
  start: number;
  end: number;
  color: string;
  alpha: number;
}

export interface MoveAnim {
  slug: string;
  duration: number;
  layers: Layer[];
  hits?: number[]; // quadros em que o golpe acerta (reação do alvo e "impacto" para a batalha)
  react?: "hit" | "status" | "self" | "none"; // como o alvo reage nos hits. Padrão: hit
  actor?: { who: "user" | "target"; t: number; kind: "lunge" | "shake" | "blink" | "hop" | "hide" | "show" | "dash"; dur?: number }[];
  screen?: { shake?: Shake[]; flash?: Flash[]; tint?: Tint[] };
  bg?: { asset: string; frame?: number; frames?: number[]; fps?: number; start: number; end: number; scroll?: { dx: number; dy: number }; alpha?: Track };
  sound?: string;
  pixel?: boolean; // peças Px-* desenhadas por tools/pixel-kit.mjs (não vêm dos jogos)
  approx?: boolean; // combinação de peças ou movimento inventado: não é a animação do jogo
  note?: string;
}

// ---------- atlas ----------

export interface QuadroAtlas {
  x: number;
  y: number;
  w: number;
  h: number;
  ox: number; // deslocamento do centro do quadro até o centro da célula (quadros de grade)
  oy: number;
  px: number;
  py: number;
}

export interface ArquivoAtlas {
  arquivo: string;
  tipo: "sprite-frames" | "particles" | "texture" | "background";
  w: number;
  h: number;
  celula?: [number, number];
  quadros: QuadroAtlas[];
}

export interface Atlas {
  versao: number;
  arquivos: Record<string, ArquivoAtlas>;
}

// ---------- mapa golpe → visual ----------

export type ModoVisual = "asset" | "approx" | "recolor" | "pixel" | "fallback";
export interface EntradaMapa {
  modo: ModoVisual;
  receita?: string; // slug da receita usada (a própria, ou a de outro golpe no recolor)
  tipo?: number; // recolor: tipo cuja paleta pinta a receita
  arquetipo: string;
}

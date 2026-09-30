// CATÁLOGO DE ITENS DA BATALHA: nomes, textos e o que cada um faz. Os ids são os da PokéAPI
// (o sprite vem de spriteItem(id)). O motor (motor.ts) lê os efeitos daqui; a tela, os textos.
//
// Categorias:
//   bola      lançada no selvagem, só se a resposta estiver certa
//   cura      usada da mochila durante a luta (HP, status, reviver, nível, pedra)
//   segurar   o Pokémon segura (um por Pokémon, escolhido no lobby) e o efeito é automático
//   fruta     segurada também; é comida quando a condição aparece e some
//   chave     item-chave: fica na mochila e vale para o time todo
//
// `min`: insígnias da região atual para o item começar a aparecer nas recompensas (como as
// lojas dos jogos, que vendem coisa melhor a cada cidade). `peso`: chance relativa no sorteio
// (0 = nunca sorteado: vem só de prêmio de ginásio).

export type CategoriaItem = "bola" | "cura" | "segurar" | "fruta" | "chave";

export interface InfoItem {
  nome: string;
  texto: string;
  cat: CategoriaItem;
  peso: number;
  min: number;
}

// Tipos (índices de NOME_TIPO em dex.ts)
const N = 0, FI = 1, WA = 2, EL = 3, GR = 4, IC = 5, FG = 6, PO = 7, GD = 8, FL = 9, PS = 10, BU = 11, RO = 12, GH = 13, DR = 14, DA = 15, ST = 16;
const NOME_TIPO_PT = ["Normal", "Fogo", "Água", "Elétrico", "Planta", "Gelo", "Lutador", "Venenoso", "Terrestre", "Voador", "Psíquico", "Inseto", "Pedra", "Fantasma", "Dragão", "Sombrio", "Aço", "Fada"];

// ---------- efeitos ----------

// Golpes de um tipo +20% (Charcoal, Mystic Water...).
export const REFORCO_TIPO: Record<string, number> = {
  "silk-scarf": N,
  charcoal: FI,
  "mystic-water": WA,
  magnet: EL,
  "miracle-seed": GR,
  "never-melt-ice": IC,
  "black-belt": FG,
  "poison-barb": PO,
  "soft-sand": GD,
  "sharp-beak": FL,
  "twisted-spoon": PS,
  "silver-powder": BU,
  "hard-stone": RO,
  "spell-tag": GH,
  "dragon-fang": DR,
  "black-glasses": DA,
  "metal-coat": ST,
};
// Frutas que cortam pela metade um golpe super efetivo do tipo (Chilan: Normal, qualquer um).
export const FRUTA_RESISTE: Record<string, number> = {
  "chilan-berry": N,
  "occa-berry": FI,
  "passho-berry": WA,
  "wacan-berry": EL,
  "rindo-berry": GR,
  "yache-berry": IC,
  "chople-berry": FG,
  "kebia-berry": PO,
  "shuca-berry": GD,
  "coba-berry": FL,
  "payapa-berry": PS,
  "tanga-berry": BU,
  "charti-berry": RO,
  "kasib-berry": GH,
  "haban-berry": DR,
  "colbur-berry": DA,
  "babiri-berry": ST,
};
// Frutas de status: qual condição curam ("*" = qualquer uma).
export const FRUTA_STATUS: Record<string, string> = {
  "cheri-berry": "paralysis",
  "chesto-berry": "sleep",
  "pecha-berry": "poison",
  "rawst-berry": "burn",
  "aspear-berry": "freeze",
  "lum-berry": "*",
};
// Frutas de HP: [limite do HP para comer (fração), cura (HP fixo se >= 1, fração do máximo se < 1)].
export const FRUTA_HP: Record<string, [number, number]> = {
  "oran-berry": [0.5, 10],
  "sitrus-berry": [0.5, 0.25],
  "figy-berry": [0.25, 0.125],
  "wiki-berry": [0.25, 0.125],
  "mago-berry": [0.25, 0.125],
  "aguav-berry": [0.25, 0.125],
  "iapapa-berry": [0.25, 0.125],
};
// Da mochila, na luta: cura de HP (Infinity = cheio).
export const CURA_ITEM: Record<string, number> = {
  potion: 20,
  "super-potion": 50,
  "hyper-potion": 200,
  "max-potion": Infinity,
  "full-restore": Infinity,
  "fresh-water": 50,
  "soda-pop": 60,
  lemonade: 80,
  "moomoo-milk": 100,
  "berry-juice": 20,
  "energy-powder": 50,
  "energy-root": 200,
};
// Da mochila: status que curam ("*" = todos). A Restauração Total cura HP e status.
export const CURA_STATUS: Record<string, string> = {
  antidote: "poison",
  "burn-heal": "burn",
  "paralyze-heal": "paralysis",
  awakening: "sleep",
  "ice-heal": "freeze",
  "full-heal": "*",
  "heal-powder": "*",
  "lava-cookie": "*",
  "old-gateau": "*",
  "full-restore": "*",
};
// Reviver: fração do HP com que o Pokémon volta.
export const REVIVER: Record<string, number> = { revive: 0.5, "max-revive": 1, "revival-herb": 1 };

// Prêmios dos ginásios: o 3º dá o Exp. Share (como a assistente do Professor nos jogos), o 6º
// o Exp. All. Todo líder também dá o item que reforça o tipo dele.
export const PREMIO_CHAVE: Record<number, string> = { 2: "exp-share", 5: "exp-all" };
export const REFORCO_DO_TIPO = (tipo: number) => Object.keys(REFORCO_TIPO).find((k) => REFORCO_TIPO[k] === tipo) ?? null;

// ---------- catálogo ----------

const it = (nome: string, texto: string, cat: CategoriaItem, peso: number, min = 0): InfoItem => ({ nome, texto, cat, peso, min });

const PEDRAS_TXT: [string, string, string][] = [
  ["fire-stone", "Pedra de Fogo", "Vulpix, Growlithe, Eevee"],
  ["water-stone", "Pedra d'Água", "Poliwhirl, Staryu, Eevee"],
  ["thunder-stone", "Pedra do Trovão", "Pikachu, Eevee"],
  ["leaf-stone", "Pedra da Folha", "Gloom, Weepinbell, Exeggcute"],
  ["moon-stone", "Pedra da Lua", "Clefairy, Nidorina, Nidorino"],
  ["sun-stone", "Pedra do Sol", "Gloom, Sunkern"],
  ["shiny-stone", "Pedra Brilhante", "Togetic, Roselia"],
  ["dusk-stone", "Pedra do Crepúsculo", "Murkrow, Misdreavus"],
  ["dawn-stone", "Pedra da Aurora", "Kirlia ♂, Snorunt ♀"],
  ["ice-stone", "Pedra de Gelo", "alguns Pokémon"],
];

const NOME_REFORCO: Record<string, string> = {
  "silk-scarf": "Lenço de Seda",
  charcoal: "Carvão",
  "mystic-water": "Água Mística",
  magnet: "Ímã",
  "miracle-seed": "Semente Milagrosa",
  "never-melt-ice": "Gelo Eterno",
  "black-belt": "Faixa Preta",
  "poison-barb": "Farpa Venenosa",
  "soft-sand": "Areia Macia",
  "sharp-beak": "Bico Afiado",
  "twisted-spoon": "Colher Torta",
  "silver-powder": "Pó Prateado",
  "hard-stone": "Pedra Dura",
  "spell-tag": "Etiqueta Maldita",
  "dragon-fang": "Presa de Dragão",
  "black-glasses": "Óculos Escuros",
  "metal-coat": "Revestimento Metálico",
};
const NOME_FRUTA_RESISTE: Record<string, string> = {
  "chilan-berry": "Fruta Chilan",
  "occa-berry": "Fruta Occa",
  "passho-berry": "Fruta Passho",
  "wacan-berry": "Fruta Wacan",
  "rindo-berry": "Fruta Rindo",
  "yache-berry": "Fruta Yache",
  "chople-berry": "Fruta Chople",
  "kebia-berry": "Fruta Kebia",
  "shuca-berry": "Fruta Shuca",
  "coba-berry": "Fruta Coba",
  "payapa-berry": "Fruta Payapa",
  "tanga-berry": "Fruta Tanga",
  "charti-berry": "Fruta Charti",
  "kasib-berry": "Fruta Kasib",
  "haban-berry": "Fruta Haban",
  "colbur-berry": "Fruta Colbur",
  "babiri-berry": "Fruta Babiri",
};

export const ITENS: Record<string, InfoItem> = {
  // bolas
  "poke-ball": it("Poké Bola", "Captura um Pokémon selvagem, se a resposta estiver certa.", "bola", 6),
  "great-ball": it("Grande Bola", "Captura com 1,5× mais chance.", "bola", 4, 1),
  "ultra-ball": it("Ultra Bola", "Captura com 2× mais chance.", "bola", 2, 3),
  "net-ball": it("Rede Bola", "3× mais chance em Pokémon de Água ou Inseto.", "bola", 2, 1),
  "nest-ball": it("Ninho Bola", "Quanto mais baixo o nível do selvagem, maior a chance (até 4×).", "bola", 2, 1),
  "quick-ball": it("Bola Rápida", "5× mais chance se lançada na primeira questão contra ele.", "bola", 2, 2),
  "timer-ball": it("Bola Timer", "A chance cresce a cada questão da luta (até 4×).", "bola", 2, 2),
  "dusk-ball": it("Bola Crepúsculo", "3,5× mais chance em Pokémon Fantasma ou Sombrio.", "bola", 1, 3),
  "repeat-ball": it("Bola Repetida", "3× mais chance em espécie que você já capturou.", "bola", 1, 3),
  "premier-ball": it("Bola Premier", "Uma Poké Bola comemorativa.", "bola", 1),
  "master-ball": it("Bola Mestra", "Captura sem falhar.", "bola", 0.1, 6),
  "safari-ball": it("Safari Ball", "Só na Zona Safári: captura com 1,5× mais chance.", "bola", 0),
  // cura
  potion: it("Poção", "+20 HP em um Pokémon.", "cura", 6),
  "super-potion": it("Super Poção", "+50 HP em um Pokémon.", "cura", 4, 1),
  "hyper-potion": it("Hiper Poção", "+200 HP em um Pokémon.", "cura", 2, 3),
  "max-potion": it("Poção Máxima", "Enche o HP de um Pokémon.", "cura", 1, 5),
  "full-restore": it("Restauração Total", "Enche o HP e tira qualquer status.", "cura", 0.6, 6),
  "fresh-water": it("Água Fresca", "+50 HP em um Pokémon.", "cura", 2, 1),
  "soda-pop": it("Refrigerante", "+60 HP em um Pokémon.", "cura", 1.5, 1),
  lemonade: it("Limonada", "+80 HP em um Pokémon.", "cura", 1, 2),
  "moomoo-milk": it("Leite Moomoo", "+100 HP em um Pokémon.", "cura", 1, 3),
  "berry-juice": it("Suco de Fruta", "+20 HP em um Pokémon.", "cura", 1),
  "energy-powder": it("Pó Energético", "+50 HP (é amargo).", "cura", 1, 1),
  "energy-root": it("Raiz Energética", "+200 HP (bem amarga).", "cura", 0.6, 4),
  antidote: it("Antídoto", "Cura o veneno.", "cura", 2),
  "burn-heal": it("Antiqueimadura", "Cura a queimadura.", "cura", 1.5),
  "paralyze-heal": it("Antiparalisia", "Cura a paralisia.", "cura", 1.5),
  awakening: it("Despertar", "Acorda um Pokémon.", "cura", 1.5),
  "ice-heal": it("Antigelo", "Descongela um Pokémon.", "cura", 1),
  "full-heal": it("Cura Total", "Tira veneno, queimadura, paralisia, sono e congelamento.", "cura", 2, 1),
  "heal-powder": it("Pó Curativo", "Tira qualquer status (é amargo).", "cura", 1, 1),
  "lava-cookie": it("Biscoito de Lava", "Tira qualquer status.", "cura", 0.6, 2),
  "old-gateau": it("Bolo Antigo", "Tira qualquer status.", "cura", 0.6, 4),
  revive: it("Reviver", "Levanta um Pokémon desmaiado com metade do HP.", "cura", 2),
  "max-revive": it("Reviver Máximo", "Levanta um Pokémon desmaiado com o HP cheio.", "cura", 0.6, 5),
  "revival-herb": it("Erva Reviver", "Levanta com o HP cheio (é muito amarga).", "cura", 0.5, 3),
  "rare-candy": it("Doce Raro", "Sobe um nível na hora (e pode evoluir). Respeita o level cap.", "cura", 1.5),
  ...Object.fromEntries(PEDRAS_TXT.map(([id, nome, ex]) => [id, it(nome, `Evolui certos Pokémon (ex.: ${ex}).`, "cura", 0.35)])),
  // segurar
  "exp-share": it("Exp. Share", "Segurando, ganha metade do XP das lutas mesmo sem lutar.", "segurar", 0),
  "lucky-egg": it("Ovo da Sorte", "Segurando, ganha 1,5× de XP.", "segurar", 0.4, 4),
  leftovers: it("Restos", "Recupera 1/16 do HP a cada questão.", "segurar", 0.6, 2),
  "shell-bell": it("Sino de Concha", "Recupera 1/8 do dano que causar.", "segurar", 0.6, 2),
  "big-root": it("Raiz Grande", "Golpes que drenam curam 30% a mais.", "segurar", 0.5, 1),
  "life-orb": it("Orbe da Vida", "Golpes +30%, mas perde 10% do HP a cada golpe que acerta.", "segurar", 0.3, 5),
  "choice-band": it("Faixa Escolhida", "Golpes físicos +50%.", "segurar", 0.3, 5),
  "choice-specs": it("Óculos Escolhidos", "Golpes especiais +50%.", "segurar", 0.3, 5),
  "muscle-band": it("Faixa Muscular", "Golpes físicos +10%.", "segurar", 0.6, 2),
  "wise-glasses": it("Óculos Sábios", "Golpes especiais +10%.", "segurar", 0.6, 2),
  "expert-belt": it("Cinto Perito", "Golpes super efetivos +20%.", "segurar", 0.5, 3),
  "scope-lens": it("Lente de Mira", "1 em 8 chance de crítico mesmo sem marcar certeza.", "segurar", 0.5, 3),
  "razor-claw": it("Garra Afiada", "1 em 8 chance de crítico mesmo sem marcar certeza.", "segurar", 0.3, 4),
  "focus-sash": it("Faixa do Foco", "Com metade do HP ou mais, aguenta com 1 HP um golpe que o derrubaria (e a faixa se gasta).", "segurar", 0.4, 3),
  "focus-band": it("Faixa de Foco", "1 em 10 chance de aguentar com 1 HP um golpe que o derrubaria.", "segurar", 0.5, 2),
  "bright-powder": it("Pó Brilhante", "1 em 10 chance de o contra-ataque errar.", "segurar", 0.5, 2),
  "kings-rock": it("Pedra do Rei", "1 em 10 chance de o inimigo recuar e não revidar.", "segurar", 0.5, 2),
  eviolite: it("Eviolite", "Quem ainda evolui leva 1/3 a menos de dano.", "segurar", 0.3, 4),
  everstone: it("Pedra Eterna", "Segurando, não evolui por nível.", "segurar", 0.6),
  "amulet-coin": it("Moeda Amuleto", "Com ela no time, as recompensas mostram 4 itens em vez de 3.", "segurar", 0.4, 1),
  ...Object.fromEntries(
    Object.entries(REFORCO_TIPO).map(([id, t]) => [id, it(NOME_REFORCO[id], `Segurando, golpes de ${NOME_TIPO_PT[t]} +20%.`, "segurar", 0.35, 1)])
  ),
  // frutas
  "oran-berry": it("Fruta Oran", "Segurando: com metade do HP ou menos, come e recupera 10 HP.", "fruta", 3),
  "sitrus-berry": it("Fruta Sitrus", "Segurando: com metade do HP ou menos, come e recupera 1/4 do HP.", "fruta", 1.5, 1),
  "figy-berry": it("Fruta Figy", "Segurando: com 1/4 do HP ou menos, recupera 1/8.", "fruta", 0.6, 1),
  "wiki-berry": it("Fruta Wiki", "Segurando: com 1/4 do HP ou menos, recupera 1/8.", "fruta", 0.6, 1),
  "mago-berry": it("Fruta Mago", "Segurando: com 1/4 do HP ou menos, recupera 1/8.", "fruta", 0.6, 1),
  "aguav-berry": it("Fruta Aguav", "Segurando: com 1/4 do HP ou menos, recupera 1/8.", "fruta", 0.6, 1),
  "iapapa-berry": it("Fruta Iapapa", "Segurando: com 1/4 do HP ou menos, recupera 1/8.", "fruta", 0.6, 1),
  "cheri-berry": it("Fruta Cheri", "Segurando: come e cura a paralisia.", "fruta", 1.2),
  "chesto-berry": it("Fruta Chesto", "Segurando: come e acorda.", "fruta", 1.2),
  "pecha-berry": it("Fruta Pecha", "Segurando: come e cura o veneno.", "fruta", 1.2),
  "rawst-berry": it("Fruta Rawst", "Segurando: come e cura a queimadura.", "fruta", 1.2),
  "aspear-berry": it("Fruta Aspear", "Segurando: come e descongela.", "fruta", 1),
  "lum-berry": it("Fruta Lum", "Segurando: come e cura qualquer status.", "fruta", 0.6, 3),
  ...Object.fromEntries(
    Object.entries(FRUTA_RESISTE).map(([id, t]) => [
      id,
      it(NOME_FRUTA_RESISTE[id], t === N ? "Segurando: corta pela metade um golpe Normal (uma vez)." : `Segurando: corta pela metade um golpe super efetivo de ${NOME_TIPO_PT[t]} (uma vez).`, "fruta", 0.3, 2),
    ])
  ),
  // chave
  "exp-all": it("Exp. All", "Item-chave: todo o time ganha metade do XP de cada luta, mesmo sem lutar. Dá para desligar no lobby.", "chave", 0),
};

export const nomeItem = (i: string) => ITENS[i]?.nome ?? i;
export const categoriaDe = (i: string): CategoriaItem | null => ITENS[i]?.cat ?? null;
export const seguravel = (i: string) => categoriaDe(i) === "segurar" || categoriaDe(i) === "fruta";

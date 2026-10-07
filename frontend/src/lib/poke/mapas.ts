// MAPAS DAS REGIÕES: esquema feito à mão (a PokéAPI não tem mapa nem coordenadas). Cada lugar
// é um nó com posição no quadro do mapa; as ligações são as estradas entre eles. Os nomes
// das rotas são os mesmos de src/data/rotas.json, então o mapa acompanha o modo história.
//
// Lugares sem ligação entre si (Kanto ↔ Ilhas Sevii) são de barco: o boneco some e reaparece.
import { REGIOES, caminhoConcluido, encontroDaVez, historiaDe, insigniasDe, ligaLiberada, regiaoAtual, rotaDoEncontro, rotasDoCaminho, type PartidaPoke, type PerfilPoke } from "./motor";
import { TRECHO_VITORIA, trechoDe } from "./rotas";

export type TipoLugar = "cidade" | "rota" | "lugar";
export type Ponto = [number, number];
export interface Lugar {
  id: string;
  x: number;
  y: number;
  tipo: TipoLugar;
  rotulo?: string; // nome curto no mapa
  rot?: [number, number, ("start" | "middle" | "end")?]; // onde vai o nome, relativo ao ponto
}
export interface OpcoesLigacao {
  via?: Ponto[]; // cotovelos da estrada, de A para B (as estradas são ortogonais)
  tipo?: "mar" | "sub"; // rota marítima ou passagem subterrânea
}
export type Ligacao = [string, string, OpcoesLigacao?];
export interface Quadro {
  titulo: string;
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface MapaRegiao {
  largura: number;
  altura: number;
  lugares: Lugar[];
  ligacoes: Ligacao[];
  terra: string; // path SVG do continente (o resto é mar)
  montanhas: string[];
  ilhotas: string[];
  ilhas?: Quadro & { terra: string[] }; // quadro à parte (de barco)
  entradas?: { lugar: string; x: number; y: number; rotulo: string; rot?: Lugar["rot"] }[]; // 2ª entrada de um lugar
  legenda: Ponto; // canto da caixa de legenda
  inicio: string; // onde a jornada começa
}

const c = (id: string, x: number, y: number, rot?: Lugar["rot"], rotulo?: string): Lugar => ({ id, x, y, tipo: "cidade", ...(rot ? { rot } : {}), ...(rotulo ? { rotulo } : {}) });
const r = (id: string, x: number, y: number): Lugar => ({ id, x, y, tipo: "rota" });
const l = (id: string, x: number, y: number, rotulo?: string, rot?: Lugar["rot"]): Lugar => ({ id, x, y, tipo: "lugar", ...(rotulo ? { rotulo } : {}), ...(rot ? { rot } : {}) });

// Kanto no estilo dos guias antigos: coluna oeste (Pewter–Viridian–Pallet–Cinnabar), linha
// norte (Pewter–Mt. Moon–Cerulean–Túnel), coluna central (Cerulean–Saffron–Vermilion), linha
// do meio (Celadon–Saffron–Lavender) e o litoral sul com Fuchsia e as rotas marítimas.
const KANTO: MapaRegiao = {
  largura: 620,
  altura: 610,
  inicio: "Pallet",
  terra:
    "M16 30 Q 160 16 300 26 T 604 24 L 606 300 Q 610 420 560 452 Q 500 470 480 510 Q 440 526 380 522 Q 300 528 238 518 Q 200 508 196 482 Q 186 466 150 470 Q 100 476 60 468 Q 30 462 14 470 Z",
  montanhas: [
    "M18 34 L 126 30 Q 138 70 120 112 Q 100 160 112 214 Q 92 250 22 262 Z",
    "M432 30 L 600 28 L 602 100 Q 560 104 520 92 Q 470 96 440 80 Q 428 56 432 30 Z",
    "M560 104 Q 584 100 604 104 L 604 300 Q 606 380 588 430 Q 566 410 562 330 Q 552 250 560 200 Q 548 150 560 104 Z",
  ],
  ilhotas: ["M128 548 Q 126 514 170 512 Q 218 514 216 546 Q 214 580 172 580 Q 130 580 128 548 Z", "M250 552 Q 250 536 270 536 Q 292 536 292 552 Q 292 566 270 566 Q 250 566 250 552 Z"],
  ilhas: {
    titulo: "Ilhas Sevii",
    x: 8,
    y: 470,
    w: 124,
    h: 134,
    terra: ["M18 520 Q 18 500 40 500 Q 112 498 116 518 Q 114 532 40 532 Q 18 532 18 520 Z", "M18 568 Q 20 552 36 552 Q 52 554 52 568 Q 50 600 34 600 Q 18 598 18 568 Z", "M80 556 Q 82 538 98 540 Q 116 542 114 560 L 114 590 Q 112 600 98 600 Q 82 600 80 590 Z"],
  },
  entradas: [{ lugar: "Caverna do Diglett", x: 200, y: 162, rotulo: "Caverna Diglett", rot: [13, 4, "start"] }],
  legenda: [486, 528],
  lugares: [
    c("Pallet", 165, 440, [18, 5, "start"]),
    r("Rota 1", 165, 380),
    c("Viridian", 165, 318, [18, 5, "start"]),
    r("Rota 22", 102, 318),
    r("Rota 23", 45, 262),
    l("Estrada Vitória", 45, 182, "Rota Vitória", [14, 4, "start"]),
    c("Platô Indigo", 45, 98, [-14, -22, "start"], "Platô Índigo"),
    r("Rota 2", 165, 262),
    l("Floresta de Viridian", 165, 205, "Floresta", [-14, 4, "end"]),
    c("Pewter", 165, 128, [-18, 5, "end"]),
    r("Rota 3", 222, 128),
    l("Mt. Moon", 282, 128, "Mt. Moon", [0, -16]),
    r("Rota 4", 340, 128),
    c("Cerulean", 397, 128, [16, -16, "start"]),
    r("Rota 24 (Ponte Pepita)", 397, 88),
    r("Rota 25", 458, 56),
    r("Rota 9", 463, 128),
    l("Túnel de Pedra", 530, 128, "Túnel", [0, -16]),
    r("Rota 10", 530, 185),
    l("Usina Elétrica", 580, 185, "Usina", [0, -15]),
    c("Lavender", 530, 243, [-16, 30, "end"]),
    l("Torre Pokémon", 580, 243, "Torre", [0, 24]),
    r("Rota 8", 464, 243),
    c("Saffron", 397, 243, [16, -18, "start"]),
    r("Rota 5", 397, 185),
    r("Rota 7", 338, 243),
    c("Celadon", 280, 243, [0, -21]),
    r("Rota 16", 245, 243),
    r("Rota 17 (Ciclovia)", 220, 372),
    r("Rota 18", 292, 492),
    c("Fuchsia", 370, 492, [-18, 30, "end"]),
    l("Zona Safári", 370, 440, "Safári", [-14, 4, "end"]),
    r("Rota 6", 397, 306),
    c("Vermilion", 397, 370, [-18, 5, "end"]),
    r("Rota 11", 470, 370),
    l("Caverna do Diglett", 430, 398, "Diglett", [0, 23]),
    r("Rota 12", 530, 312),
    r("Rota 13", 492, 430),
    r("Rota 14", 450, 462),
    r("Rota 15", 412, 492),
    r("Rota Marítima 19", 370, 524),
    r("Rota Marítima 20", 322, 552),
    l("Ilhas Seafoam", 270, 552, "Seafoam", [0, 26]),
    c("Cinnabar", 165, 552, [0, 34]),
    l("Mansão Pokémon", 200, 530, "Mansão", [13, -6, "start"]),
    r("Rota Marítima 21", 165, 496),
    // Ilhas Sevii (quadro à parte, de barco)
    l("Estrada Kindle (Ilha 1)", 34, 516, "Ilha 1", [0, -11]),
    l("Monte Ember", 98, 516, "Ember", [0, -11]),
    l("Praia do Tesouro", 35, 564, "Praia", [0, -11]),
    l("Cabo Brink (Ilha 2)", 97, 556, "Ilha 2", [0, -11]),
    l("Ponte Bond (Ilha 3)", 97, 586, "Ilha 3", [0, 16]),
    l("Floresta das Frutas", 35, 586, "Frutas", [0, 16]),
  ],
  ligacoes: [
    ["Pallet", "Rota 1"],
    ["Rota 1", "Viridian"],
    ["Viridian", "Rota 22"],
    ["Rota 22", "Rota 23", { via: [[45, 318]] }],
    ["Rota 23", "Estrada Vitória"],
    ["Estrada Vitória", "Platô Indigo"],
    ["Viridian", "Rota 2"],
    ["Rota 2", "Floresta de Viridian"],
    ["Floresta de Viridian", "Pewter"],
    ["Pewter", "Rota 3"],
    ["Rota 3", "Mt. Moon"],
    ["Mt. Moon", "Rota 4"],
    ["Rota 4", "Cerulean"],
    ["Cerulean", "Rota 24 (Ponte Pepita)"],
    ["Rota 24 (Ponte Pepita)", "Rota 25", { via: [[397, 56]] }],
    ["Cerulean", "Rota 5"],
    ["Rota 5", "Saffron"],
    ["Saffron", "Rota 6"],
    ["Rota 6", "Vermilion"],
    ["Vermilion", "Rota 11"],
    ["Vermilion", "Caverna do Diglett", { via: [[430, 370]] }],
    ["Caverna do Diglett", "Rota 2", { tipo: "sub", via: [[200, 162]] }],
    ["Cerulean", "Rota 9"],
    ["Rota 9", "Túnel de Pedra"],
    ["Túnel de Pedra", "Rota 10"],
    ["Rota 10", "Usina Elétrica"],
    ["Rota 10", "Lavender"],
    ["Lavender", "Torre Pokémon"],
    ["Lavender", "Rota 8"],
    ["Rota 8", "Saffron"],
    ["Saffron", "Rota 7"],
    ["Rota 7", "Celadon"],
    ["Celadon", "Rota 16"],
    ["Rota 16", "Rota 17 (Ciclovia)", { via: [[220, 243]] }],
    ["Rota 17 (Ciclovia)", "Rota 18", { via: [[220, 492]] }],
    ["Rota 18", "Fuchsia"],
    ["Fuchsia", "Zona Safári"],
    ["Lavender", "Rota 12"],
    ["Rota 12", "Rota 11", { via: [[530, 370]] }],
    ["Rota 12", "Rota 13", { via: [[530, 430]] }],
    ["Rota 13", "Rota 14", { via: [[450, 430]] }],
    ["Rota 14", "Rota 15", { via: [[450, 492]] }],
    ["Rota 15", "Fuchsia"],
    ["Fuchsia", "Rota Marítima 19", { tipo: "mar" }],
    ["Rota Marítima 19", "Rota Marítima 20", { tipo: "mar", via: [[370, 552]] }],
    ["Rota Marítima 20", "Ilhas Seafoam", { tipo: "mar" }],
    ["Ilhas Seafoam", "Cinnabar", { tipo: "mar" }],
    ["Cinnabar", "Mansão Pokémon"],
    ["Cinnabar", "Rota Marítima 21", { tipo: "mar" }],
    ["Rota Marítima 21", "Pallet", { tipo: "mar" }],
    ["Estrada Kindle (Ilha 1)", "Praia do Tesouro"],
    ["Estrada Kindle (Ilha 1)", "Monte Ember"],
    ["Estrada Kindle (Ilha 1)", "Cabo Brink (Ilha 2)", { tipo: "mar", via: [[66, 516], [66, 556]] }],
    ["Cabo Brink (Ilha 2)", "Ponte Bond (Ilha 3)"],
    ["Ponte Bond (Ilha 3)", "Floresta das Frutas", { tipo: "mar" }],
  ],
};

const MAPAS: Record<number, MapaRegiao> = { 0: KANTO };
export const mapaDaRegiao = (regiao: number): MapaRegiao | null => MAPAS[regiao] ?? null;

// Número que vai escrito no meio do trecho ("Rota Marítima 19" → "19").
export const numeroDaRota = (id: string) => /^Rota(?: Marítima)? (\d+)/.exec(id)?.[1] ?? null;

// Os pontos de uma ligação, de A para B (com os cotovelos), ou null se não há ligação direta.
export function pontosDaLigacao(mapa: MapaRegiao, a: string, b: string): Ponto[] | null {
  const lig = mapa.ligacoes.find(([p, q]) => (p === a && q === b) || (p === b && q === a));
  const pa = mapa.lugares.find((x) => x.id === a);
  const pb = mapa.lugares.find((x) => x.id === b);
  if (!lig || !pa || !pb) return null;
  const via = lig[2]?.via ?? [];
  return [[pa.x, pa.y], ...(lig[0] === a ? via : [...via].reverse()), [pb.x, pb.y]];
}

// Caminho mais curto (em número de ligações) de um lugar a outro. null = não há caminho por
// terra (barco).
export function caminhoNoMapa(mapa: MapaRegiao, de: string, para: string): string[] | null {
  if (de === para) return [de];
  const viz = new Map<string, string[]>();
  for (const [a, b] of mapa.ligacoes) {
    viz.set(a, [...(viz.get(a) ?? []), b]);
    viz.set(b, [...(viz.get(b) ?? []), a]);
  }
  const veio = new Map<string, string>([[de, de]]);
  const fila = [de];
  while (fila.length) {
    const u = fila.shift()!;
    for (const v of viz.get(u) ?? []) {
      if (veio.has(v)) continue;
      veio.set(v, u);
      if (v === para) {
        const cam = [para];
        while (cam[0] !== de) cam.unshift(veio.get(cam[0])!);
        return cam;
      }
      fila.push(v);
    }
  }
  return null;
}

export interface PosicaoNoMapa {
  regiao: number;
  aqui: string; // onde o boneco está
  destino: string | null; // a cidade do próximo ginásio (ou o Platô Indigo)
  visitados: string[]; // lugares por onde a jornada já passou
  trilha: [string, string][]; // ligações já percorridas
  insignias: string[]; // cidades com a insígnia já ganha
}

// Onde o jogador está: numa partida do modo história, na rota do encontro da vez; fora dela,
// pelo progresso do perfil (cidade do último ginásio, rota do caminho, cidade do próximo).
export function posicaoNoMapa(perfil: PerfilPoke, partida: PartidaPoke | null): PosicaoNoMapa | null {
  const reg = regiaoAtual(perfil);
  const mapa = mapaDaRegiao(reg);
  if (!mapa) return null;
  const regiao = REGIOES[reg];
  const ins = insigniasDe(perfil, reg);
  const proximo = regiao.ginasios[ins];
  const destino = proximo ? proximo.cidade : "Platô Indigo";
  const existe = (id: string | undefined): id is string => !!id && mapa.lugares.some((x) => x.id === id);

  const insignias = regiao.ginasios.slice(0, ins).map((g) => g.cidade);
  let aqui: string | undefined;
  const emJogo = partida && !partida.fim && (partida.regiao ?? 0) === reg ? partida : null;
  if (emJogo && (emJogo.modo ?? "rota") === "rota") {
    const e = emJogo.parada ? encontroDaVez(emJogo) : emJogo.atual;
    aqui = rotaDoEncontro(emJogo, e)?.nome;
  } else if (emJogo?.modo === "ginasio" && emJogo.ginasio !== undefined) aqui = regiao.ginasios[emJogo.ginasio]?.cidade;
  else if (emJogo?.modo === "liga") aqui = "Platô Indigo";
  else if (emJogo?.modo === "safari") aqui = "Zona Safári";

  const caminho = rotasDoCaminho(perfil);
  const h = historiaDe(perfil, reg);
  if (!existe(aqui)) {
    if (proximo && caminhoConcluido(perfil, reg)) aqui = proximo.cidade;
    else if (!proximo && ligaLiberada(perfil) && h > 0) aqui = caminho?.rotas[caminho.atual];
    else if (h === 0) aqui = ins > 0 ? regiao.ginasios[ins - 1].cidade : mapa.inicio;
    else aqui = caminho?.rotas[caminho.atual];
  }
  if (!existe(aqui)) aqui = mapa.inicio;

  // A trilha: Pallet, as rotas de cada trecho e a cidade de cada ginásio, na ordem do jogo,
  // até onde ele está. Entre uma parada e outra, o caminho mais curto do mapa (passa pelas
  // cidades do meio, como Saffron entre a Rota 5 e a Rota 6).
  const paradas = [mapa.inicio];
  for (let i = 0; i < ins; i++) paradas.push(...(trechoDe(reg, i)?.rotas ?? []).map((x) => x.nome), regiao.ginasios[i].cidade);
  const nomes = (trechoDe(reg, proximo ? ins : TRECHO_VITORIA)?.rotas ?? []).map((x) => x.nome);
  const k = nomes.indexOf(aqui);
  if (k >= 0) paradas.push(...nomes.slice(0, k + 1));
  else if (aqui === destino) paradas.push(...nomes, aqui);
  const visitados = new Set<string>();
  const trilha: [string, string][] = [];
  paradas.filter(existe).forEach((id, i, lista) => {
    visitados.add(id);
    if (!i) return;
    const cam = caminhoNoMapa(mapa, lista[i - 1], id);
    cam?.forEach((x, j) => {
      visitados.add(x);
      if (j) trilha.push([cam[j - 1], x]);
    });
  });
  visitados.add(aqui);
  return { regiao: reg, aqui, destino, visitados: [...visitados], trilha, insignias };
}

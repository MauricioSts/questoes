// MAPAS DAS REGIÕES: esquema feito à mão (a PokéAPI não tem mapa nem coordenadas). Cada lugar
// é um nó com posição num quadro de 640×540; as ligações são os caminhos entre eles. Os nomes
// das rotas são os mesmos de src/data/rotas.json, então o mapa acompanha o modo história.
//
// Lugares sem ligação entre si (Kanto ↔ Ilhas Sevii) são de barco: o boneco some e reaparece.
import { REGIOES, caminhoConcluido, encontroDaVez, historiaDe, insigniasDe, ligaLiberada, regiaoAtual, rotaDoEncontro, rotasDoCaminho, type PartidaPoke, type PerfilPoke } from "./motor";
import { TRECHO_VITORIA, trechoDe } from "./rotas";

export type TipoLugar = "cidade" | "rota" | "lugar";
export interface Lugar {
  id: string;
  x: number;
  y: number;
  tipo: TipoLugar;
  rotulo?: string; // nome curto no mapa (as cidades sempre mostram)
}
export interface MapaRegiao {
  largura: number;
  altura: number;
  lugares: Lugar[];
  ligacoes: [string, string, "subterraneo"?][];
  ilhas?: { titulo: string; x: number; y: number; w: number; h: number };
  mar: string; // path SVG da água
  inicio: string; // onde a jornada começa
}

const c = (id: string, x: number, y: number): Lugar => ({ id, x, y, tipo: "cidade" });
const r = (id: string, x: number, y: number): Lugar => ({ id, x, y, tipo: "rota" });
const l = (id: string, x: number, y: number, rotulo?: string): Lugar => ({ id, x, y, tipo: "lugar", ...(rotulo ? { rotulo } : {}) });

const KANTO: MapaRegiao = {
  largura: 640,
  altura: 540,
  inicio: "Pallet",
  mar: "M0 455 C 120 440 220 450 300 455 S 420 470 440 445 L 440 540 L 0 540 Z M0 370 C 40 370 70 380 85 400 L 85 470 L 0 470 Z",
  ilhas: { titulo: "Ilhas Sevii", x: 455, y: 436, w: 178, h: 98 },
  lugares: [
    c("Pallet", 110, 400),
    r("Rota 1", 110, 345),
    c("Viridian", 110, 290),
    r("Rota 22", 60, 290),
    r("Rota 23", 55, 220),
    l("Estrada Vitória", 55, 150, "Vitória"),
    c("Platô Indigo", 62, 70),
    r("Rota 2", 110, 235),
    l("Floresta de Viridian", 110, 185, "Floresta"),
    c("Pewter", 110, 130),
    r("Rota 3", 175, 130),
    l("Mt. Moon", 238, 112, "Mt. Moon"),
    r("Rota 4", 300, 110),
    c("Cerulean", 360, 110),
    r("Rota 24 (Ponte Pepita)", 360, 60),
    r("Rota 25", 425, 40),
    r("Rota 9", 435, 110),
    r("Rota 10", 510, 110),
    l("Usina Elétrica", 570, 140, "Usina"),
    l("Túnel de Pedra", 510, 162, "Túnel"),
    c("Lavender", 510, 215),
    l("Torre Pokémon", 568, 215, "Torre"),
    r("Rota 8", 435, 215),
    c("Saffron", 360, 215),
    r("Rota 5", 360, 162),
    r("Rota 7", 295, 215),
    c("Celadon", 230, 215),
    r("Rota 16", 170, 215),
    r("Rota 17 (Ciclovia)", 170, 320),
    r("Rota 18", 220, 410),
    c("Fuchsia", 290, 410),
    l("Zona Safári", 290, 360, "Safári"),
    r("Rota 6", 360, 265),
    c("Vermilion", 360, 315),
    r("Rota 11", 435, 315),
    l("Caverna do Diglett", 250, 285, "Diglett"),
    r("Rota 12", 510, 290),
    r("Rota 13", 480, 350),
    r("Rota 14", 425, 385),
    r("Rota 15", 360, 410),
    r("Rota Marítima 19", 290, 470),
    r("Rota Marítima 20", 245, 490),
    l("Ilhas Seafoam", 190, 490, "Seafoam"),
    c("Cinnabar", 110, 490),
    l("Mansão Pokémon", 48, 490, "Mansão"),
    r("Rota Marítima 21", 110, 445),
    // Ilhas Sevii (quadro à parte, de barco)
    l("Estrada Kindle (Ilha 1)", 485, 470, "Ilha 1"),
    l("Praia do Tesouro", 490, 512, "Praia"),
    l("Monte Ember", 535, 462, "Ember"),
    l("Cabo Brink (Ilha 2)", 565, 505, "Ilha 2"),
    l("Ponte Bond (Ilha 3)", 605, 472, "Ilha 3"),
    l("Floresta das Frutas", 612, 515, "Frutas"),
  ],
  ligacoes: [
    ["Pallet", "Rota 1"],
    ["Rota 1", "Viridian"],
    ["Viridian", "Rota 22"],
    ["Rota 22", "Rota 23"],
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
    ["Rota 24 (Ponte Pepita)", "Rota 25"],
    ["Cerulean", "Rota 5"],
    ["Rota 5", "Saffron"],
    ["Saffron", "Rota 6"],
    ["Rota 6", "Vermilion"],
    ["Vermilion", "Rota 11"],
    ["Vermilion", "Caverna do Diglett", "subterraneo"],
    ["Caverna do Diglett", "Rota 2", "subterraneo"],
    ["Cerulean", "Rota 9"],
    ["Rota 9", "Rota 10"],
    ["Rota 10", "Usina Elétrica"],
    ["Rota 10", "Túnel de Pedra"],
    ["Túnel de Pedra", "Lavender"],
    ["Lavender", "Torre Pokémon"],
    ["Lavender", "Rota 8"],
    ["Rota 8", "Saffron"],
    ["Saffron", "Rota 7"],
    ["Rota 7", "Celadon"],
    ["Celadon", "Rota 16"],
    ["Rota 16", "Rota 17 (Ciclovia)"],
    ["Rota 17 (Ciclovia)", "Rota 18"],
    ["Rota 18", "Fuchsia"],
    ["Fuchsia", "Zona Safári"],
    ["Lavender", "Rota 12"],
    ["Rota 12", "Rota 11"],
    ["Rota 12", "Rota 13"],
    ["Rota 13", "Rota 14"],
    ["Rota 14", "Rota 15"],
    ["Rota 15", "Fuchsia"],
    ["Fuchsia", "Rota Marítima 19"],
    ["Rota Marítima 19", "Rota Marítima 20"],
    ["Rota Marítima 20", "Ilhas Seafoam"],
    ["Ilhas Seafoam", "Cinnabar"],
    ["Cinnabar", "Mansão Pokémon"],
    ["Cinnabar", "Rota Marítima 21"],
    ["Rota Marítima 21", "Pallet"],
    ["Estrada Kindle (Ilha 1)", "Praia do Tesouro"],
    ["Estrada Kindle (Ilha 1)", "Monte Ember"],
    ["Estrada Kindle (Ilha 1)", "Cabo Brink (Ilha 2)"],
    ["Cabo Brink (Ilha 2)", "Ponte Bond (Ilha 3)"],
    ["Ponte Bond (Ilha 3)", "Floresta das Frutas"],
  ],
};

const MAPAS: Record<number, MapaRegiao> = { 0: KANTO };
export const mapaDaRegiao = (regiao: number): MapaRegiao | null => MAPAS[regiao] ?? null;

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

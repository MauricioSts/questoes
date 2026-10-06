// AS ROTAS DO MODO HISTÓRIA: o caminho de cada região, trecho a trecho, como nos jogos
// (Rota 1 → Rota 22 → Rota 2 → Floresta de Viridian → Pewter...), com os selvagens de cada
// rota e a chance de cada um. Dados em src/data/rotas.json, gerados por
// scripts/gerar-rotas.mjs a partir das tabelas de encontro da PokéAPI.
//
// O trecho é escolhido pelo ginásio para onde o caminho leva (`rumo`; a Estrada Vitória é o
// índice 8) e a rota dentro dele pelo progresso: cada treinador vencido anda um pedaço.
import dados from "../../data/rotas.json";

// [espécie, chance %, nível mínimo, nível máximo]
export type Selvagem = [number, number, number, number];
export interface Rota {
  nome: string;
  s: Selvagem[];
}
export interface Trecho {
  rumo: number;
  rotas: Rota[];
}

const REGIOES = (dados as unknown as { regioes: Trecho[][] }).regioes;
export const TRECHO_VITORIA = 8;

export function trechoDe(regiao: number, rumo: number | undefined): Trecho | null {
  const trechos = REGIOES[regiao];
  if (!trechos) return null;
  return trechos[rumo ?? TRECHO_VITORIA] ?? null;
}

// Rota em que o jogador está: `passo` treinadores vencidos de `total` no trecho.
export function indiceDaRota(trecho: Trecho, passo: number, total: number): number {
  const n = trecho.rotas.length;
  if (n <= 1 || total <= 0) return 0;
  return Math.max(0, Math.min(n - 1, Math.floor((passo * n) / total)));
}

// Sorteio pela chance dos jogos (o Pidgey da Rota 1 aparece mais que o Rattata raro).
export function sortearSelvagem(rota: Rota, r01: number, evitar?: (id: number) => boolean): Selvagem {
  const lista = evitar ? rota.s.filter(([id]) => !evitar(id)) : rota.s;
  const todas = lista.length ? lista : rota.s;
  const total = todas.reduce((a, x) => a + x[1], 0);
  let r = r01 * total;
  for (const x of todas) if ((r -= x[1]) < 0) return x;
  return todas[todas.length - 1];
}

// Pokédex: em que rotas do modo história a espécie aparece, por região (na ordem do caminho,
// sem repetir). Calculado uma vez.
let onde: Map<number, { regiao: number; rotas: string[] }[]> | null = null;
export function ondeEncontrar(id: number): { regiao: number; rotas: string[] }[] {
  if (!onde) {
    onde = new Map();
    REGIOES.forEach((trechos, regiao) => {
      for (const t of trechos)
        for (const rota of t.rotas)
          for (const [esp] of rota.s) {
            const lista = onde!.get(esp) ?? [];
            let r = lista.find((x) => x.regiao === regiao);
            if (!r) lista.push((r = { regiao, rotas: [] }));
            if (!r.rotas.includes(rota.nome)) r.rotas.push(rota.nome);
            onde!.set(esp, lista);
          }
    });
  }
  return onde.get(id) ?? [];
}

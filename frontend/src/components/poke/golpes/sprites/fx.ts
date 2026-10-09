// Carregador dos sprites de golpes: atlas (public/fx/fx-atlas.json), imagens, receitas e o
// mapa golpe → visual. Tudo é opcional: sem atlas (deploy sem os assets, teste sem rede) ou
// com a imagem ainda baixando, `receitaPronta` devolve null e o motor toca o efeito
// procedural de sempre. Nenhum nome de arquivo fica no código: vem do atlas e das receitas.
//
// A pasta é trocável: VITE_FX_BASE aponta para outro lugar (CDN, outra versão dos assets)
// sem mexer no código. Os assets atuais são da Nintendo/Game Freak, só para protótipo local.
import mapaJson from "../../../../data/move-anim-map.json";
import { PALETA_TIPO } from "../spec";
import type { Atlas, EntradaMapa, MoveAnim } from "./tipos";

const RECEITAS = import.meta.glob<MoveAnim>("../../../../data/move-anims/*.json", { eager: true, import: "default" });
export const RECEITA_POR_SLUG = new Map<string, MoveAnim>(Object.values(RECEITAS).map((r) => [r.slug, r]));
export const MAPA = mapaJson as unknown as Record<string, EntradaMapa>;

const BASE: string = (import.meta.env?.VITE_FX_BASE as string | undefined) ?? `${import.meta.env?.BASE_URL ?? "/"}fx/`;

type Imagem = HTMLImageElement | HTMLCanvasElement;

export class SpritesFx {
  atlas: Atlas | null = null;
  private imgs = new Map<string, HTMLImageElement>();
  private carregando = new Map<string, Promise<void>>();
  private recolor = new Map<string, HTMLCanvasElement>();
  private iniciado: Promise<void> | null = null;
  falhou = false;
  ativo = true; // Move Lab desliga para comparar com o procedural

  constructor(private base = BASE) {}

  // Busca o atlas e começa a baixar todas as folhas em segundo plano (são ~3 MB no total).
  iniciar(): Promise<void> {
    if (this.iniciado) return this.iniciado;
    if (typeof fetch !== "function" || typeof Image === "undefined") return (this.iniciado = Promise.resolve());
    this.iniciado = fetch(`${this.base}fx-atlas.json`)
      .then((r) => (r.ok ? (r.json() as Promise<Atlas>) : Promise.reject(new Error(`atlas ${r.status}`))))
      .then((a) => {
        this.atlas = a;
        for (const nome of Object.keys(a.arquivos)) void this.carregar(nome);
      })
      .catch(() => {
        this.falhou = true; // sem assets: procedural para tudo
      });
    return this.iniciado;
  }

  carregar(nome: string): Promise<void> {
    const ja = this.carregando.get(nome);
    if (ja) return ja;
    const arq = this.atlas?.arquivos[nome];
    if (!arq) return Promise.resolve();
    const p = new Promise<void>((ok) => {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => {
        this.imgs.set(nome, img);
        ok();
      };
      img.onerror = () => ok();
      img.src = `${this.base}${arq.arquivo}`;
    });
    this.carregando.set(nome, p);
    return p;
  }

  // Pré-carrega o que um conjunto de golpes usa (time do jogador, golpes do inimigo).
  async preCarregar(slugs: string[]) {
    await this.iniciar();
    const nomes = new Set<string>();
    for (const s of slugs) for (const n of this.assetsDe(this.receitaDe(s)?.anim)) nomes.add(n);
    await Promise.all([...nomes].map((n) => this.carregar(n)));
  }

  entrada(slug: string): EntradaMapa | undefined {
    return MAPA[slug];
  }

  receitaDe(slug: string): { anim: MoveAnim; tipo?: number; entrada: EntradaMapa } | null {
    const e = MAPA[slug];
    if (!e || e.modo === "fallback" || !e.receita) return null;
    const anim = RECEITA_POR_SLUG.get(e.receita);
    return anim ? { anim, tipo: e.tipo, entrada: e } : null;
  }

  assetsDe(anim: MoveAnim | undefined): string[] {
    if (!anim) return [];
    const s = new Set(anim.layers.map((l) => l.asset));
    if (anim.bg) s.add(anim.bg.asset);
    return [...s];
  }

  // A receita do golpe, se o atlas e todas as imagens dela já estão prontos. Senão null (e o
  // que faltar começa a carregar, para a próxima vez).
  receitaPronta(slug: string): { anim: MoveAnim; tipo?: number } | null {
    if (!this.ativo || !this.atlas) return null;
    const r = this.receitaDe(slug);
    if (!r) return null;
    let ok = true;
    for (const n of this.assetsDe(r.anim)) {
      if (!this.atlas.arquivos[n]) return null;
      if (!this.imgs.has(n)) {
        ok = false;
        void this.carregar(n);
      }
    }
    return ok ? r : null;
  }

  // A folha, ou a versão pintada com a paleta de um tipo (gradient map por luminância: o
  // pixel continua do mesmo tamanho e no mesmo lugar, só muda a cor).
  imagem(nome: string, tipo?: number): Imagem | null {
    const img = this.imgs.get(nome);
    if (!img || tipo === undefined) return img ?? null;
    const chave = `${nome}|${tipo}`;
    let c = this.recolor.get(chave);
    if (!c) {
      c = pintar(img, PALETA_TIPO[tipo] ?? PALETA_TIPO[0]);
      this.recolor.set(chave, c);
    }
    return c;
  }
}

function hex(c: string): [number, number, number] {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function pintar(img: HTMLImageElement, [primaria, clara, escura]: [string, string, string]): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const g = c.getContext("2d", { willReadFrequently: true })!;
  g.drawImage(img, 0, 0);
  const dados = g.getImageData(0, 0, c.width, c.height);
  const d = dados.data;
  const e = hex(escura);
  const paradas: [number, [number, number, number]][] = [
    [0, [e[0] * 0.3, e[1] * 0.3, e[2] * 0.3]],
    [0.35, e],
    [0.6, hex(primaria)],
    [0.85, hex(clara)],
    [1, [255, 255, 255]],
  ];
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) continue;
    const l = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255;
    let k = 1;
    while (k < paradas.length - 1 && l > paradas[k][0]) k++;
    const [t0, c0] = paradas[k - 1];
    const [t1, c1] = paradas[k];
    const f = Math.min(1, Math.max(0, (l - t0) / (t1 - t0)));
    d[i] = c0[0] + (c1[0] - c0[0]) * f;
    d[i + 1] = c0[1] + (c1[1] - c0[1]) * f;
    d[i + 2] = c0[2] + (c1[2] - c0[2]) * f;
  }
  g.putImageData(dados, 0, 0);
  return c;
}

// Uma instância para o app inteiro: as imagens e os recolores ficam em cache entre batalhas.
export const spritesFx = new SpritesFx();

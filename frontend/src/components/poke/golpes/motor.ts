// MOTOR VISUAL DOS GOLPES. Recebe "o golpe X foi usado por A contra B com este resultado"
// e toca a animação num canvas sobre a arena. Não sabe nada de dano nem de regra: só desenha.
//
// - Tempo próprio (`agora`, em ms de motor): os runners esperam com `k.esperar`, que é
//   resolvido pelo tick. Por isso dá para pular (tudo resolve na hora), acelerar e testar
//   sem navegador (o teste chama tick() à mão).
// - Partículas num pool fixo (sem alocar por frame), com teto por golpe: 150, ou 400 no épico.
// - Camadas, de baixo para cima: 0 tinta de fundo, 1 rastro, 2 corpo do efeito, 3 impacto,
//   4 status, 5 clarão.
// - Overlays persistentes de status (por Pokémon) e de campo (por lado) ficam desenhando
//   enquanto estiverem definidos.
import { desenharForma, halo } from "./formas";
import { COR_STAT, PALETA_TIPO, tierDe } from "./spec";
import type { Ancora, Campo, ContextoGolpe, Forma, MoveVisualSpec, Stat, StatusVis, Tier } from "./tipos";
import { rodarArquetipo } from "./arquetipos";

const POOL = 400;
const TETO = [150, 150, 150, 400];
export const MULT_PART = [0.6, 1, 1.6, 2.5];
export const TREMOR = [1.5, 4, 8, 16];

export interface Atores {
  ancora(chave: string): Ancora | null;
  animar(chave: string, quadros: Keyframe[], ms: number, easing?: string): void;
  tremerTela(px: number, ms: number): void;
  cancelar(): void;
}

interface P {
  vivo: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ax: number;
  ay: number;
  arr: number; // arrasto por segundo (0..1)
  vida: number;
  idade: number;
  s0: number;
  s1: number;
  rot: number;
  vr: number;
  c: string;
  c2: string;
  a0: number;
  a1: number;
  forma: Forma;
  camada: number;
  brilho: number;
  txt: string;
  dono: number;
}

export interface OpcPart {
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  ax?: number;
  ay?: number;
  arr?: number;
  vida?: number;
  s0?: number;
  s1?: number;
  rot?: number;
  vr?: number;
  c?: string;
  c2?: string;
  a0?: number;
  a1?: number;
  forma?: Forma;
  camada?: number;
  brilho?: number;
  txt?: string;
}

export interface Desenho {
  camada: number;
  t0: number;
  dur: number;
  dono: number;
  draw?(g: CanvasRenderingContext2D, k: number, agora: number): void;
  tick?(k: number, dt: number, agora: number): void;
}

interface Espera {
  ate: number;
  ok: () => void;
}

export interface Tocada {
  impacto: Promise<void>;
  fim: Promise<void>;
  impactoMs: number; // estimativa (para quem precisa de número)
}

// mulberry32
export function rngDe(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TAU = Math.PI * 2;

export class MotorGolpes {
  agora = 0;
  private pool: P[] = Array.from({ length: POOL }, () => ({
    vivo: false, x: 0, y: 0, vx: 0, vy: 0, ax: 0, ay: 0, arr: 0, vida: 1, idade: 0, s0: 1, s1: 1, rot: 0, vr: 0,
    c: "#fff", c2: "#fff", a0: 1, a1: 0, forma: "orbe" as Forma, camada: 2, brilho: 0, txt: "", dono: 0,
  }));
  vivas = 0;
  picoVivas = 0;
  private desenhos: Desenho[] = [];
  private esperas: Espera[] = [];
  private hitstop = 0;
  private ultimoClarao = -1e9;
  private proximoDono = 1;
  private tocando = new Map<number, { teto: number; pular: boolean }>();
  private status = new Map<string, { st: StatusVis; acum: number; desde: number }>();
  private campos = new Map<string, { campo: Campo; desde: number; ate: number }>();
  private canvas: HTMLCanvasElement | null = null;
  private g: CanvasRenderingContext2D | null = null;
  private dpr = 1;
  private raf = 0;
  private ultimoReal = 0;
  tempoQuadro = 0; // ms gastos no último quadro (Move Lab)
  erros: string[] = []; // golpes que lançaram exceção (o teste confere que fica vazio)
  atores: Atores = { ancora: () => null, animar: () => {}, tremerTela: () => {}, cancelar: () => {} };
  reducedMotion = false;
  autoLoop = typeof window !== "undefined" && typeof requestAnimationFrame === "function";

  ligarCanvas(c: HTMLCanvasElement | null) {
    this.canvas = c;
    this.g = c?.getContext("2d") ?? null;
    if (c) this.redimensionar();
    this.garantirLoop();
  }

  redimensionar() {
    const c = this.canvas;
    if (!c) return;
    this.dpr = Math.min(2, typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1);
    const r = c.getBoundingClientRect();
    c.width = Math.max(1, Math.round(r.width * this.dpr));
    c.height = Math.max(1, Math.round(r.height * this.dpr));
  }

  get largura() {
    return this.canvas ? this.canvas.width / this.dpr : 1000;
  }
  get altura() {
    return this.canvas ? this.canvas.height / this.dpr : 560;
  }

  // ---------- API pública ----------

  tocar(spec: MoveVisualSpec, ctx: ContextoGolpe): Tocada {
    const dono = this.proximoDono++;
    const tier = this.tierDoContexto(spec, ctx);
    this.tocando.set(dono, { teto: TETO[tier], pular: false });
    let marcarImpacto!: () => void;
    const impacto = new Promise<void>((ok) => (marcarImpacto = ok));
    const kit = new Kit(this, dono, spec, ctx, tier, marcarImpacto);
    this.garantirLoop();
    const fim = rodarArquetipo(kit)
      .catch((e) => {
        this.erros.push(`${spec.slug}: ${e instanceof Error ? e.message : String(e)}`);
        if (typeof console !== "undefined") console.warn("golpe visual falhou", spec.slug, e);
      })
      .finally(() => {
        marcarImpacto();
        this.tocando.delete(dono);
      });
    return { impacto, fim, impactoMs: kit.estimativaImpacto() };
  }

  tierDoContexto(spec: MoveVisualSpec, ctx: ContextoGolpe): Tier {
    let t = tierDe(spec, ctx.power);
    if (ctx.outcome === "superEffective") t = Math.min(3, t + 1) as Tier;
    return t;
  }

  // Pula tudo o que está tocando: esperas resolvem, efeitos somem, atores voltam.
  pular() {
    for (const t of this.tocando.values()) t.pular = true;
    for (const e of this.esperas) e.ok();
    this.esperas = [];
    this.desenhos = this.desenhos.filter((d) => d.dur === Infinity);
    for (const p of this.pool) p.vivo = false;
    this.vivas = 0;
    this.atores.cancelar();
  }

  pulando(dono: number) {
    return this.tocando.get(dono)?.pular ?? true;
  }

  definirStatus(chave: string, st: StatusVis | null) {
    if (!st) this.status.delete(chave);
    else if (this.status.get(chave)?.st !== st) this.status.set(chave, { st, acum: 0, desde: this.agora });
    this.garantirLoop();
  }

  // lado: "meu" | "inimigo" | "tudo". ms = Infinity para ficar até limpar.
  definirCampo(lado: string, campo: Campo | null, ms = Infinity) {
    const chave = `${lado}:${campo ?? ""}`;
    if (!campo) {
      for (const k of [...this.campos.keys()]) if (k.startsWith(`${lado}:`)) this.campos.delete(k);
      return;
    }
    this.campos.set(chave, { campo, desde: this.agora, ate: this.agora + ms });
    this.garantirLoop();
  }

  // Lampejo curto de uma condição sobre um Pokémon (status aplicado, dano por turno).
  pulsoStatus(chave: string, st: StatusVis) {
    const an = this.atores.ancora(chave);
    if (!an) return;
    const [forma, cor] = FORMA_STATUS[st] ?? ["brilho", "#fff"];
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * TAU;
      this.part({ x: an.x + Math.cos(a) * an.w * 0.35, y: an.y + Math.sin(a) * an.h * 0.3, vx: Math.cos(a) * 30, vy: st === "freeze" ? 0 : -40, vida: 750, s0: 5, s1: 2, forma, c: cor, c2: "#FFFFFF", camada: 4, brilho: st === "paralysis" ? 1.2 : 0.5, rot: a }, 0);
    }
    this.garantirLoop();
  }

  limparTudo() {
    this.pular();
    this.status.clear();
    this.campos.clear();
    this.desenhos = [];
  }

  destruir() {
    this.limparTudo();
    if (this.raf && typeof cancelAnimationFrame === "function") cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.canvas = null;
    this.g = null;
  }

  ocupado() {
    return this.tocando.size > 0 || this.vivas > 0 || this.desenhos.length > 0 || this.status.size > 0 || this.campos.size > 0;
  }

  // ---------- usado pelo Kit ----------

  esperar(ms: number, dono: number): Promise<void> {
    if (ms <= 0 || this.pulando(dono)) return Promise.resolve();
    return new Promise((ok) => this.esperas.push({ ate: this.agora + ms, ok }));
  }

  part(o: OpcPart, dono: number): void {
    const t = this.tocando.get(dono);
    if (t?.pular) return;
    const teto = t?.teto ?? 150;
    if (this.vivas >= teto) return;
    const p = this.pool.find((x) => !x.vivo);
    if (!p) return;
    p.vivo = true;
    p.x = o.x;
    p.y = o.y;
    p.vx = o.vx ?? 0;
    p.vy = o.vy ?? 0;
    p.ax = o.ax ?? 0;
    p.ay = o.ay ?? 0;
    p.arr = o.arr ?? 0;
    p.vida = Math.max(16, o.vida ?? 500);
    p.idade = 0;
    p.s0 = o.s0 ?? 6;
    p.s1 = o.s1 ?? p.s0;
    p.rot = o.rot ?? 0;
    p.vr = o.vr ?? 0;
    p.c = o.c ?? "#ffffff";
    p.c2 = o.c2 ?? p.c;
    p.a0 = o.a0 ?? 1;
    p.a1 = o.a1 ?? 0;
    p.forma = o.forma ?? "orbe";
    p.camada = o.camada ?? 2;
    p.brilho = o.brilho ?? 0;
    p.txt = o.txt ?? "";
    p.dono = dono;
    this.vivas++;
    if (this.vivas > this.picoVivas) this.picoVivas = this.vivas;
  }

  desenho(d: Omit<Desenho, "t0"> & { t0?: number }): void {
    if (d.dono && this.pulando(d.dono) && d.dur !== Infinity) return;
    this.desenhos.push({ ...d, t0: d.t0 ?? this.agora });
  }

  pararHit(ms: number) {
    this.hitstop = Math.max(this.hitstop, ms);
  }

  podeClarao(): boolean {
    // nunca mais de 3 clarões por segundo
    if (this.reducedMotion || this.agora - this.ultimoClarao < 340) return false;
    this.ultimoClarao = this.agora;
    return true;
  }

  // ---------- loop ----------

  private garantirLoop() {
    if (!this.autoLoop || this.raf) return;
    this.ultimoReal = performance.now();
    const passo = (t: number) => {
      const dt = Math.min(50, t - this.ultimoReal);
      this.ultimoReal = t;
      const ini = performance.now();
      this.tick(dt);
      this.render();
      this.tempoQuadro = performance.now() - ini;
      if (this.ocupado() || this.esperas.length) this.raf = requestAnimationFrame(passo);
      else {
        this.raf = 0;
        this.render();
      }
    };
    this.raf = requestAnimationFrame(passo);
  }

  tick(dtReal: number) {
    let dt = dtReal;
    if (this.hitstop > 0) {
      const usa = Math.min(this.hitstop, dt);
      this.hitstop -= usa;
      dt -= usa;
    }
    this.agora += dt;
    const s = dt / 1000;
    // partículas
    if (s > 0)
      for (const p of this.pool) {
        if (!p.vivo) continue;
        p.idade += dt;
        if (p.idade >= p.vida) {
          p.vivo = false;
          this.vivas--;
          continue;
        }
        p.vx += p.ax * s;
        p.vy += p.ay * s;
        if (p.arr) {
          const f = Math.pow(1 - p.arr, s);
          p.vx *= f;
          p.vy *= f;
        }
        p.x += p.vx * s;
        p.y += p.vy * s;
        p.rot += p.vr * s;
      }
    // desenhos
    if (this.desenhos.length) {
      const fica: Desenho[] = [];
      for (const d of this.desenhos) {
        const k = d.dur === Infinity ? 0 : (this.agora - d.t0) / d.dur;
        if (k >= 1) continue;
        if (k >= 0) d.tick?.(k, dt, this.agora);
        fica.push(d);
      }
      this.desenhos = fica;
    }
    // overlays de status
    for (const [chave, o] of this.status) this.emitirStatus(chave, o, dt);
    for (const [k, c] of this.campos) if (this.agora >= c.ate) this.campos.delete(k);
    // esperas
    if (this.esperas.length) {
      const prontas = this.esperas.filter((e) => e.ate <= this.agora);
      if (prontas.length) {
        this.esperas = this.esperas.filter((e) => e.ate > this.agora);
        for (const e of prontas) e.ok();
      }
    }
  }

  render() {
    const g = this.g;
    const c = this.canvas;
    if (!g || !c) return;
    const r = c.getBoundingClientRect();
    if (Math.abs(r.width * this.dpr - c.width) > 2 || Math.abs(r.height * this.dpr - c.height) > 2) this.redimensionar();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, c.width, c.height);
    for (let camada = 0; camada <= 5; camada++) {
      if (camada === 0 || camada === 4) this.desenharCampos(g, camada);
      if (camada === 4) this.desenharStatus(g);
      for (const d of this.desenhos) {
        if (d.camada !== camada || !d.draw) continue;
        const k = d.dur === Infinity ? 0 : (this.agora - d.t0) / d.dur;
        if (k < 0 || k >= 1) continue;
        g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        g.globalAlpha = 1;
        g.globalCompositeOperation = "source-over";
        d.draw(g, k, this.agora);
      }
      for (const p of this.pool) if (p.vivo && p.camada === camada) this.desenharPart(g, p);
    }
    g.globalAlpha = 1;
    g.globalCompositeOperation = "source-over";
  }

  private desenharPart(g: CanvasRenderingContext2D, p: P) {
    const k = p.idade / p.vida;
    const a = p.a0 + (p.a1 - p.a0) * k;
    if (a <= 0.01) return;
    const s = p.s0 + (p.s1 - p.s0) * k;
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    g.translate(p.x, p.y);
    if (p.brilho > 0) {
      const h = halo(p.c);
      if (h) {
        g.globalCompositeOperation = "lighter";
        g.globalAlpha = Math.min(1, a * 0.8);
        const r = s * p.brilho * 2.2;
        g.drawImage(h, -r, -r, r * 2, r * 2);
      }
    }
    g.globalCompositeOperation = "source-over";
    g.globalAlpha = Math.min(1, a);
    g.rotate(p.rot);
    if (p.txt) {
      g.fillStyle = p.c;
      g.strokeStyle = p.c2;
      g.lineWidth = Math.max(2, s * 0.18);
      g.font = `900 ${Math.round(s * 2)}px system-ui, sans-serif`;
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.strokeText(p.txt, 0, 0);
      g.fillText(p.txt, 0, 0);
    } else desenharForma(g, p.forma, s, p.c, p.c2, this.agora + p.idade);
  }

  // ---------- overlays de status ----------

  private emitirStatus(chave: string, o: { st: StatusVis; acum: number }, dt: number) {
    const an = this.atores.ancora(chave);
    if (!an || dt <= 0) return;
    o.acum += dt;
    const R = (n: number) => (Math.sin((this.agora + n * 977) * 0.0137) + 1) / 2; // pseudo-aleatório estável
    const base = an.y + an.h * 0.42;
    const solta = (cada: number, f: () => void) => {
      while (o.acum >= cada) {
        o.acum -= cada;
        f();
      }
    };
    switch (o.st) {
      case "burn":
        solta(110, () =>
          this.part({ x: an.x + (R(1) - 0.5) * an.w * 0.8, y: base, vy: -40 - R(2) * 30, vida: 520, s0: 4 + R(3) * 3, s1: 1, forma: "chama", c: "#FF8A3D", c2: "#FFE08A", camada: 4, brilho: 1, a0: 0.95 }, 0)
        );
        break;
      case "poison":
      case "toxic": {
        const forte = o.st === "toxic";
        solta(forte ? 140 : 190, () =>
          this.part({ x: an.x + (R(4) - 0.5) * an.w * 0.7, y: base - R(5) * an.h * 0.3, vy: -26 - R(6) * 18, vida: 900, s0: forte ? 5 : 3, s1: forte ? 7 : 5, forma: "bolha", c: forte ? "#5A1F6A" : "#B060C8", c2: "#E0B0F0", camada: 4, a0: 0.9 }, 0)
        );
        break;
      }
      case "paralysis":
        solta(720, () => {
          for (let i = 0; i < 4; i++)
            this.part({ x: an.x + (R(i + 7) - 0.5) * an.w, y: an.y + (R(i + 11) - 0.5) * an.h * 0.8, vida: 180, s0: 5, s1: 2, forma: "faisca", c: "#FFE14D", c2: "#FFF", rot: R(i) * 3, camada: 4, brilho: 1.2 }, 0);
        });
        break;
      case "sleep":
        solta(850, () =>
          this.part({ x: an.x + an.w * 0.25, y: an.y - an.h * 0.4, vx: 14, vy: -22, vida: 1500, s0: 4, s1: 8, forma: "z", c: "#C8D6FF", camada: 4, a0: 1, vr: 0.3 }, 0)
        );
        break;
      case "attract":
        solta(520, () =>
          this.part({ x: an.x + (R(13) - 0.5) * an.w * 0.8, y: an.y - an.h * 0.3, vy: -30, vx: (R(14) - 0.5) * 20, vida: 1100, s0: 4, s1: 6, forma: "coracao", c: "#FF6FA8", c2: "#FFD0E4", camada: 4 }, 0)
        );
        break;
      case "leech-seed":
        solta(420, () =>
          this.part({ x: an.x + (R(15) - 0.5) * an.w * 0.8, y: base - R(16) * an.h * 0.5, vy: -14, vr: 2, vida: 900, s0: 3.5, s1: 2, forma: "folha", c: "#5DB83F", c2: "#C8F0A0", camada: 4 }, 0)
        );
        break;
      case "curse":
      case "nightmare":
        solta(260, () =>
          this.part({ x: an.x + (R(17) - 0.5) * an.w * 0.8, y: an.y - an.h * 0.2, vy: -24, vida: 1100, s0: 6, s1: 12, forma: "fumaca", c: "#3A2450", camada: 4, a0: 0.55 }, 0)
        );
        break;
      default:
        break;
    }
  }

  private desenharStatus(g: CanvasRenderingContext2D) {
    for (const [chave, o] of this.status) {
      const an = this.atores.ancora(chave);
      if (!an) continue;
      g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      g.globalCompositeOperation = "source-over";
      if (o.st === "freeze") {
        const x = an.x - an.w * 0.55;
        const y = an.y - an.h * 0.55;
        g.globalAlpha = 0.42;
        g.fillStyle = "#BFEFFF";
        g.beginPath();
        g.moveTo(x + an.w * 0.15, y);
        g.lineTo(x + an.w * 1.1, y + an.h * 0.06);
        g.lineTo(x + an.w * 1.08, y + an.h * 1.05);
        g.lineTo(x - an.w * 0.02, y + an.h * 1.1);
        g.closePath();
        g.fill();
        g.globalAlpha = 0.85;
        g.strokeStyle = "#FFFFFF";
        g.lineWidth = 1.5;
        g.stroke();
        g.beginPath();
        g.moveTo(x + an.w * 0.3, y + an.h * 0.1);
        g.lineTo(x + an.w * 0.12, y + an.h * 0.45);
        g.moveTo(x + an.w * 0.85, y + an.h * 0.2);
        g.lineTo(x + an.w * 0.7, y + an.h * 0.5);
        g.stroke();
      } else if (o.st === "confusion") {
        for (let i = 0; i < 3; i++) {
          const a = this.agora * 0.004 + (i * TAU) / 3;
          g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
          g.translate(an.x + Math.cos(a) * an.w * 0.35, an.y - an.h * 0.55 + Math.sin(a) * 6);
          g.globalAlpha = 0.95;
          desenharForma(g, "estrela", 5, "#FFE14D", "#FFFFFF", this.agora);
        }
      } else if (o.st === "perish") {
        g.globalAlpha = 0.9;
        g.fillStyle = "#E8DCFF";
        g.font = "900 16px system-ui, sans-serif";
        g.textAlign = "center";
        g.fillText("3", an.x, an.y - an.h * 0.65);
      }
    }
  }

  // ---------- overlays de campo ----------

  private desenharCampos(g: CanvasRenderingContext2D, camada: number) {
    for (const [chave, c] of this.campos) {
      const lado = chave.split(":")[0];
      const fade = Math.min(1, (this.agora - c.desde) / 300, c.ate === Infinity ? 1 : (c.ate - this.agora) / 400);
      desenharCampo(g, this, c.campo, lado, Math.max(0, fade), camada);
    }
  }

  ancorasDoLado(lado: string): Ancora[] {
    const xs: Ancora[] = [];
    for (const l of lado === "tudo" ? ["meu", "inimigo"] : [lado])
      for (const s of [0, 1]) {
        const a = this.atores.ancora(`${l}-${s}`);
        if (a) xs.push(a);
      }
    return xs;
  }

  get dprAtual() {
    return this.dpr;
  }
}

// Visual contínuo de clima, barreira e armadilha. Sem partículas: tudo sai do relógio,
// então custa o mesmo com 1 ou 10 campos e não suja o pool dos golpes.
function desenharCampo(g: CanvasRenderingContext2D, m: MotorGolpes, campo: Campo, lado: string, a: number, camada: number) {
  if (a <= 0) return;
  const W = m.largura;
  const H = m.altura;
  const t = m.agora;
  const dpr = m.dprAtual;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.globalCompositeOperation = "source-over";
  const ans = m.ancorasDoLado(lado);
  const h = (i: number) => {
    const x = Math.sin(i * 127.1) * 43758.5453;
    return x - Math.floor(x);
  };
  const clima = campo === "chuva" || campo === "sol" || campo === "areia" || campo === "granizo";
  if (camada === 0) {
    const tintas: Partial<Record<Campo, [string, number]>> = {
      chuva: ["#20304A", 0.28],
      sol: ["#FFB040", 0.16],
      areia: ["#B08A40", 0.22],
      granizo: ["#C8DCF0", 0.18],
      neblina: ["#2A2440", 0.32],
      "trick-room": ["#FF5AA0", 0.08],
      "magic-room": ["#8C6CFF", 0.1],
      "wonder-room": ["#3CD2C8", 0.1],
      gravity: ["#1A1030", 0.18],
    };
    const tn = tintas[campo];
    if (tn) {
      g.globalAlpha = tn[1] * a;
      g.fillStyle = tn[0];
      g.fillRect(0, 0, W, H);
    }
    if (campo === "sol") {
      g.globalCompositeOperation = "lighter";
      for (let i = 0; i < 6; i++) {
        const ang = 0.5 + i * 0.22 + Math.sin(t * 0.0006 + i) * 0.03;
        g.globalAlpha = 0.07 * a;
        g.fillStyle = "#FFE08A";
        g.beginPath();
        g.moveTo(W * 0.92, -20);
        g.lineTo(W * 0.92 - Math.cos(ang) * W * 1.4 - 40, Math.sin(ang) * H * 1.4);
        g.lineTo(W * 0.92 - Math.cos(ang + 0.06) * W * 1.4, Math.sin(ang + 0.06) * H * 1.4);
        g.closePath();
        g.fill();
      }
    }
    if (campo === "trick-room" || campo === "magic-room" || campo === "wonder-room") {
      const cor = campo === "trick-room" ? "#FF7EB6" : campo === "magic-room" ? "#B49CFF" : "#6CF0E0";
      g.globalAlpha = 0.25 * a;
      g.strokeStyle = cor;
      g.lineWidth = 1;
      const passo = 40;
      const off = ((campo === "trick-room" ? -t : t) * 0.02) % passo;
      for (let x = off; x < W; x += passo) {
        g.beginPath();
        g.moveTo(x, 0);
        g.lineTo(W / 2 + (x - W / 2) * 0.6, H);
        g.stroke();
      }
      for (let y = 0; y < H; y += passo * 0.7) {
        g.beginPath();
        g.moveTo(0, y);
        g.lineTo(W, y);
        g.stroke();
      }
    }
    return;
  }
  // camada 4: o que fica na frente
  if (clima) {
    if (campo === "chuva") {
      g.strokeStyle = "#BFD8FF";
      g.lineWidth = 1.2;
      for (let i = 0; i < 70; i++) {
        const x = (h(i) * W * 1.2 + t * 0.12) % (W * 1.2) - W * 0.1;
        const y = (h(i + 99) * H + t * (0.55 + h(i + 7) * 0.3)) % H;
        g.globalAlpha = 0.5 * a;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x - 4, y + 13);
        g.stroke();
      }
    } else if (campo === "areia") {
      for (let i = 0; i < 60; i++) {
        const x = W - ((h(i) * W + t * (0.25 + h(i + 3) * 0.2)) % W);
        const y = h(i + 50) * H;
        g.globalAlpha = 0.55 * a;
        g.fillStyle = i % 3 ? "#D8B870" : "#A88040";
        g.fillRect(x, y + Math.sin(t * 0.004 + i) * 4, 9, 1.6);
      }
    } else if (campo === "granizo") {
      for (let i = 0; i < 30; i++) {
        const x = (h(i) * W + t * 0.05) % W;
        const y = (h(i + 9) * H + t * (0.35 + h(i + 4) * 0.2)) % H;
        g.globalAlpha = 0.75 * a;
        g.setTransform(dpr, 0, 0, dpr, x, y);
        desenharForma(g, "cristal", 3.5, "#E8F8FF", "#9FD8F0", t);
      }
    } else if (campo === "sol") {
      g.globalCompositeOperation = "lighter";
      for (let i = 0; i < 14; i++) {
        g.globalAlpha = 0.25 * a * (0.5 + 0.5 * Math.sin(t * 0.003 + i));
        g.setTransform(dpr, 0, 0, dpr, h(i) * W, h(i + 3) * H * 0.7);
        desenharForma(g, "brilho", 3, "#FFE08A", "#FFFFFF", t);
      }
    }
    return;
  }
  for (const an of ans) {
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.globalCompositeOperation = "source-over";
    const frente = an.lado === "meu" ? 1 : -1;
    const pe = an.y + an.h * 0.5;
    switch (campo) {
      case "reflect":
      case "light-screen":
      case "protect":
      case "safeguard": {
        const cor = campo === "reflect" ? "#9FC8FF" : campo === "light-screen" ? "#FFE08A" : campo === "protect" ? "#9CFFB0" : "#E0F0FF";
        if (campo === "safeguard") {
          g.globalAlpha = 0.18 * a;
          g.fillStyle = cor;
          g.beginPath();
          g.ellipse(an.x, pe, an.w * 0.9, an.h * 1.05, 0, Math.PI, 0);
          g.fill();
          g.globalAlpha = 0.6 * a;
          g.strokeStyle = "#FFFFFF";
          g.lineWidth = 1.4;
          g.stroke();
          break;
        }
        const px = an.x + frente * an.w * 0.65;
        const brilho = 0.5 + 0.5 * Math.sin(t * 0.004);
        for (let i = 0; i < 4; i++) {
          g.setTransform(dpr, 0, 0, dpr, px + frente * Math.sin(i) * 3, an.y - an.h * 0.35 + i * an.h * 0.27);
          g.globalAlpha = (0.35 + 0.25 * brilho) * a;
          desenharForma(g, "hexagono", an.h * 0.16, cor, "#FFFFFF", t);
        }
        break;
      }
      case "mist":
      case "neblina":
        for (let i = 0; i < 6; i++) {
          g.setTransform(dpr, 0, 0, dpr, an.x + Math.sin(t * 0.0008 + i * 1.7) * an.w * 0.6, pe - an.h * 0.15 - (i % 3) * 8);
          g.globalAlpha = 0.18 * a;
          desenharForma(g, "fumaca", an.w * 0.35, campo === "mist" ? "#E8F4FF" : "#3A3050", "#fff", t);
        }
        break;
      case "spikes":
      case "toxic-spikes":
        for (let i = 0; i < 7; i++) {
          const x = an.x + (i - 3) * an.w * 0.22;
          g.setTransform(dpr, 0, 0, dpr, x, pe + 4 + (i % 2) * 3);
          g.rotate(-Math.PI / 2);
          g.globalAlpha = 0.9 * a;
          desenharForma(g, "agulha", 6, campo === "spikes" ? "#9A9AB0" : "#A040A0", campo === "spikes" ? "#E0E0F0" : "#E0A0E0", t);
        }
        break;
      case "stealth-rock":
        for (let i = 0; i < 5; i++) {
          const ang = t * 0.0009 + (i * TAU) / 5;
          g.setTransform(dpr, 0, 0, dpr, an.x + Math.cos(ang) * an.w * 0.7, an.y + Math.sin(ang) * an.h * 0.25 - an.h * 0.1);
          g.rotate(ang);
          g.globalAlpha = 0.85 * a;
          desenharForma(g, "pedra", 5, "#B8A038", "#E0D098", t);
        }
        break;
      case "gravity":
        g.strokeStyle = "#B49CFF";
        g.lineWidth = 1;
        for (let i = 0; i < 6; i++) {
          const y = (t * 0.15 + i * 18) % (an.h * 1.2);
          g.globalAlpha = 0.4 * a;
          g.beginPath();
          g.moveTo(an.x - an.w * 0.6 + i * an.w * 0.24, an.y - an.h * 0.6 + y);
          g.lineTo(an.x - an.w * 0.6 + i * an.w * 0.24, an.y - an.h * 0.6 + y + 10);
          g.stroke();
        }
        break;
      case "substituto": {
        const x = an.x - frente * an.w * 0.15;
        g.globalAlpha = a;
        g.fillStyle = "#E8D0A0";
        g.strokeStyle = "#7A5A30";
        g.lineWidth = 1.5;
        g.beginPath();
        g.ellipse(x, pe - an.h * 0.25, an.w * 0.28, an.h * 0.25, 0, 0, TAU);
        g.fill();
        g.stroke();
        g.beginPath();
        g.arc(x, pe - an.h * 0.62, an.w * 0.2, 0, TAU);
        g.fill();
        g.stroke();
        g.fillStyle = "#3A2A10";
        g.fillRect(x - 5, pe - an.h * 0.65, 2.5, 2.5);
        g.fillRect(x + 3, pe - an.h * 0.65, 2.5, 2.5);
        break;
      }
      case "lama":
      case "agua":
        g.globalAlpha = 0.45 * a;
        g.fillStyle = campo === "lama" ? "#7A5A30" : "#5A9AF0";
        g.beginPath();
        g.ellipse(an.x, pe + 4, an.w * 0.8, 8, 0, 0, TAU);
        g.fill();
        break;
      case "holofote": {
        g.globalCompositeOperation = "lighter";
        g.globalAlpha = 0.16 * a;
        g.fillStyle = "#FFF0B0";
        g.beginPath();
        g.moveTo(an.x - 10, 0);
        g.lineTo(an.x + 10, 0);
        g.lineTo(an.x + an.w * 0.8, pe);
        g.lineTo(an.x - an.w * 0.8, pe);
        g.closePath();
        g.fill();
        break;
      }
      case "trevo":
        for (let i = 0; i < 5; i++) {
          g.setTransform(dpr, 0, 0, dpr, an.x + Math.cos(t * 0.002 + i * 1.25) * an.w * 0.6, an.y - an.h * 0.2 + Math.sin(t * 0.003 + i) * an.h * 0.3);
          g.globalAlpha = 0.7 * a;
          desenharForma(g, "brilho", 4, "#FFE08A", "#FFFFFF", t);
        }
        break;
      case "vento":
        g.strokeStyle = "#FFFFFF";
        g.lineWidth = 1.2;
        for (let i = 0; i < 8; i++) {
          const k = ((t * 0.0012 + i * 0.13) % 1) * 2 - 0.5;
          g.globalAlpha = 0.45 * a * (1 - Math.abs(k - 0.5));
          const y = an.y - an.h * 0.4 + i * an.h * 0.11;
          const x = an.x - frente * (k * an.w * 2);
          g.beginPath();
          g.moveTo(x, y);
          g.lineTo(x - frente * 26, y);
          g.stroke();
        }
        break;
      default:
        break;
    }
  }
}

// Paleta efetiva de um golpe (tipo dinâmico troca as cores).
export function paletaEfetiva(spec: MoveVisualSpec, typeOverride?: number) {
  if (typeOverride === undefined || typeOverride === spec.type) return spec.palette;
  const [p, s, a] = PALETA_TIPO[typeOverride] ?? PALETA_TIPO[0];
  return { primary: p, secondary: s, accent: a };
}

// ---------- Kit: o que um arquétipo usa para desenhar ----------

export class Kit {
  readonly r: () => number;
  readonly A: Ancora;
  readonly T: Ancora;
  readonly Ts: Ancora[];
  readonly dir: number;
  readonly pal: { primary: string; secondary: string; accent: string; arcoiris?: boolean };
  readonly tipo: number;
  readonly mult: number;
  readonly rm: boolean;
  readonly vel: number;
  readonly u: number; // escala pelo tamanho do alvo: a arena do celular e a do desktop mostram o mesmo golpe
  private impactou = false;

  constructor(
    readonly m: MotorGolpes,
    readonly dono: number,
    readonly spec: MoveVisualSpec,
    readonly ctx: ContextoGolpe,
    readonly tier: Tier,
    private marcarImpacto: () => void
  ) {
    this.r = rngDe(ctx.seed ?? Math.floor(spec.variacao * 1e6) + 7);
    this.A = ctx.attacker;
    this.Ts = ctx.targets.length ? ctx.targets : [ctx.attacker];
    this.T = this.Ts[0];
    this.dir = this.T.x >= this.A.x ? 1 : -1;
    this.tipo = ctx.typeOverride ?? spec.type;
    this.pal = paletaEfetiva(spec, ctx.typeOverride);
    this.rm = !!(ctx.reducedMotion ?? m.reducedMotion);
    this.vel = Math.max(0.25, ctx.speed ?? 1) * (this.rm ? 1.35 : 1);
    this.u = Math.min(2.4, Math.max(0.6, this.T.w / 105));
    const nv = ctx.outcome === "notVeryEffective" ? 0.6 : 1;
    this.mult = MULT_PART[tier] * (this.rm ? 0.5 : 1) * nv * (0.9 + spec.variacao * 0.25);
  }

  get pulando() {
    return this.m.pulando(this.dono);
  }
  get resultado() {
    return this.ctx.outcome;
  }
  get errou() {
    return this.ctx.outcome === "miss";
  }

  // escala do golpe: ritmo próprio por slug (dois golpes iguais nunca têm o mesmo tempo)
  ms(base: number) {
    return (base * (0.92 + this.spec.variacao * 0.18)) / this.vel;
  }
  esperar(base: number) {
    return this.m.esperar(this.ms(base), this.dono);
  }
  n(base: number) {
    return Math.max(1, Math.round(base * this.mult));
  }
  entre(a: number, b: number) {
    return a + (b - a) * this.r();
  }
  cor(i = 0): string {
    if (this.pal.arcoiris) return ARCOIRIS[(i + Math.floor(this.spec.variacao * 7)) % ARCOIRIS.length];
    return i % 3 === 0 ? this.pal.primary : i % 3 === 1 ? this.pal.secondary : this.pal.accent;
  }

  estimativaImpacto() {
    const base: Record<string, number> = { STRIKE: 330, PROJ: 520, BEAM: 560, MULTI: 420, AOE: 600, CHARGE: 1300, TRAP: 520, DRAIN: 420, OHKO: 1200, SACRIFICE: 900, BUFF: 450, DEBUFF: 520, STATUS: 560, FIELD: 500, HEAL: 450, SPECIAL: 700 };
    return this.ms(base[this.spec.archetype] ?? 500);
  }

  fase(f: "anticipation" | "travel" | "impact" | "aftermath") {
    this.ctx.onPhase?.(f);
    if (f === "impact" && !this.impactou) {
      this.impactou = true;
      this.marcarImpacto();
    }
  }

  part(o: OpcPart) {
    const u = this.u;
    if (u !== 1) o = { ...o, s0: (o.s0 ?? 6) * u, s1: o.s1 !== undefined ? o.s1 * u : undefined };
    this.m.part(o, this.dono);
  }

  desenho(d: { camada: number; dur: number; draw?: Desenho["draw"]; tick?: Desenho["tick"] }) {
    this.m.desenho({ ...d, dur: d.dur === Infinity ? Infinity : this.ms(d.dur), dono: this.dono });
  }

  explosao(x: number, y: number, o: { n: number; forma?: Forma; cor?: string; cor2?: string; vel?: [number, number]; vida?: [number, number]; tam?: [number, number]; grav?: number; ang?: [number, number]; brilho?: number; camada?: number; arr?: number; giro?: number; a0?: number; fim?: number }) {
    const n = this.n(o.n);
    for (let i = 0; i < n; i++) {
      const [a0, a1] = o.ang ?? [0, TAU];
      const ang = a0 + (a1 - a0) * this.r();
      const v = this.entre(...(o.vel ?? [60, 180])) * this.u;
      const s = this.entre(...(o.tam ?? [3, 7]));
      this.part({
        x,
        y,
        vx: Math.cos(ang) * v,
        vy: Math.sin(ang) * v,
        ay: (o.grav ?? 0) * this.u,
        arr: o.arr ?? 0.9,
        vida: this.ms(this.entre(...(o.vida ?? [350, 650]))),
        s0: s,
        s1: s * (o.fim ?? 0.3),
        rot: this.r() * TAU,
        vr: (this.r() - 0.5) * (o.giro ?? 8),
        c: o.cor ?? this.cor(i),
        c2: o.cor2 ?? this.pal.secondary,
        forma: o.forma ?? this.spec.shape,
        camada: o.camada ?? 3,
        brilho: o.brilho ?? 0.8,
        a0: o.a0 ?? 1,
      });
    }
  }

  // Projétil do ponto A ao B, com rastro. Resolve quando chega.
  async voar(o: { de: { x: number; y: number }; para: { x: number; y: number }; ms: number; forma?: Forma; tam?: number; cor?: string; cor2?: string; mov?: string; giro?: number; rastro?: number; brilho?: number; camada?: number; altura?: number; fase?: number }) {
    const dur = this.ms(o.ms);
    const forma = o.forma ?? this.spec.shape;
    const tam = (o.tam ?? 8) * this.u;
    const cor = o.cor ?? this.pal.primary;
    const cor2 = o.cor2 ?? this.pal.secondary;
    const mov = o.mov ?? this.spec.motion;
    const altura = o.altura ?? 70;
    const fase = o.fase ?? this.r() * TAU;
    const dx = o.para.x - o.de.x;
    const dy = o.para.y - o.de.y;
    const comp = Math.hypot(dx, dy) || 1;
    const nx = -dy / comp;
    const ny = dx / comp;
    let acumRastro = 0;
    const pos = (k: number) => {
      let x = o.de.x + dx * k;
      let y = o.de.y + dy * k;
      if (mov === "arco") y -= Math.sin(k * Math.PI) * altura;
      else if (mov === "zigue") {
        const z = Math.sin(k * Math.PI * 7 + fase) * 16 * (1 - k * 0.6);
        x += nx * z;
        y += ny * z;
      } else if (mov === "espiral") {
        const z = Math.sin(k * Math.PI * 4 + fase) * 22 * Math.sin(k * Math.PI);
        x += nx * z;
        y += ny * z - Math.cos(k * Math.PI * 4 + fase) * 6;
      } else if (mov === "teleguiado") {
        const z = Math.sin(k * Math.PI) * 50 * Math.sin(fase);
        x += nx * z;
        y += ny * z;
      }
      return [x, y] as const;
    };
    const rastro = o.rastro ?? 1;
    const ease = (k: number) => (mov === "cai" ? k * k : k);
    this.desenho({
      camada: o.camada ?? 2,
      dur: o.ms,
      tick: (k, dt) => {
        if (rastro <= 0) return;
        acumRastro += dt * rastro;
        while (acumRastro > 22) {
          acumRastro -= 22;
          const [x, y] = pos(ease(k));
          this.part({ x: x + (this.r() - 0.5) * tam * 0.6, y: y + (this.r() - 0.5) * tam * 0.6, vida: 260, s0: (tam / this.u) * 0.55, s1: 0.5, c: cor, c2: cor2, forma: this.spec.shape === "faisca" ? "faisca" : "poeira", camada: 1, brilho: 0.8, a0: 0.7 });
        }
      },
      draw: (g, k, agora) => {
        const [x, y] = pos(ease(k));
        const [x2, y2] = pos(Math.min(1, ease(k) + 0.02));
        const dpr = this.m.dprAtual;
        const h = halo(cor);
        g.setTransform(dpr, 0, 0, dpr, x, y);
        if (h && (o.brilho ?? 1) > 0) {
          g.globalCompositeOperation = "lighter";
          g.globalAlpha = 0.7;
          const r = tam * 2.4 * (o.brilho ?? 1);
          g.drawImage(h, -r, -r, r * 2, r * 2);
        }
        g.globalCompositeOperation = "source-over";
        g.globalAlpha = 1;
        const giro = o.giro ?? 0;
        g.rotate(giro ? agora * 0.001 * giro : Math.atan2(y2 - y, x2 - x));
        desenharForma(g, forma, tam, cor, cor2, agora);
      },
    });
    await this.m.esperar(dur, this.dono);
  }

  // Feixe sustentado entre dois pontos.
  feixe(o: { de: { x: number; y: number }; para: { x: number; y: number }; ms: number; larg: number; cor?: string; cor2?: string; zigue?: boolean; onda?: boolean; arcoiris?: boolean; nucleo?: string }) {
    const cor = o.cor ?? this.pal.primary;
    const cor2 = o.cor2 ?? this.pal.secondary;
    const semente = this.r() * 1000;
    this.desenho({
      camada: 2,
      dur: o.ms,
      draw: (g, k, agora) => {
        const cresce = Math.min(1, k / 0.18);
        const some = k > 0.8 ? 1 - (k - 0.8) / 0.2 : 1;
        const x1 = o.de.x + (o.para.x - o.de.x) * cresce;
        const y1 = o.de.y + (o.para.y - o.de.y) * cresce;
        const dx = x1 - o.de.x;
        const dy = y1 - o.de.y;
        const comp = Math.hypot(dx, dy) || 1;
        const nx = -dy / comp;
        const ny = dx / comp;
        const larg = o.larg * this.u * some * (1 + Math.sin(agora * 0.04) * 0.12);
        const seg = 14;
        const pts: [number, number][] = [];
        for (let i = 0; i <= seg; i++) {
          const f = i / seg;
          let off = 0;
          if (o.zigue && i > 0 && i < seg) off = (Math.sin(semente + i * 12.9898 + Math.floor(agora / 60) * 3.1) * 43758.5453) % 1 * larg * 1.4;
          if (o.onda) off += Math.sin(f * 14 + agora * 0.02) * larg * 0.7;
          pts.push([o.de.x + dx * f + nx * off, o.de.y + dy * f + ny * off]);
        }
        const dpr = this.m.dprAtual;
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        g.lineCap = "round";
        g.lineJoin = "round";
        const traco = (w: number, c: string, alpha: number, comp: GlobalCompositeOperation) => {
          g.globalCompositeOperation = comp;
          g.globalAlpha = alpha;
          g.strokeStyle = c;
          g.lineWidth = w;
          g.beginPath();
          pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
          g.stroke();
        };
        if (o.arcoiris) {
          ARCOIRIS.forEach((c, i) => {
            g.save();
            g.translate(nx * (i - 3) * larg * 0.22, ny * (i - 3) * larg * 0.22);
            traco(larg * 0.3, c, 0.8, "lighter");
            g.restore();
          });
        } else {
          traco(larg * 2.2, cor, 0.25, "lighter");
          traco(larg, cor, 0.9, "source-over");
        }
        traco(larg * 0.35, o.nucleo ?? cor2, 1, "source-over");
      },
    });
  }

  anel(x: number, y: number, o: { r0?: number; r1: number; ms: number; cor?: string; larg?: number; camada?: number; achata?: number }) {
    const cor = o.cor ?? this.pal.primary;
    this.desenho({
      camada: o.camada ?? 3,
      dur: o.ms,
      draw: (g, k) => {
        const r = (o.r0 ?? 2) + (o.r1 - (o.r0 ?? 2)) * (1 - Math.pow(1 - k, 2));
        const dpr = this.m.dprAtual;
        g.setTransform(dpr, 0, 0, dpr, x, y);
        g.globalAlpha = 1 - k;
        g.strokeStyle = cor;
        g.lineWidth = (o.larg ?? 3) * this.u * (1 - k * 0.6);
        g.beginPath();
        g.ellipse(0, 0, r, r * (o.achata ?? 1), 0, 0, TAU);
        g.stroke();
      },
    });
  }

  brilho(x: number, y: number, r: number, cor: string, ms: number) {
    this.desenho({
      camada: 3,
      dur: ms,
      draw: (g, k) => {
        const h = halo(cor);
        if (!h) return;
        const dpr = this.m.dprAtual;
        g.setTransform(dpr, 0, 0, dpr, x, y);
        g.globalCompositeOperation = "lighter";
        g.globalAlpha = Math.sin(k * Math.PI);
        const rr = r * (0.6 + k * 0.6);
        g.drawImage(h, -rr, -rr, rr * 2, rr * 2);
      },
    });
  }

  // Clarão de tela inteira, só fora do reduced-motion e no máximo 3 por segundo.
  // No reduced-motion vira um brilho local no alvo.
  clarao(cor: string, alpha: number, ms: number) {
    if (!this.m.podeClarao()) {
      this.brilho(this.T.x, this.T.y, this.T.w, cor, ms);
      return;
    }
    this.desenho({
      camada: 5,
      dur: ms,
      draw: (g, k) => {
        const dpr = this.m.dprAtual;
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        g.globalAlpha = alpha * (1 - k);
        g.fillStyle = cor;
        g.fillRect(0, 0, this.m.largura, this.m.altura);
      },
    });
  }

  tinta(cor: string, alpha: number, ms: number) {
    this.desenho({
      camada: 0,
      dur: ms,
      draw: (g, k) => {
        const dpr = this.m.dprAtual;
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        g.globalAlpha = alpha * Math.min(1, k / 0.15, (1 - k) / 0.25);
        g.fillStyle = cor;
        g.fillRect(0, 0, this.m.largura, this.m.altura);
      },
    });
  }

  mover(an: Ancora, quadros: Keyframe[], ms: number, easing = "ease-in-out") {
    if (this.pulando) return;
    this.m.atores.animar(an.chave, quadros, this.ms(ms), easing);
  }

  tremer(an: Ancora, px: number, ms: number) {
    if (this.rm || px <= 0) return;
    const q: Keyframe[] = [];
    for (let i = 0; i <= 6; i++) q.push({ transform: `translate(${i === 6 ? 0 : (i % 2 ? -1 : 1) * px * (1 - i / 6)}px, 0px)` });
    this.mover(an, q, ms, "linear");
  }

  tremerTela(px: number, ms: number) {
    if (this.rm || px <= 0 || this.pulando) return;
    this.m.atores.tremerTela(px, this.ms(ms));
  }

  hitstop(ms: number) {
    if (!this.pulando) this.m.pararHit(this.rm ? ms * 0.5 : ms);
  }

  texto(x: number, y: number, txt: string, cor: string, tam: number, ms: number) {
    this.part({ x, y, vy: -18, vida: this.ms(ms), s0: tam, s1: tam * 1.1, c: cor, c2: "#1A1020", txt, camada: 5, a0: 1, a1: 0 });
  }

  setas(an: Ancora, stat: Stat, n: number) {
    const sobe = n > 0;
    const cor = COR_STAT[stat];
    const qtd = Math.min(3, Math.abs(n));
    for (let i = 0; i < qtd; i++)
      for (let j = 0; j < 3; j++) {
        const x = an.x + (j - 1) * an.w * 0.32 + (i - (qtd - 1) / 2) * 7;
        this.part({
          x,
          y: sobe ? an.y + an.h * 0.3 - i * 10 : an.y - an.h * 0.35 + i * 10,
          vy: sobe ? -70 : 70,
          vida: this.ms(650 + i * 90),
          s0: 6,
          s1: 7,
          rot: sobe ? 0 : Math.PI,
          c: cor,
          c2: "#FFFFFF",
          forma: "seta",
          camada: 4,
          a0: 1,
          brilho: 0.6,
        });
      }
    if (qtd >= 2) this.anel(an.x, an.y, { r1: an.w * 0.9, ms: 500, cor, larg: 2, camada: 4 });
  }

  // Ponto onde o golpe termina: no alvo, ou passando dele se errou.
  destino(an: Ancora) {
    if (!this.errou) return { x: an.x, y: an.y };
    return { x: an.x + this.dir * an.w * 0.9, y: an.y - an.h * 0.55 };
  }

  esquiva(an: Ancora) {
    this.mover(an, [{ transform: "translate(0,0)" }, { transform: `translate(${-this.dir * -26}px, -6px)` }, { transform: "translate(0,0)" }], 380, "ease-out");
  }

  // Detritos por tipo: o que sai do alvo no impacto.
  detritos(x: number, y: number, n: number, escala = 1) {
    const d = DETRITO[this.tipo] ?? DETRITO[0];
    this.explosao(x, y, {
      n,
      forma: d.forma,
      cor: d.cor ?? this.pal.primary,
      cor2: d.cor2 ?? this.pal.secondary,
      vel: [60 * escala, 200 * escala],
      vida: [300, 650],
      tam: [2.5 * escala, 5.5 * escala],
      grav: d.grav,
      brilho: d.brilho,
      giro: 10,
    });
  }

  // Impacto padrão: respeita o resultado (erro, sem efeito, super efetivo, crítico) e o tier.
  async impacto(an: Ancora, o: { forma?: Forma; escala?: number; x?: number; y?: number; semAnel?: boolean } = {}) {
    const x = o.x ?? an.x;
    const y = o.y ?? an.y;
    const res = this.resultado;
    if (res === "miss") {
      this.fase("impact");
      this.esquiva(an);
      this.explosao(x + this.dir * an.w * 0.6, y - an.h * 0.3, { n: 5, forma: "poeira", cor: "#D8D8E0", vel: [20, 60], tam: [2, 4], brilho: 0 });
      return;
    }
    if (res === "noEffect") {
      this.fase("impact");
      this.explosao(x, y, { n: 10, forma: "fumaca", cor: "#9A9AA6", cor2: "#C8C8D0", vel: [15, 50], tam: [4, 9], vida: [500, 900], brilho: 0, fim: 1.4, a0: 0.6 });
      return;
    }
    const esc = (o.escala ?? 1) * (res === "notVeryEffective" ? 0.6 : 1) * [0.75, 1, 1.25, 1.6][this.tier];
    if (res === "crit") {
      this.hitstop(80);
      this.cortes(an, "#FFFFFF");
    }
    this.fase("impact");
    if (!o.semAnel) this.anel(x, y, { r1: an.w * 0.55 * esc, ms: 340, cor: res === "notVeryEffective" ? "#B8B8C0" : this.pal.secondary, larg: 3 * esc });
    this.brilho(x, y, an.w * 0.5 * esc, this.pal.primary, 260);
    this.explosao(x, y, { n: 10, forma: o.forma ?? "faisca", cor: res === "notVeryEffective" ? "#C8C8D0" : undefined, vel: [80 * esc, 220 * esc], tam: [3 * esc, 6 * esc], vida: [220, 420] });
    this.detritos(x, y, 6, esc);
    this.tremer(an, TREMOR[this.tier] * (res === "notVeryEffective" ? 0.5 : 1), 300);
    this.mover(an, [{ filter: "brightness(1)" }, { filter: "brightness(2.6)" }, { filter: "brightness(1)" }], 180, "linear");
    if (res === "superEffective") {
      this.anel(x, y, { r1: an.w * 1.1, ms: 480, cor: this.pal.accent, larg: 5 });
      this.clarao(this.pal.primary, 0.18, 200);
    }
    if (this.tier >= 2 && res !== "notVeryEffective") this.tremerTela(this.tier === 3 ? 6 : 3, 280);
    if (this.tier === 3 && res !== "notVeryEffective") this.clarao("#FFFFFF", 0.35, 260);
    if (this.spec.statusInflige && this.spec.archetype !== "STATUS") this.statusPulso(an, this.spec.statusInflige);
  }

  cortes(an: Ancora, cor: string) {
    for (const s of [1, -1])
      this.desenho({
        camada: 5,
        dur: 220,
        draw: (g, k) => {
          const dpr = this.m.dprAtual;
          g.setTransform(dpr, 0, 0, dpr, an.x, an.y);
          g.globalAlpha = 1 - k;
          g.strokeStyle = cor;
          g.lineWidth = 3 * (1 - k) + 1;
          const L = an.w * 0.9 * Math.min(1, k * 3);
          g.beginPath();
          g.moveTo(-L * s, -L);
          g.lineTo(L * s, L);
          g.stroke();
        },
      });
  }

  // Lampejo curto de uma condição (o overlay persistente é do jogo, via definirStatus).
  statusPulso(an: Ancora, st: StatusVis) {
    const [forma, cor] = FORMA_STATUS[st] ?? ["brilho", "#fff"];
    for (let i = 0; i < 5; i++)
      this.part({
        x: an.x + (this.r() - 0.5) * an.w * 0.9,
        y: an.y - an.h * 0.2 + (this.r() - 0.5) * an.h * 0.4,
        vy: st === "freeze" ? 0 : -35,
        vx: (this.r() - 0.5) * 30,
        vida: this.ms(700),
        s0: 5,
        s1: 3,
        forma,
        c: cor,
        c2: "#FFFFFF",
        camada: 4,
        brilho: st === "paralysis" ? 1.2 : 0.4,
        rot: this.r() * TAU,
      });
  }

  // Outro golpe dentro deste (Metronome, Sleep Talk, Mirror Move...).
  async tocarOutro(spec: MoveVisualSpec) {
    const t = this.m.tocar(spec, { ...this.ctx, seed: Math.floor(this.r() * 1e6) });
    await t.impacto;
    this.fase("impact");
    await t.fim;
  }
}

const FORMA_STATUS: Partial<Record<StatusVis, [Forma, string]>> = {
  sleep: ["z", "#C8D6FF"],
  paralysis: ["faisca", "#FFE14D"],
  burn: ["chama", "#FF8A3D"],
  poison: ["bolha", "#B060C8"],
  toxic: ["bolha", "#5A1F6A"],
  freeze: ["cristal", "#BFEFFF"],
  confusion: ["estrela", "#FFE14D"],
  attract: ["coracao", "#FF6FA8"],
  "leech-seed": ["folha", "#5DB83F"],
  curse: ["fumaca", "#3A2450"],
  nightmare: ["fumaca", "#3A2450"],
  perish: ["nota", "#E8DCFF"],
};

export const ARCOIRIS = ["#FF5A5A", "#FF9A3C", "#FFE14D", "#5BD16A", "#3CC8FF", "#5A6CFF", "#C46CFF"];

// O que voa do alvo quando o golpe acerta, por tipo.
const DETRITO: { forma: Forma; cor?: string; cor2?: string; grav?: number; brilho?: number }[] = [
  { forma: "estrela", cor: "#FFFFFF", cor2: "#FFF6C8", brilho: 0.4 }, // Normal
  { forma: "chama", grav: -120, brilho: 1 }, // Fire
  { forma: "gota", grav: 380, brilho: 0.2 }, // Water
  { forma: "faisca", brilho: 1.3 }, // Electric
  { forma: "folha", grav: 60, brilho: 0.2 }, // Grass
  { forma: "cristal", grav: 200, brilho: 0.6 }, // Ice
  { forma: "estrela", cor: "#FFE08A", brilho: 0.6 }, // Fighting
  { forma: "bolha", grav: -60, brilho: 0.2 }, // Poison
  { forma: "pedra", grav: 420, brilho: 0 }, // Ground
  { forma: "pena", grav: 40, brilho: 0.2 }, // Flying
  { forma: "brilho", brilho: 1 }, // Psychic
  { forma: "estilhaco", grav: 200, brilho: 0.2 }, // Bug
  { forma: "pedra", grav: 420, brilho: 0 }, // Rock
  { forma: "fumaca", cor: "#4A3468", grav: -40, brilho: 0.5 }, // Ghost
  { forma: "estilhaco", brilho: 1 }, // Dragon
  { forma: "fumaca", cor: "#2E2238", grav: -30, brilho: 0 }, // Dark
  { forma: "faisca", cor: "#FFFFFF", cor2: "#C8C8E0", grav: 260, brilho: 1 }, // Steel
  { forma: "coracao", grav: -40, brilho: 0.6 }, // Fairy
];

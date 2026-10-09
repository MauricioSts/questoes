// PLAYER DE RECEITAS COM SPRITES. Toca uma MoveAnim (JSON) no motor de golpes: camadas com
// tracks interpoladas, sequências de quadros, partículas com seed, fundo rolando, tremor,
// clarão e escurecimento. Só desenha: dano e regra continuam com a batalha.
//
// - Tempo em quadros de 1/60 s sobre o relógio do motor (tempo real, não por render): a
//   mesma duração em qualquer aparelho, e "pular" / velocidade / hitstop funcionam igual ao
//   procedural.
// - Escala inteira: S = tamanho dos Pokémon na arena / 80 px do DS (1×..4×). Pixels nítidos
//   (imageSmoothingEnabled = false) e posição arredondada ao pixel do aparelho.
// - Receita escrita para "meu Pokémon ataca": o inimigo atacando espelha x (e gira 180° os
//   quadros que são tela do DS).
import { TREMOR, rngDe, type Kit } from "../motor";
import type { Ancora } from "../tipos";
import type { SpritesFx } from "./fx";
import type { AnchorName, Ease, Layer, MoveAnim, Track } from "./tipos";

const MS_QUADRO = 1000 / 60;
const DS_TELA: [number, number] = [132, -64]; // usuário → alvo na tela do DS (receitas e quadros de tela)
const ANG_DS = Math.atan2(DS_TELA[1], DS_TELA[0]);
const DIST_DS = Math.hypot(DS_TELA[0], DS_TELA[1]);

export function ease(e: Ease | undefined, f: number) {
  switch (e) {
    case "in":
      return f * f;
    case "out":
      return 1 - (1 - f) * (1 - f);
    case "inout":
      return f < 0.5 ? 2 * f * f : 1 - 2 * (1 - f) * (1 - f);
    default:
      return f;
  }
}

export function avaliar(tr: Track | undefined, t: number, padrao: number): number {
  const ks = tr?.keys;
  if (!ks || !ks.length) return padrao;
  if (t <= ks[0].t) return ks[0].v;
  for (let i = 1; i < ks.length; i++) {
    const b = ks[i];
    if (t <= b.t) {
      const a = ks[i - 1];
      const f = b.t === a.t ? 1 : (t - a.t) / (b.t - a.t);
      return a.v + (b.v - a.v) * ease(b.ease, f);
    }
  }
  return ks[ks.length - 1].v;
}

export function quadroNo(l: Layer, lt: number): number {
  const s = l.frameSeq;
  if (!s || !s.frames.length) return l.frame ?? 0;
  const i = Math.floor((lt * s.fps) / 60);
  return s.frames[s.loop ? i % s.frames.length : Math.min(i, s.frames.length - 1)];
}

interface Instancia {
  t0: number; // início (quadros da animação)
  vida: number;
  dx: number; // deslocamento do spawn (px DS)
  dy: number;
  giro: number; // graus por quadro
  quadro?: number; // quadro sorteado (spawn.frames)
  fase: number; // órbita: ângulo inicial (rad)
}

// Instâncias de uma camada: uma, ou `count` partículas espalhadas com seed determinística.
export function instancias(l: Layer, reduzido: boolean, seedBase: number): Instancia[] {
  const vida = l.end - l.start;
  if (!l.spawn) return [{ t0: l.start, vida, dx: 0, dy: 0, giro: 0, fase: 0 }];
  const sp = l.spawn;
  const r = rngDe((sp.seed ?? 1) * 7919 + seedBase);
  const [sx, sy] = Array.isArray(sp.spread) ? sp.spread : [sp.spread, sp.spread];
  const n = reduzido ? Math.max(1, Math.ceil(sp.count / 2)) : sp.count;
  const out: Instancia[] = [];
  for (let i = 0; i < n; i++) {
    const t0 = l.start + i * sp.interval * (reduzido ? 2 : 1);
    const dx = (r() * 2 - 1) * sx;
    const dy = (r() * 2 - 1) * sy;
    const giro = sp.spin ? (r() * 2 - 1) * sp.spin : 0;
    const quadro = sp.frames?.length ? sp.frames[Math.floor(r() * sp.frames.length)] : undefined;
    out.push({ t0, vida: sp.life ?? Math.max(1, l.end - t0), dx, dy, giro, quadro, fase: (i / n) * Math.PI * 2 });
  }
  return out;
}

// Deslocamento (px DS) de uma cópia no tempo local: spread, explosão radial, queda e órbita.
export function deslocamento(l: Layer, ins: Instancia, lt: number): [number, number] {
  let x = ins.dx;
  let y = ins.dy;
  const sp = l.spawn;
  if (sp) {
    if (sp.burst) {
      const d = Math.hypot(ins.dx, ins.dy) || 1;
      x += (ins.dx / d) * sp.burst * lt;
      y += (ins.dy / d) * sp.burst * lt;
    }
    x += (sp.vx ?? 0) * lt;
    y += (sp.vy ?? 0) * lt + 0.5 * (sp.gravity ?? 0) * lt * lt;
  }
  if (l.orbit) {
    const a = ins.fase + (l.orbit.speed * lt * Math.PI) / 180;
    x += Math.cos(a) * l.orbit.rx;
    y += Math.sin(a) * l.orbit.ry;
  }
  return [x, y];
}

export async function tocarReceita(kit: Kit, anim: MoveAnim, fx: SpritesFx, tipo?: number): Promise<void> {
  const m = kit.m;
  const A = kit.A;
  const Ts = kit.Ts;
  const virado = A.lado === "inimigo";
  const sx = virado ? -1 : 1;
  const rm = kit.rm;
  const msPorQuadro = MS_QUADRO / kit.vel;
  const total = anim.duration * msPorQuadro;
  const atlas = fx.atlas!;
  const S = escala(A, Ts[0]);
  const dist = Math.hypot(Ts[0].x - A.x, Ts[0].y - A.y);
  const Sds = Math.max(1, Math.min(5, Math.round(dist / DIST_DS)));
  const seedBase = (kit.ctx.seed ?? 7) >>> 0;

  const ponto = (nome: AnchorName, T: Ancora): [number, number] => {
    const alvo = kit.destino(T);
    switch (nome) {
      case "user":
        return [A.x, A.y];
      case "field-user":
        return [A.x, A.y + A.h * 0.45];
      case "target":
        return [alvo.x, alvo.y];
      case "field-target":
        return [alvo.x, alvo.y + T.h * 0.45];
      default:
        return [m.largura / 2, m.altura / 2];
    }
  };

  const prepCamadas = anim.layers.map((l) => ({
    l,
    inst: instancias(l, rm, seedBase),
    porAlvo: l.perTarget ?? (l.anchor.includes("target") || (l.to ?? "").includes("target")),
  }));

  // textura repetida dentro da silhueta do Pokémon (o sprite é um <img> do DOM: desenha num
  // canvas à parte, recorta com destination-in e cola de volta)
  let recorte: HTMLCanvasElement | null = null;
  const desenharMascara = (g: CanvasRenderingContext2D, l: Layer, img: CanvasImageSource, q: { x: number; y: number; w: number; h: number }, lt: number, alpha: number) => {
    const an = l.maskActor === "user" ? A : Ts[0];
    const sil = m.atores.silhueta?.(an.chave);
    if (!sil || typeof document === "undefined") return;
    const dpr = m.dprAtual;
    const w = Math.max(1, Math.round(sil.w * dpr));
    const h = Math.max(1, Math.round(sil.h * dpr));
    recorte ??= document.createElement("canvas");
    if (recorte.width !== w || recorte.height !== h) {
      recorte.width = w;
      recorte.height = h;
    }
    const c = recorte.getContext("2d")!;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalCompositeOperation = "source-over";
    c.globalAlpha = 1;
    c.clearRect(0, 0, w, h);
    c.imageSmoothingEnabled = false;
    const k = S * dpr;
    const tw = q.w * k;
    const th = q.h * k;
    let ox = ((l.scroll?.dx ?? 0) * lt * k) % tw;
    let oy = ((l.scroll?.dy ?? 0) * lt * k) % th;
    if (ox > 0) ox -= tw;
    if (oy > 0) oy -= th;
    for (let yy = oy; yy < h; yy += th) for (let xx = ox; xx < w; xx += tw) c.drawImage(img, q.x, q.y, q.w, q.h, Math.round(xx), Math.round(yy), Math.ceil(tw), Math.ceil(th));
    // recorte numa operação só: com source-in a cada ladrilho o canvas apagaria os anteriores
    c.globalCompositeOperation = "destination-in";
    c.drawImage(sil.img, 0, 0, w, h);
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = Math.min(1, alpha);
    g.drawImage(recorte, Math.round(sil.x * dpr), Math.round(sil.y * dpr));
  };

  const desenharCamada = (g: CanvasRenderingContext2D, c: (typeof prepCamadas)[number], t: number) => {
    const { l } = c;
    if (t < l.start || t >= l.end + (l.spawn?.life ?? 0)) return;
    const nome = virado && l.assetVirado ? l.assetVirado : l.asset;
    const arq = atlas.arquivos[nome];
    const img = fx.imagem(nome, l.keepColor ? undefined : tipo);
    if (!arq || !img) return;
    const dpr = m.dprAtual;
    const alvos = c.porAlvo ? Ts : [Ts[0]];
    g.globalCompositeOperation = l.blend === "add" ? "lighter" : "source-over";
    for (const T of alvos)
      for (const ins of c.inst) {
        const lt = t - ins.t0;
        if (lt < 0 || lt >= ins.vida) continue;
        const q = arq.quadros[ins.quadro ?? quadroNo(l, lt)];
        if (!q) continue;
        const tr = l.tracks ?? {};
        const alpha = avaliar(tr.alpha, lt, 1);
        if (alpha <= 0.01) continue;
        if (l.maskActor) {
          desenharMascara(g, l, img, q, lt, alpha);
          continue;
        }
        const esc = avaliar(tr.scale, lt, 1);
        const [ddx, ddy] = deslocamento(l, ins, lt);
        const ox = avaliar(tr.x, lt, 0) + ddx;
        const oy = avaliar(tr.y, lt, 0) + ddy;
        let x: number, y: number, mx: number, my: number, s: number;
        if (l.ds) {
          // tela do DS: o centro da célula vai para o meio entre usuário e alvo
          const mid = [(A.x + T.x) / 2, (A.y + T.y) / 2];
          x = mid[0] + (q.ox + ox) * sx * Sds;
          y = mid[1] + (q.oy + oy) * sx * Sds;
          mx = sx;
          my = sx;
          s = Sds;
        } else {
          let [bx, by] = ponto(l.anchor, T);
          if (l.to) {
            const p = avaliar(tr.p, lt, 0);
            const [tx, ty] = ponto(l.to, T);
            bx += (tx - bx) * p;
            by += (ty - by) * p - (l.arc ?? 0) * S * Math.sin(Math.PI * Math.min(1, Math.max(0, p)));
          }
          x = bx + ox * sx * S;
          y = by + oy * S;
          mx = virado && l.flipWithSide !== false ? -1 : 1;
          my = 1;
          s = S;
        }
        let rot = (avaliar(tr.rot, lt, 0) + ins.giro * lt) * (Math.PI / 180);
        if (l.orient) {
          const [tx, ty] = ponto("target", T);
          rot += Math.atan2(ty - A.y, (tx - A.x) * mx) - ANG_DS;
        }
        g.setTransform(dpr, 0, 0, dpr, Math.round(x * dpr), Math.round(y * dpr));
        g.globalAlpha = Math.min(1, alpha);
        g.scale(mx, my);
        g.rotate(rot);
        g.scale(s * esc, s * esc);
        g.drawImage(img, q.x, q.y, q.w, q.h, -q.w / 2, -q.h / 2, q.w, q.h);
      }
  };

  // um desenho por camada do motor usada (o motor pinta por camada, de baixo para cima)
  const zs = [...new Set(anim.layers.map((l) => l.z ?? 2))];
  for (const z of zs) {
    const minhas = prepCamadas.filter((c) => (c.l.z ?? 2) === z);
    m.desenho({
      camada: z,
      dur: total,
      dono: kit.dono,
      draw: (g, k) => {
        g.imageSmoothingEnabled = false;
        const t = k * anim.duration;
        for (const c of minhas) desenharCamada(g, c, t);
      },
    });
  }

  // fundo e escurecimento: no canvas de trás (atrás dos Pokémon)
  const bg = anim.bg;
  const tints = anim.screen?.tint ?? [];
  if (bg || tints.length)
    m.desenho({
      camada: 0,
      fundo: true,
      dur: total,
      dono: kit.dono,
      draw: (g, k) => {
        const t = k * anim.duration;
        const dpr = m.dprAtual;
        const W = m.largura;
        const H = m.altura;
        g.imageSmoothingEnabled = false;
        if (bg && t >= bg.start && t < bg.end) {
          const arq = atlas.arquivos[bg.asset];
          const img = fx.imagem(bg.asset, tipo);
          const lt = t - bg.start;
          const quadro = bg.frames?.length ? bg.frames[Math.floor((lt * (bg.fps ?? 8)) / 60) % bg.frames.length] : (bg.frame ?? 0);
          const q = arq?.quadros[quadro];
          if (img && q) {
            const fade = Math.min(1, lt / 6, (bg.end - t) / 6);
            g.globalAlpha = avaliar(bg.alpha, lt, 1) * fade;
            const Sb = Math.max(1, Math.ceil(H / q.h)); // fundo cobre a altura da arena
            const w = q.w * Sb;
            const h = q.h * Sb;
            const vel = rm ? 0 : 1;
            let ox = ((bg.scroll?.dx ?? 0) * lt * Sb * vel) % w;
            let oy = ((bg.scroll?.dy ?? 0) * lt * Sb * vel) % h;
            if (ox > 0) ox -= w;
            if (oy > 0) oy -= h;
            // o inimigo atacando vê a tela espelhada (o fundo corre para o outro lado)
            if (virado) g.setTransform(-dpr, 0, 0, dpr, W * dpr, 0);
            else g.setTransform(dpr, 0, 0, dpr, 0, 0);
            for (let yy = oy; yy < H; yy += h) for (let xx = ox; xx < W; xx += w) g.drawImage(img, q.x, q.y, q.w, q.h, Math.round(xx), Math.round(yy), w, h);
          }
        }
        for (const ti of tints) {
          if (t < ti.start || t >= ti.end) continue;
          const f = Math.min(1, (t - ti.start) / 8, (ti.end - t) / 8);
          g.setTransform(dpr, 0, 0, dpr, 0, 0);
          g.globalAlpha = ti.alpha * f * (rm ? 0.5 : 1);
          g.fillStyle = ti.color;
          g.fillRect(0, 0, W, H);
        }
      },
    });

  // eventos no tempo: tremor, clarão, ator e hits. O Kit já divide pela velocidade, então
  // recebe a duração em ms de quadro sem ela.
  type Evento = { t: number; f: () => void };
  const eventos: Evento[] = [];
  for (const sh of anim.screen?.shake ?? []) eventos.push({ t: sh.t, f: () => kit.tremerTela(sh.amp * S, sh.dur * MS_QUADRO) });
  for (const fl of anim.screen?.flash ?? []) eventos.push({ t: fl.t, f: () => kit.clarao(fl.color, fl.alpha, fl.dur * MS_QUADRO) });
  for (const a of anim.actor ?? []) eventos.push({ t: a.t, f: () => ator(kit, a.who === "user" ? A : Ts[0], a.kind, (a.dur ?? 12) * MS_QUADRO, sx) });
  const hits = anim.hits?.length ? anim.hits : [];
  hits.forEach((h, i) => eventos.push({ t: h, f: () => reagir(kit, anim.react ?? "hit", i === 0) }));
  eventos.sort((a, b) => a.t - b.t);

  kit.fase("anticipation");
  let agora = 0;
  let viajou = false;
  for (const ev of eventos) {
    if (ev.t > agora) {
      if (!viajou && hits.length && ev.t >= hits[0] * 0.5) {
        kit.fase("travel");
        viajou = true;
      }
      await m.esperar((ev.t - agora) * msPorQuadro, kit.dono);
      agora = ev.t;
    }
    if (!kit.pulando) ev.f();
  }
  if (!hits.length) kit.fase("impact"); // golpe sem acerto (buff, campo): a batalha segue
  await m.esperar((anim.duration - agora) * msPorQuadro, kit.dono);
  kit.fase("aftermath");
}

// Escala inteira pelo menor dos dois Pokémon (o DS desenha os dois com 80 px; aqui as costas
// do meu Pokémon saem bem maiores e inflariam os efeitos).
export function escala(A: Ancora, T: Ancora) {
  const px = Math.min(A.h, T.h) / 0.8;
  return Math.max(1, Math.min(4, Math.round(px / 80)));
}

function reagir(kit: Kit, modo: NonNullable<MoveAnim["react"]>, primeiro: boolean) {
  const res = kit.resultado;
  if (modo === "self" || modo === "none") {
    kit.fase("impact");
    return;
  }
  for (const T of kit.Ts) {
    if (res === "miss") {
      kit.fase("impact");
      if (primeiro) kit.esquiva(T);
      continue;
    }
    if (res === "noEffect") {
      kit.fase("impact");
      continue;
    }
    if (res === "crit" && primeiro) kit.hitstop(80);
    kit.fase("impact");
    kit.mover(T, [{ filter: "brightness(1)" }, { filter: "brightness(2.4)" }, { filter: "brightness(1)" }], 160, "linear");
    if (modo === "hit") {
      kit.tremer(T, TREMOR[kit.tier] * (res === "notVeryEffective" ? 0.5 : 1), 260);
      if (primeiro && kit.tier >= 2 && res !== "notVeryEffective") kit.tremerTela(kit.tier === 3 ? 5 : 2, 240);
    }
    if (primeiro && kit.spec.statusInflige && kit.spec.archetype !== "STATUS") kit.statusPulso(T, kit.spec.statusInflige);
  }
}

function ator(kit: Kit, an: Ancora, tipo: string, ms: number, sx: number) {
  const d = an.w * 0.35 * sx;
  switch (tipo) {
    case "lunge":
      kit.mover(an, [{ transform: "translate(0,0)" }, { transform: `translate(${d}px, ${-d * 0.25 * sx}px)`, offset: 0.4 }, { transform: "translate(0,0)" }], ms, "ease-out");
      break;
    case "dash":
      kit.mover(an, [{ transform: "translate(0,0)" }, { transform: `translate(${d * 3}px, ${-d * 0.9 * sx}px)`, offset: 0.45 }, { transform: "translate(0,0)" }], ms, "ease-in-out");
      break;
    case "hop":
      kit.mover(an, [{ transform: "translate(0,0)" }, { transform: `translate(0, ${-an.h * 0.18}px)`, offset: 0.5 }, { transform: "translate(0,0)" }], ms, "ease-out");
      break;
    case "shake":
      kit.tremer(an, 4, ms);
      break;
    case "blink":
      kit.mover(an, [{ opacity: 1 }, { opacity: 0.2 }, { opacity: 1 }, { opacity: 0.2 }, { opacity: 1 }], ms, "linear");
      break;
    case "hide":
      kit.mover(an, [{ opacity: 1 }, { opacity: 0, offset: 0.2 }, { opacity: 0, offset: 0.8 }, { opacity: 1 }], ms, "linear");
      break;
    case "show":
      kit.mover(an, [{ opacity: 0 }, { opacity: 1 }], ms, "linear");
      break;
  }
}

// Efeitos do palco, criados sob demanda dentro de um <g> do SVG e animados pela Web
// Animations API. Cada chamada monta os elementos, anima e remove sozinha no fim.
// Coordenadas em unidades do palco (viewBox 1000×520).

const NS = "http://www.w3.org/2000/svg";
const TRACO = "#141018";

type P = { x: number; y: number };
type Attrs = Record<string, string | number>;

export class Fx {
  constructor(private camada: SVGGElement) {}

  private el<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Attrs = {}, pai: Element = this.camada): SVGElementTagNameMap[K] {
    const e = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
    pai.appendChild(e);
    return e;
  }

  private anima(e: Element, quadros: Keyframe[], dur: number, extra: KeyframeAnimationOptions = {}) {
    const a = (e as SVGElement).animate(quadros, { duration: dur, easing: "ease-out", fill: "forwards", ...extra });
    return a.finished.catch(() => undefined);
  }

  private centro(e: SVGElement) {
    e.style.transformBox = "fill-box";
    e.style.transformOrigin = "center";
  }

  private async descarta(e: Element, promessa: Promise<unknown>) {
    await promessa;
    e.remove();
  }

  // Linha que se desenha de A até B (teia, fio, rastro), com curva opcional.
  linha(de: P, para: P, o: { cor?: string; larg?: number; contorno?: string; curva?: number; dur?: number; fica?: number } = {}) {
    const mx = (de.x + para.x) / 2;
    const my = (de.y + para.y) / 2 + (o.curva ?? 0);
    const d = `M${de.x},${de.y} Q${mx},${my} ${para.x},${para.y}`;
    const g = this.el("g");
    if (o.contorno) this.el("path", { d, fill: "none", stroke: o.contorno, "stroke-width": (o.larg ?? 3) + 3, "stroke-linecap": "round", pathLength: 1, "stroke-dasharray": 1 }, g);
    this.el("path", { d, fill: "none", stroke: o.cor ?? "#fff", "stroke-width": o.larg ?? 3, "stroke-linecap": "round", pathLength: 1, "stroke-dasharray": 1 }, g);
    const dur = o.dur ?? 180;
    g.querySelectorAll("path").forEach((p) => this.anima(p, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], dur, { easing: "ease-in" }));
    void this.descarta(g, this.anima(g, [{ opacity: 1 }, { opacity: 1, offset: 0.7 }, { opacity: 0 }], dur + (o.fica ?? 450)));
    return new Promise<void>((r) => setTimeout(r, dur));
  }

  teia(em: P, raio = 60) {
    const n = 10;
    const ang = Array.from({ length: n }, (_, i) => (i / n) * Math.PI * 2);
    const pt = (a: number, r: number) => `${(em.x + Math.cos(a) * r).toFixed(1)},${(em.y + Math.sin(a) * r).toFixed(1)}`;
    let d = ang.map((a) => `M${em.x},${em.y} L${pt(a, raio)}`).join(" ");
    for (const f of [0.28, 0.5, 0.72, 0.94]) {
      d += ang.map((a, i) => `${i === 0 ? `M${pt(a, raio * f)}` : ""} Q${pt(a + Math.PI / n, raio * f * 0.82)} ${pt(ang[(i + 1) % n] + (i === n - 1 ? Math.PI * 2 : 0), raio * f)}`).join(" ");
    }
    const g = this.el("g");
    this.el("path", { d, fill: "none", stroke: "#FFFBF3", "stroke-width": 4, "stroke-linecap": "round" }, g);
    this.el("path", { d, fill: "none", stroke: TRACO, "stroke-width": 1.6, "stroke-linecap": "round" }, g);
    this.centro(g);
    void this.descarta(g, this.anima(g, [{ transform: "scale(.05) rotate(-80deg)", opacity: 1 }, { transform: "scale(1.08) rotate(0)", offset: 0.35 }, { transform: "scale(1)", opacity: 1, offset: 0.8 }, { opacity: 0 }], 1200, { easing: "cubic-bezier(.2,1.4,.4,1)" }));
  }

  impacto(em: P, cor = "#FFC857", grande = false) {
    const g = this.el("g", { transform: `translate(${em.x} ${em.y})` });
    const inner = this.el("g", {}, g);
    const k = grande ? 1.6 : 1;
    this.el("path", { d: "M0 -40 L9 -12 L38 -14 L14 4 L26 34 L0 16 L-26 34 L-14 4 L-38 -14 L-9 -12Z", fill: cor, stroke: "#fff", "stroke-width": 3, transform: `scale(${k})` }, inner);
    this.centro(inner);
    void this.anima(inner, [{ transform: "scale(0) rotate(-40deg)", opacity: 1 }, { transform: "scale(1.15) rotate(0)", offset: 0.4 }, { transform: "scale(1.35)", opacity: 0 }], 420);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + Math.random() * 0.3;
      const c = this.el("circle", { cx: 0, cy: 0, r: 3 + Math.random() * 2, fill: i % 2 ? "#fff" : cor }, g);
      const dist = (50 + Math.random() * 40) * k;
      void this.anima(c, [{ transform: "translate(0,0)", opacity: 1 }, { transform: `translate(${Math.cos(a) * dist}px,${Math.sin(a) * dist}px)`, opacity: 0 }], 480 + Math.random() * 200);
    }
    void this.descarta(g, new Promise((r) => setTimeout(r, 720)));
  }

  texto(em: P, txt: string, cor: string, grande = false) {
    const t = this.el("text", {
      x: em.x,
      y: em.y,
      "text-anchor": "middle",
      "font-size": grande ? 44 : 30,
      "font-weight": 900,
      "font-family": "system-ui, sans-serif",
      fill: cor,
      stroke: TRACO,
      "stroke-width": 5,
      "paint-order": "stroke",
      "stroke-linejoin": "round",
    });
    t.textContent = txt;
    this.centro(t);
    void this.descarta(
      t,
      this.anima(t, [{ transform: "translate(0,10px) scale(.3)", opacity: 0 }, { transform: "translate(0,-26px) scale(1.15)", opacity: 1, offset: 0.22 }, { transform: "translate(0,-44px) scale(1)", opacity: 1, offset: 0.75 }, { transform: "translate(0,-70px)", opacity: 0 }], 1300, { easing: "cubic-bezier(.2,1,.4,1)" })
    );
  }

  // Símbolo girando de A até B (contra-ataque da questão)
  projetil(de: P, para: P, conteudo: { glifo: string; cor: string }, dur = 380, tam = 1) {
    const g = this.el("g");
    const inner = this.el("g", { transform: `scale(${tam})` }, g);
    this.el("rect", { x: -20, y: -20, width: 40, height: 40, rx: 8, fill: conteudo.cor, stroke: TRACO, "stroke-width": 3 }, inner);
    const t = this.el("text", { x: 0, y: 6, "text-anchor": "middle", "font-size": 16, "font-weight": 900, fill: "#fff", "font-family": "ui-monospace, monospace" }, inner);
    t.textContent = conteudo.glifo;
    const a = g.animate(
      [
        { transform: `translate(${de.x}px,${de.y}px) rotate(0deg)` },
        { transform: `translate(${para.x}px,${para.y}px) rotate(${-900}deg)` },
      ],
      { duration: dur, easing: "cubic-bezier(.5,0,.9,.6)", fill: "forwards" }
    );
    void this.descarta(g, a.finished.catch(() => undefined));
    return new Promise<void>((r) => setTimeout(r, dur));
  }

  anel(de: P, para: P, cor = "#C9C2FF", atraso = 0, dur = 420) {
    const e = this.el("ellipse", { cx: 0, cy: 0, rx: 26, ry: 16, fill: "none", stroke: cor, "stroke-width": 4 });
    e.style.filter = `drop-shadow(0 0 6px ${cor})`;
    void this.descarta(
      e,
      e
        .animate(
          [
            { transform: `translate(${de.x}px,${de.y}px) scale(.4)`, opacity: 1 },
            { transform: `translate(${para.x}px,${para.y}px) scale(1.7)`, opacity: 0.2 },
          ],
          { duration: dur, delay: atraso, easing: "cubic-bezier(.5,0,.7,1)", fill: "both" }
        )
        .finished.catch(() => undefined)
    );
  }

  laser(de: P, para: P, cores = ["#00F0FF", "#FF2A6D", "#FCEE0A"]) {
    const g = this.el("g");
    cores.forEach((c, i) => {
      const off = (i - 1) * 6;
      const l = this.el("line", { x1: de.x, y1: de.y + off, x2: para.x, y2: para.y + off, stroke: c, "stroke-width": 6, "stroke-linecap": "round" }, g);
      l.style.filter = `drop-shadow(0 0 6px ${c})`;
      void this.anima(l, [{ opacity: 0 }, { opacity: 1, offset: 0.1 }, { opacity: 0.3, offset: 0.2 }, { opacity: 1, offset: 0.3 }, { opacity: 1, offset: 0.7 }, { opacity: 0 }], 600, { easing: "steps(6)" });
    });
    void this.descarta(g, new Promise((r) => setTimeout(r, 650)));
  }

  vento(de: P, para: P) {
    const g = this.el("g");
    [-26, -6, 14].forEach((dy, i) => {
      const d = `M${de.x},${de.y + dy} Q${(de.x + para.x) / 2},${de.y + dy - 40} ${para.x},${para.y + dy}`;
      const p = this.el("path", { d, fill: "none", stroke: "#9DB4E0", "stroke-width": 5, "stroke-linecap": "round", pathLength: 1, "stroke-dasharray": "0.3 1" }, g);
      void this.anima(p, [{ strokeDashoffset: 0.3, opacity: 1 }, { strokeDashoffset: -1, opacity: 0.4 }], 520, { delay: i * 60, fill: "both" });
    });
    for (let i = 0; i < 4; i++) {
      const pena = this.el("path", { d: "M10 -10C4 -10 -2 -6 -4 0l-1 3 3-1C4 0 9 -5 10 -10z", fill: "#EAF0FF", stroke: "#7F9BD0", "stroke-width": 1.2 }, g);
      void this.anima(pena, [{ transform: `translate(${de.x}px,${de.y + (i - 2) * 12}px) rotate(0) scale(2)` }, { transform: `translate(${para.x}px,${para.y + (i - 2) * 8}px) rotate(540deg) scale(2)`, opacity: 0.2 }], 560, { delay: i * 70, easing: "ease-in", fill: "both" });
    }
    void this.descarta(g, new Promise((r) => setTimeout(r, 900)));
  }

  tentaculo(de: P, para: P) {
    const d = `M${de.x},${de.y} C${de.x + 60},${de.y - 90} ${para.x - 80},${para.y - 60} ${para.x},${para.y}`;
    const g = this.el("g");
    for (const [cor, larg] of [["#3A4270", 16], ["#07080D", 11]] as const) {
      const p = this.el("path", { d, fill: "none", stroke: cor, "stroke-width": larg, "stroke-linecap": "round", pathLength: 1, "stroke-dasharray": 1 }, g);
      void this.anima(p, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0, offset: 0.35 }, { strokeDashoffset: 0, offset: 0.65 }, { strokeDashoffset: -1 }], 700, { easing: "cubic-bezier(.6,0,.3,1)" });
    }
    void this.descarta(g, new Promise((r) => setTimeout(r, 720)));
  }

  mordida(em: P) {
    const g = this.el("g", { transform: `translate(${em.x} ${em.y}) scale(1.4)` });
    const cima = this.el("path", { d: "M-40 -8 C-30 -44 30 -44 40 -8 L32 -4 L26 -16 L18 -4 L10 -16 L2 -4 L-6 -16 L-14 -4 L-22 -16 L-30 -4Z", fill: "#07080D", stroke: "#fff", "stroke-width": 2.5 }, g);
    const baixo = this.el("path", { d: "M-40 8 C-30 44 30 44 40 8 L32 4 L26 16 L18 4 L10 16 L2 4 L-6 16 L-14 4 L-22 16 L-30 4Z", fill: "#07080D", stroke: "#fff", "stroke-width": 2.5 }, g);
    void this.anima(cima, [{ transform: "translateY(-40px)", opacity: 0 }, { transform: "translateY(4px)", opacity: 1, offset: 0.5 }, { transform: "translateY(0)", opacity: 1, offset: 0.8 }, { opacity: 0 }], 700, { easing: "cubic-bezier(.7,0,.3,1.4)" });
    void this.anima(baixo, [{ transform: "translateY(40px)", opacity: 0 }, { transform: "translateY(-4px)", opacity: 1, offset: 0.5 }, { transform: "translateY(0)", opacity: 1, offset: 0.8 }, { opacity: 0 }], 700, { easing: "cubic-bezier(.7,0,.3,1.4)" });
    void this.descarta(g, new Promise((r) => setTimeout(r, 720)));
  }

  constelacao(em: P) {
    const pts: [number, number][] = [
      [-60, -30],
      [-20, -70],
      [30, -50],
      [64, 0],
      [16, 50],
      [-44, 30],
    ];
    const g = this.el("g", { transform: `translate(${em.x} ${em.y})` });
    const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x},${y}`).join(" ") + "Z M-20,-70 L16,50";
    const linha = this.el("path", { d, fill: "none", stroke: "#C9C2FF", "stroke-width": 2, pathLength: 1, "stroke-dasharray": 1 }, g);
    void this.anima(linha, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], 500);
    pts.forEach(([x, y], i) => {
      const s = this.el("path", { d: `M${x} ${y - 9} L${x + 2.5} ${y - 2.5} L${x + 9} ${y} L${x + 2.5} ${y + 2.5} L${x} ${y + 9} L${x - 2.5} ${y + 2.5} L${x - 9} ${y} L${x - 2.5} ${y - 2.5}Z`, fill: "#fff" }, g);
      s.style.filter = "drop-shadow(0 0 6px #C9C2FF)";
      this.centro(s);
      void this.anima(s, [{ transform: "scale(0)" }, { transform: "scale(1.3)", offset: 0.6 }, { transform: "scale(1)" }], 400, { delay: i * 70, fill: "both" });
    });
    void this.descarta(g, this.anima(g, [{ opacity: 1 }, { opacity: 1, offset: 0.75 }, { opacity: 0 }], 1400));
  }

  // Meteoros caindo do céu em diagonal sobre o alvo
  chuva(alvo: P, n = 5, cor = "#C9C2FF") {
    for (let i = 0; i < n; i++) {
      const de = { x: alvo.x - 220 + i * 30, y: -40 };
      const para = { x: alvo.x - 30 + i * 16, y: alvo.y - 20 + (i % 2) * 20 };
      const l = this.el("line", { x1: 0, y1: 0, x2: -40, y2: -60, stroke: cor, "stroke-width": 5, "stroke-linecap": "round" });
      l.style.filter = `drop-shadow(0 0 8px ${cor})`;
      void this.descarta(l, l.animate([{ transform: `translate(${de.x}px,${de.y}px)`, opacity: 1 }, { transform: `translate(${para.x}px,${para.y}px)`, opacity: 1 }], { duration: 360, delay: i * 90, easing: "ease-in", fill: "both" }).finished.catch(() => undefined));
    }
    return new Promise<void>((r) => setTimeout(r, 360 + (n - 1) * 90));
  }

  orbe(em: P, cor: string) {
    const g = this.el("g", { transform: `translate(${em.x} ${em.y})` });
    const b = this.el("g", {}, g);
    const grad = `orbe${Math.random().toString(36).slice(2, 7)}`;
    const defs = this.el("defs", {}, b);
    const rg = this.el("radialGradient", { id: grad, cx: "35%", cy: "30%", r: "70%" }, defs);
    this.el("stop", { offset: "0", "stop-color": "#fff" }, rg);
    this.el("stop", { offset: ".45", "stop-color": cor }, rg);
    this.el("stop", { offset: "1", "stop-color": TRACO }, rg);
    this.el("circle", { cx: 0, cy: 0, r: 22, fill: `url(#${grad})`, stroke: TRACO, "stroke-width": 3 }, b);
    this.el("path", { d: "M-22,0 H22", stroke: TRACO, "stroke-width": 3 }, b);
    this.el("circle", { cx: 0, cy: 0, r: 6, fill: "#fff", stroke: TRACO, "stroke-width": 3 }, b);
    b.style.filter = `drop-shadow(0 0 12px ${cor})`;
    void this.anima(
      b,
      [
        { transform: "translateY(-260px) scale(.6)", opacity: 0 },
        { transform: "translateY(0) scale(1)", opacity: 1, offset: 0.18 },
        { transform: "rotate(0)", offset: 0.3 },
        { transform: "rotate(-24deg)", offset: 0.38 },
        { transform: "rotate(0)", offset: 0.46 },
        { transform: "rotate(20deg)", offset: 0.54 },
        { transform: "rotate(0)", offset: 0.62 },
        { transform: "rotate(-12deg)", offset: 0.7 },
        { transform: "rotate(0) scale(1)", offset: 0.78 },
        { transform: "scale(1.3)", offset: 0.84 },
        { transform: "scale(1)", opacity: 1 },
      ],
      2400,
      { easing: "ease-in-out" }
    );
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const s = this.el("text", { x: 0, y: 6, "text-anchor": "middle", "font-size": 22, fill: "#FFC857", stroke: TRACO, "stroke-width": 1 }, g);
      s.textContent = "★";
      void this.anima(s, [{ transform: "translate(0,0) scale(.3)", opacity: 0 }, { transform: "translate(0,0) scale(.3)", opacity: 1, offset: 0.01 }, { transform: `translate(${Math.cos(a) * 70}px,${Math.sin(a) * 70}px) scale(1)`, opacity: 0 }], 700, { delay: 1900, fill: "both" });
    }
    void this.descarta(g, new Promise((r) => setTimeout(r, 3000)));
    return new Promise<void>((r) => setTimeout(r, 2500));
  }

  cura(em: P) {
    for (let i = 0; i < 10; i++) {
      const t = this.el("text", { x: em.x - 40 + ((i * 17) % 80), y: em.y + 20 - (i % 3) * 20, "font-size": 26, "font-weight": 900, fill: "#3BC46B", stroke: "#0E5A2C", "stroke-width": 2, "paint-order": "stroke" });
      t.textContent = "+";
      void this.descarta(t, this.anima(t, [{ transform: "translateY(0)", opacity: 0 }, { opacity: 1, offset: 0.3 }, { transform: "translateY(-80px)", opacity: 0 }], 1000, { delay: i * 60, fill: "both" }));
    }
  }

  poeira(em: P, forte = false) {
    for (let i = 0; i < (forte ? 10 : 6); i++) {
      const lado = i % 2 ? 1 : -1;
      const c = this.el("circle", { cx: em.x, cy: em.y, r: 8 + Math.random() * 8, fill: "rgba(200,190,170,.7)" });
      void this.descarta(c, this.anima(c, [{ transform: "translate(0,0) scale(.4)", opacity: 0.9 }, { transform: `translate(${lado * (40 + Math.random() * 60)}px,${-10 - Math.random() * 20}px) scale(1.4)`, opacity: 0 }], 600));
    }
  }

  escudo(em: P) {
    const c = this.el("circle", { cx: em.x, cy: em.y, r: 70, fill: "rgba(127,178,255,.25)", stroke: "#7FB2FF", "stroke-width": 4 });
    this.centro(c);
    void this.descarta(c, this.anima(c, [{ transform: "scale(.5)", opacity: 0 }, { transform: "scale(1.05)", opacity: 1, offset: 0.3 }, { transform: "scale(1)", opacity: 1, offset: 0.7 }, { opacity: 0 }], 700));
  }

  // Linhas de velocidade na tela inteira (dash, Sandevistan)
  velocidade(cor = "#fff", dur = 500) {
    const g = this.el("g");
    for (let i = 0; i < 14; i++) {
      const y = 30 + Math.random() * 460;
      const l = this.el("line", { x1: 0, y1: y, x2: 120 + Math.random() * 160, y2: y, stroke: cor, "stroke-width": 1.5 + Math.random() * 2, opacity: 0.6 }, g);
      void this.anima(l, [{ transform: "translateX(1100px)" }, { transform: "translateX(-300px)" }], 260 + Math.random() * 200, { delay: Math.random() * dur * 0.5, iterations: 2, fill: "both", easing: "linear" });
    }
    void this.descarta(g, new Promise((r) => setTimeout(r, dur + 500)));
  }

  // Véu colorido no palco inteiro (tempo parado do Sandevistan, fúria do chefe)
  veu(cor: string, dur: number, alfa = 0.28) {
    const r = this.el("rect", { x: -100, y: -100, width: 1200, height: 720, fill: cor, opacity: 0 });
    r.style.mixBlendMode = "multiply";
    void this.descarta(r, this.anima(r, [{ opacity: 0 }, { opacity: alfa, offset: 0.12 }, { opacity: alfa, offset: 0.85 }, { opacity: 0 }], dur));
  }
}

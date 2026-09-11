// Texto distorcido por um campo de ruído, com refração cromática e uma lente que segue
// o ponteiro. Adaptado do "Warp Text" do React Bits (reactbits.dev/text-animations/warp-text;
// Copyright (c) 2026 David Haz, licença MIT + Commons Clause: uso dentro do app, sem
// redistribuir o componente). O original é um bloco centralizado de altura fixa que
// ENCOLHE a fonte para caber; aqui ele virou título de página:
// - alinhado à esquerda e com quebra de linha por palavra (a fonte nunca encolhe) — a
//   altura do bloco acompanha o número de linhas;
// - o canvas transborda um pouco para os lados (PAD) para a distorção não ser cortada
//   rente às letras, sem ocupar espaço no layout nem capturar clique;
// - o campo de distorção é medido em alturas de linha, não em fração do canvas: numa
//   faixa larga e baixa o original esticava tudo na horizontal;
// - sem WebGL 2 o texto aparece normal; com WebGL por software (gpu.ts) ele é desenhado
//   uma vez, sem distorção, e não anima.
import { useEffect, useRef, useState } from "react";
import { Renderer, Program, Mesh, Triangle, Texture } from "ogl";
import { webglLento } from "./gpu";

export interface WarpTextProps {
  text: string;
  color?: string;
  fontSize?: number;
  fontWeight?: number;
  fontFamily?: string;
  /** múltiplo do tamanho da fonte */
  lineHeight?: number;
  /** em "em" */
  letterSpacing?: number;
  warpStrength?: number;
  warpScale?: number;
  speed?: number;
  pointerInfluence?: number;
  pointerStrength?: number;
  refraction?: number;
  ripple?: boolean;
  /** sombra desfocada em volta das letras (separa o título do fundo animado) */
  halo?: string;
  className?: string;
}

const vertex = `#version 300 es
in vec2 position;
in vec2 uv;
out vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

// Tudo em "unidades de altura": x é multiplicado pelo aspecto antes do ruído e a
// deformação resultante é dividida por ele de volta, então 1 unidade = altura do canvas
// nos dois eixos.
const fragment = `#version 300 es
precision highp float;

uniform sampler2D uTextTexture;
uniform vec2 uResolution;
uniform vec2 uPointer;
uniform float uPointerActive;
uniform float uTime;
uniform float uWarpStrength;
uniform float uWarpScale;
uniform float uSpeed;
uniform float uPointerInfluence;
uniform float uPointerStrength;
uniform float uRefraction;
uniform float uRipple;
uniform float uMotion;

in vec2 vUv;
out vec4 fragColor;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 4; i++) {
    value += amplitude * noise(p);
    p *= 2.02;
    amplitude *= 0.5;
  }
  return value;
}

vec4 sampleText(vec2 uv) {
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return vec4(0.0);
  return texture(uTextTexture, uv);
}

void main() {
  vec2 uv = vUv;
  float aspect = uResolution.x / max(uResolution.y, 1.0);
  vec2 p = vec2(uv.x * aspect, uv.y);
  float time = uTime * uSpeed;
  float scale = max(uWarpScale, 0.001);

  vec2 drift = vec2(time * 0.055, -time * 0.045);
  float n1 = fbm(p * scale * 3.1 + drift);
  float n2 = fbm((p + 19.17) * scale * 3.4 - drift.yx);
  vec2 ambient = (vec2(n1, n2) - 0.5) * uWarpStrength * 0.045 * uMotion;

  vec2 ptr = vec2(uPointer.x * aspect, uPointer.y);
  vec2 delta = p - ptr;
  float dist = length(delta);
  float radius = max(uPointerInfluence, 0.001);
  float t = clamp(dist / radius, 0.0, 1.0);
  float lens = smoothstep(radius, 0.0, dist) * uPointerActive;
  float bulge = t * (1.0 - t) * (1.0 - t) * 6.75 * uPointerActive;
  vec2 dir = dist > 0.0001 ? delta / dist : vec2(0.0);

  float rippleWave = sin(dist / radius * 12.0 - time * 4.2) * 0.5 + 0.5;
  float rippleRing = (rippleWave - 0.5) * uRipple;
  vec2 pointerWarp = -dir * bulge * uPointerStrength * 0.045;
  pointerWarp += dir * rippleRing * bulge * uPointerStrength * 0.016;

  vec2 warp = ambient + pointerWarp;
  float splitLen = length(warp);
  vec2 splitDir = splitLen > 0.00001 ? warp / splitLen : vec2(0.7071, 0.7071);
  vec2 split = splitDir * uRefraction * 0.16 * (0.35 + lens * 1.65);

  vec2 toUv = vec2(1.0 / aspect, 1.0);
  vec2 displaced = uv + warp * toUv;
  vec2 s = split * toUv;

  vec4 base = sampleText(displaced);
  vec4 plus = sampleText(displaced + s);
  vec4 minus = sampleText(displaced - s);
  float a = max(max(plus.a, base.a), minus.a);
  vec3 color = vec3(plus.r, base.g, minus.b) + lens * base.a * 0.055;
  fragColor = vec4(color, a);
}
`;

const measureLine = (ctx: CanvasRenderingContext2D, line: string, spacing: number) => {
  const chars = Array.from(line);
  return chars.reduce((w, c) => w + ctx.measureText(c).width, 0) + Math.max(0, chars.length - 1) * spacing;
};

// Quebra gulosa por palavra; palavra maior que a linha fica sozinha (e transborda) em vez
// de ser cortada no meio.
function quebrarLinhas(ctx: CanvasRenderingContext2D, texto: string, largura: number, spacing: number) {
  const linhas: string[] = [];
  for (const paragrafo of texto.split("\n")) {
    let atual = "";
    for (const palavra of paragrafo.split(/\s+/).filter(Boolean)) {
      const tentativa = atual ? `${atual} ${palavra}` : palavra;
      if (atual && measureLine(ctx, tentativa, spacing) > largura) {
        linhas.push(atual);
        atual = palavra;
      } else {
        atual = tentativa;
      }
    }
    linhas.push(atual);
  }
  return linhas;
}

export default function WarpText({
  text,
  color = "#f8f5ff",
  fontSize = 40,
  fontWeight = 600,
  fontFamily = "serif",
  lineHeight = 1.08,
  letterSpacing = -0.01,
  warpStrength = 1.4,
  warpScale = 1.1,
  speed = 0.55,
  pointerInfluence = 1.0,
  pointerStrength = 2.2,
  refraction = 0.09,
  ripple = true,
  halo,
  className = "",
}: WarpTextProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [semWebgl, setSemWebgl] = useState(false);
  const lh = fontSize * lineHeight;
  // Folga em volta das letras para a distorção e a refração não serem cortadas.
  const PAD = Math.min(16, Math.round(fontSize * 0.3));

  const conf = useRef({ text, color, fontSize, fontWeight, fontFamily, lh, letterSpacing, halo });
  conf.current = { text, color, fontSize, fontWeight, fontFamily, lh, letterSpacing, halo };
  const rasterRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    rasterRef.current?.();
  }, [text, color, fontSize, fontWeight, fontFamily, lh, letterSpacing, halo]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let renderer: Renderer;
    try {
      renderer = new Renderer({
        webgl: 2,
        alpha: true,
        premultipliedAlpha: false,
        antialias: true,
        dpr: Math.min(window.devicePixelRatio || 1, 2),
      });
      // O ogl cai para WebGL 1 (ou nada) em silêncio; o shader é GLSL 300 es.
      if (!renderer.isWebgl2) throw new Error("sem WebGL 2");
    } catch {
      setSemWebgl(true);
      return;
    }
    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);
    const canvas = gl.canvas as HTMLCanvasElement;
    Object.assign(canvas.style, {
      position: "absolute",
      left: `-${PAD}px`,
      top: `-${PAD}px`,
      width: `calc(100% + ${PAD * 2}px)`,
      height: `calc(100% + ${PAD * 2}px)`,
      display: "block",
      pointerEvents: "none",
    });
    canvas.setAttribute("aria-hidden", "true");
    container.appendChild(canvas);

    const texture = new Texture(gl, {
      generateMipmaps: false,
      minFilter: gl.LINEAR,
      magFilter: gl.LINEAR,
      wrapS: gl.CLAMP_TO_EDGE,
      wrapT: gl.CLAMP_TO_EDGE,
    });
    const geometry = new Triangle(gl);
    const reduzirMq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    let reduzir = reduzirMq?.matches ?? false;
    const lento = webglLento(gl as unknown as WebGL2RenderingContext);
    const program = new Program(gl, {
      vertex,
      fragment,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uTextTexture: { value: texture },
        uResolution: { value: new Float32Array([1, 1]) },
        uPointer: { value: new Float32Array([0.5, 0.5]) },
        uPointerActive: { value: 0 },
        uTime: { value: 0 },
        uWarpStrength: { value: warpStrength },
        uWarpScale: { value: warpScale },
        uSpeed: { value: speed },
        uPointerInfluence: { value: pointerInfluence },
        uPointerStrength: { value: pointerStrength },
        uRefraction: { value: refraction },
        uRipple: { value: ripple ? 1 : 0 },
        uMotion: { value: reduzir || lento ? 0 : 1 },
      },
    });
    const mesh = new Mesh(gl, { geometry, program });

    let disposed = false;
    let lost = false;
    const renderOnce = () => {
      if (!disposed && !lost) renderer.render({ scene: mesh });
    };

    let versao = 0;
    let larguraAnterior = -1;
    const rasterize = async (forcar = true) => {
      const v = ++versao;
      const c = conf.current;
      const fonte = `${c.fontWeight} ${c.fontSize}px ${c.fontFamily}`;
      try {
        await document.fonts?.load(fonte, c.text);
      } catch {
        /* segue com a fonte que houver */
      }
      if (disposed || lost || v !== versao) return;

      const largura = container.clientWidth;
      if (largura <= 0) return;
      if (!forcar && largura === larguraAnterior) return;
      larguraAnterior = largura;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const medidor = document.createElement("canvas").getContext("2d");
      if (!medidor) return;
      medidor.font = fonte;
      const spacing = c.letterSpacing * c.fontSize;
      const linhas = quebrarLinhas(medidor, c.text, largura, spacing);
      const altura = Math.ceil(linhas.length * c.lh);
      container.style.height = `${altura}px`;

      const w = largura + PAD * 2;
      const h = altura + PAD * 2;
      const tela = document.createElement("canvas");
      tela.width = Math.floor(w * dpr);
      tela.height = Math.floor(h * dpr);
      const ctx = tela.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.font = fonte;
      ctx.fillStyle = c.color;
      ctx.textBaseline = "middle";
      if (c.halo) {
        ctx.shadowColor = c.halo;
        ctx.shadowBlur = Math.round(PAD * 0.8);
      }
      linhas.forEach((linha, i) => {
        let x = PAD;
        const y = PAD + c.lh * (i + 0.5);
        for (const ch of Array.from(linha)) {
          ctx.fillText(ch, x, y);
          x += ctx.measureText(ch).width + spacing;
        }
      });

      renderer.dpr = dpr;
      renderer.setSize(w, h);
      const res = program.uniforms.uResolution.value as Float32Array;
      res[0] = gl.drawingBufferWidth;
      res[1] = gl.drawingBufferHeight;
      texture.image = tela;
      texture.needsUpdate = true;
      renderOnce();
    };
    rasterRef.current = () => void rasterize(true);

    const pointer = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, active: 0, dentro: false };
    // O canvas é maior que o container (PAD) — converte a posição para o canvas inteiro.
    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      const r = canvas.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) return;
      pointer.tx = (e.clientX - r.left) / r.width;
      pointer.ty = 1 - (e.clientY - r.top) / r.height;
      pointer.dentro = true;
    };
    const onPointerLeave = () => {
      pointer.dentro = false;
    };

    const t0 = performance.now();
    let raf = 0;
    let visivel = true;
    let paginaVisivel = !document.hidden;
    const loop = (now: number) => {
      if (disposed || lost) return;
      const el = (now - t0) * 0.001;
      // Sem ponteiro, a lente passeia devagar pelo título.
      const ix = 0.5 + Math.sin(el * 0.33) * 0.35;
      const iy = 0.5 + Math.cos(el * 0.27) * 0.2;
      const tx = pointer.dentro ? pointer.tx : ix;
      const ty = pointer.dentro ? pointer.ty : iy;
      const damping = pointer.dentro ? 0.12 : 0.035;
      pointer.x += (tx - pointer.x) * damping;
      pointer.y += (ty - pointer.y) * damping;
      pointer.active += ((pointer.dentro ? 1 : 0.18) - pointer.active) * 0.06;
      const u = program.uniforms;
      (u.uPointer.value as Float32Array)[0] = pointer.x;
      (u.uPointer.value as Float32Array)[1] = pointer.y;
      u.uPointerActive.value = reduzir ? pointer.active * 0.35 : pointer.active;
      u.uTime.value = reduzir ? 0 : el;
      renderOnce();
      raf = requestAnimationFrame(loop);
    };
    const start = () => {
      if (visivel && paginaVisivel && !raf && !lost && !lento) raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };

    const ro = new ResizeObserver(() => void rasterize(false));
    ro.observe(container);
    const io = new IntersectionObserver(([entry]) => {
      visivel = entry.isIntersecting;
      if (visivel) start();
      else stop();
    });
    io.observe(container);
    const onVisibility = () => {
      paginaVisivel = !document.hidden;
      if (paginaVisivel) start();
      else stop();
    };
    const onReduce = (e: MediaQueryListEvent) => {
      reduzir = e.matches;
      program.uniforms.uMotion.value = reduzir || lento ? 0 : 1;
    };
    const onLost = (e: Event) => {
      e.preventDefault();
      lost = true;
      stop();
      setSemWebgl(true);
    };
    container.addEventListener("pointermove", onPointerMove);
    container.addEventListener("pointerleave", onPointerLeave);
    canvas.addEventListener("webglcontextlost", onLost);
    document.addEventListener("visibilitychange", onVisibility);
    reduzirMq?.addEventListener("change", onReduce);

    void rasterize(true);
    start();

    return () => {
      disposed = true;
      rasterRef.current = null;
      stop();
      ro.disconnect();
      io.disconnect();
      container.removeEventListener("pointermove", onPointerMove);
      container.removeEventListener("pointerleave", onPointerLeave);
      canvas.removeEventListener("webglcontextlost", onLost);
      document.removeEventListener("visibilitychange", onVisibility);
      reduzirMq?.removeEventListener("change", onReduce);
      if (!lost) {
        try {
          if (texture.texture) gl.deleteTexture(texture.texture);
          geometry.remove();
          program.remove();
          gl.getExtension("WEBGL_lose_context")?.loseContext();
        } catch {
          /* contexto já foi embora */
        }
      }
      if (canvas.parentNode === container) container.removeChild(canvas);
    };
    // Parâmetros do shader entram na criação; o texto e a fonte re-rasterizam pelo efeito acima.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (semWebgl) {
    return (
      // aria-hidden: quem usa o componente já expõe o texto (TituloVivo põe um sr-only).
      <span aria-hidden className={`block ${className}`} style={{ fontSize, fontWeight, fontFamily, lineHeight, letterSpacing: `${letterSpacing}em`, color }}>
        {text}
      </span>
    );
  }
  return <div ref={containerRef} className={`relative w-full ${className}`} style={{ height: lh }} aria-hidden />;
}

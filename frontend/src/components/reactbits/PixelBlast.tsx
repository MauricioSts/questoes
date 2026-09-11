// Fundo de pixels pontilhados (dithering Bayer sobre ruído fractal). Adaptado do
// "Pixel Blast" do React Bits (reactbits.dev/backgrounds/pixel-blast; Copyright (c) 2026
// David Haz, licença MIT + Commons Clause: uso dentro do app, sem redistribuir o
// componente) para viver ATRÁS da interface do tema Cyberpunk:
// - portado de three.js + postprocessing para ogl, que o app já usa no Topography e no
//   Warp Text: o mesmo shader, sem trazer ~150 KB de three para um quadro em tela cheia.
//   Ficou de fora só o efeito "liquid" (pós-processamento que segue o mouse);
// - duas cores: o pixel mistura `color` e `color2` na diagonal da tela (magenta de um
//   lado, ciano do outro), a dupla de Edgerunners;
// - a camada não recebe clique, então a onda de clique escuta a janela inteira: clicar
//   em qualquer lugar do app solta um anel no fundo;
// - resolução limitada a 1.25x (os pixels são blocos, 2x só custava bateria);
// - prefers-reduced-motion, WebGL por software (gpu.ts) e `paused` congelam no quadro
//   atual; sem WebGL 2 a camada some e fica o fundo sólido do tema.
import { useEffect, useRef } from "react";
import { Renderer, Program, Mesh, Triangle } from "ogl";
import { webglLento } from "./gpu";

export type PixelBlastVariant = "square" | "circle" | "triangle" | "diamond";

export interface PixelBlastProps {
  variant?: PixelBlastVariant;
  pixelSize?: number;
  color?: string;
  /** Segunda cor, misturada na diagonal. Igual a `color` para um tom só. */
  color2?: string;
  patternScale?: number;
  patternDensity?: number;
  pixelSizeJitter?: number;
  enableRipples?: boolean;
  rippleIntensityScale?: number;
  rippleThickness?: number;
  rippleSpeed?: number;
  speed?: number;
  edgeFade?: number;
  /** Congela no quadro atual enquanto verdadeiro. */
  paused?: boolean;
  className?: string;
}

const SHAPE: Record<PixelBlastVariant, number> = { square: 0, circle: 1, triangle: 2, diamond: 3 };
const MAX_CLICKS = 10;

const hexToRgb = (hex: string): [number, number, number] => {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!r) return [1, 1, 1];
  return [parseInt(r[1], 16) / 255, parseInt(r[2], 16) / 255, parseInt(r[3], 16) / 255];
};

const vertex = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragment = `#version 300 es
precision highp float;

uniform vec3  uColor;
uniform vec3  uColor2;
uniform vec2  uResolution;
uniform float uTime;
uniform float uPixelSize;
uniform float uScale;
uniform float uDensity;
uniform float uPixelJitter;
uniform int   uEnableRipples;
uniform float uRippleSpeed;
uniform float uRippleThickness;
uniform float uRippleIntensity;
uniform float uEdgeFade;
uniform int   uShapeType;

const int MAX_CLICKS = ${MAX_CLICKS};
uniform vec2  uClickPos[MAX_CLICKS];
uniform float uClickTimes[MAX_CLICKS];

out vec4 fragColor;

float Bayer2(vec2 a) {
  a = floor(a);
  return fract(a.x / 2. + a.y * a.y * .75);
}
#define Bayer4(a) (Bayer2(.5*(a))*0.25 + Bayer2(a))
#define Bayer8(a) (Bayer4(.5*(a))*0.25 + Bayer2(a))

float hash11(float n){ return fract(sin(n)*43758.5453); }

float vnoise(vec3 p){
  vec3 ip = floor(p);
  vec3 fp = fract(p);
  float n000 = hash11(dot(ip + vec3(0.0,0.0,0.0), vec3(1.0,57.0,113.0)));
  float n100 = hash11(dot(ip + vec3(1.0,0.0,0.0), vec3(1.0,57.0,113.0)));
  float n010 = hash11(dot(ip + vec3(0.0,1.0,0.0), vec3(1.0,57.0,113.0)));
  float n110 = hash11(dot(ip + vec3(1.0,1.0,0.0), vec3(1.0,57.0,113.0)));
  float n001 = hash11(dot(ip + vec3(0.0,0.0,1.0), vec3(1.0,57.0,113.0)));
  float n101 = hash11(dot(ip + vec3(1.0,0.0,1.0), vec3(1.0,57.0,113.0)));
  float n011 = hash11(dot(ip + vec3(0.0,1.0,1.0), vec3(1.0,57.0,113.0)));
  float n111 = hash11(dot(ip + vec3(1.0,1.0,1.0), vec3(1.0,57.0,113.0)));
  vec3 w = fp*fp*fp*(fp*(fp*6.0-15.0)+10.0);
  float x00 = mix(n000, n100, w.x);
  float x10 = mix(n010, n110, w.x);
  float x01 = mix(n001, n101, w.x);
  float x11 = mix(n011, n111, w.x);
  float y0  = mix(x00, x10, w.y);
  float y1  = mix(x01, x11, w.y);
  return mix(y0, y1, w.z) * 2.0 - 1.0;
}

float fbm2(vec2 uv, float t){
  vec3 p = vec3(uv * uScale, t);
  float amp = 1.0;
  float freq = 1.0;
  float sum = 1.0;
  for (int i = 0; i < 5; ++i){
    sum  += amp * vnoise(p * freq);
    freq *= 1.25;
  }
  return sum * 0.5 + 0.5;
}

float maskCircle(vec2 p, float cov){
  float r = sqrt(cov) * .25;
  float d = length(p - 0.5) - r;
  float aa = 0.5 * fwidth(d);
  return cov * (1.0 - smoothstep(-aa, aa, d * 2.0));
}

float maskTriangle(vec2 p, vec2 id, float cov){
  bool flip = mod(id.x + id.y, 2.0) > 0.5;
  if (flip) p.x = 1.0 - p.x;
  float r = sqrt(cov);
  float d  = p.y - r*(1.0 - p.x);
  float aa = fwidth(d);
  return cov * clamp(0.5 - d/aa, 0.0, 1.0);
}

float maskDiamond(vec2 p, float cov){
  float r = sqrt(cov) * 0.564;
  return step(abs(p.x - 0.49) + abs(p.y - 0.49), r);
}

void main(){
  float pixelSize = uPixelSize;
  vec2 fragCoord = gl_FragCoord.xy - uResolution * .5;
  float aspectRatio = uResolution.x / uResolution.y;

  vec2 pixelId = floor(fragCoord / pixelSize);
  vec2 pixelUV = fract(fragCoord / pixelSize);

  float cellPixelSize = 8.0 * pixelSize;
  vec2 cellId = floor(fragCoord / cellPixelSize);
  vec2 cellCoord = cellId * cellPixelSize;
  vec2 uv = cellCoord / uResolution * vec2(aspectRatio, 1.0);

  float base = fbm2(uv, uTime * 0.05);
  base = base * 0.5 - 0.65;
  float feed = base + (uDensity - 0.5) * 0.3;

  if (uEnableRipples == 1) {
    for (int i = 0; i < MAX_CLICKS; ++i){
      vec2 pos = uClickPos[i];
      if (pos.x < 0.0) continue;
      vec2 cuv = (((pos - uResolution * .5 - cellPixelSize * .5) / (uResolution))) * vec2(aspectRatio, 1.0);
      float t = max(uTime - uClickTimes[i], 0.0);
      float r = distance(uv, cuv);
      float waveR = uRippleSpeed * t;
      float ring  = exp(-pow((r - waveR) / uRippleThickness, 2.0));
      float atten = exp(-1.0 * t) * exp(-10.0 * r);
      feed = max(feed, ring * atten * uRippleIntensity);
    }
  }

  float bayer = Bayer8(fragCoord / uPixelSize) - 0.5;
  float bw = step(0.5, feed + bayer);

  float h = fract(sin(dot(floor(fragCoord / uPixelSize), vec2(127.1, 311.7))) * 43758.5453);
  float coverage = bw * (1.0 + (h - 0.5) * uPixelJitter);
  float M;
  if      (uShapeType == 1) M = maskCircle(pixelUV, coverage);
  else if (uShapeType == 2) M = maskTriangle(pixelUV, pixelId, coverage);
  else if (uShapeType == 3) M = maskDiamond(pixelUV, coverage);
  else                      M = coverage;

  vec2 norm = gl_FragCoord.xy / uResolution;
  if (uEdgeFade > 0.0) {
    float edge = min(min(norm.x, norm.y), min(1.0 - norm.x, 1.0 - norm.y));
    M *= smoothstep(0.0, uEdgeFade, edge);
  }

  // Duotone: canto superior esquerdo em uColor, inferior direito em uColor2.
  float k = clamp(norm.x * 0.6 + (1.0 - norm.y) * 0.4, 0.0, 1.0);
  vec3 color = mix(uColor, uColor2, smoothstep(0.15, 0.85, k));

  M = clamp(M, 0.0, 1.0);
  fragColor = vec4(color * M, M); // alfa pré-multiplicado
}
`;

export default function PixelBlast({
  variant = "square",
  pixelSize = 3,
  color = "#B497CF",
  color2,
  patternScale = 2,
  patternDensity = 1,
  pixelSizeJitter = 0,
  enableRipples = true,
  rippleIntensityScale = 1,
  rippleThickness = 0.1,
  rippleSpeed = 0.3,
  speed = 0.5,
  edgeFade = 0.5,
  paused = false,
  className = "",
}: PixelBlastProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const programRef = useRef<Program | null>(null);
  const controleRef = useRef<{ start: () => void; stop: () => void; draw: () => void; dpr: number } | null>(null);
  const pausadoRef = useRef(paused);
  const speedRef = useRef(speed);
  const pixelRef = useRef(pixelSize);
  speedRef.current = speed;
  pixelRef.current = pixelSize;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
    let renderer: Renderer;
    try {
      renderer = new Renderer({ webgl: 2, alpha: true, premultipliedAlpha: true, antialias: false, dpr });
      if (!renderer.isWebgl2) return; // o shader é GLSL 300 es
    } catch {
      return;
    }
    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);
    const canvas = gl.canvas as HTMLCanvasElement;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
    container.appendChild(canvas);

    // Arrays comuns, não Float32Array: o ogl só reconhece uniform de array (uClickPos[0])
    // quando o valor passa em Array.isArray.
    const cliquePos: number[] = new Array(MAX_CLICKS * 2).fill(-1);
    const cliqueTempo: number[] = new Array(MAX_CLICKS).fill(0);
    const program = new Program(gl, {
      vertex,
      fragment,
      uniforms: {
        uColor: { value: new Float32Array(hexToRgb(color)) },
        uColor2: { value: new Float32Array(hexToRgb(color2 ?? color)) },
        uResolution: { value: new Float32Array([1, 1]) },
        uTime: { value: 0 },
        uPixelSize: { value: pixelSize * dpr },
        uScale: { value: patternScale },
        uDensity: { value: patternDensity },
        uPixelJitter: { value: pixelSizeJitter },
        uEnableRipples: { value: enableRipples ? 1 : 0 },
        uRippleSpeed: { value: rippleSpeed },
        uRippleThickness: { value: rippleThickness },
        uRippleIntensity: { value: rippleIntensityScale },
        uEdgeFade: { value: edgeFade },
        uShapeType: { value: SHAPE[variant] ?? 0 },
        uClickPos: { value: cliquePos },
        uClickTimes: { value: cliqueTempo },
      },
    });
    programRef.current = program;
    const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });

    const reduzir = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const lento = webglLento(gl as unknown as WebGL2RenderingContext);
    const parado = () => lento || !!reduzir?.matches;
    // Deslocamento aleatório no ruído: cada visita começa num padrão diferente.
    const deslocamento = Math.random() * 1000;
    let tempo = 0;
    let ultimo = 0;

    const draw = () => {
      program.uniforms.uTime.value = deslocamento + tempo * speedRef.current;
      renderer.render({ scene: mesh });
    };

    const setSize = () => {
      const rect = container.getBoundingClientRect();
      renderer.setSize(Math.max(1, Math.floor(rect.width)), Math.max(1, Math.floor(rect.height)));
      const res = program.uniforms.uResolution.value as Float32Array;
      res[0] = gl.drawingBufferWidth;
      res[1] = gl.drawingBufferHeight;
      program.uniforms.uPixelSize.value = pixelRef.current * dpr;
      draw();
    };
    const ro = new ResizeObserver(setSize);
    ro.observe(container);
    setSize();

    let raf = 0;
    let pageVisible = !document.hidden;
    let lost = false;
    let proximoClique = 0;

    const loop = (t: number) => {
      if (ultimo) tempo += Math.min(t - ultimo, 100) * 0.001;
      ultimo = t;
      draw();
      raf = requestAnimationFrame(loop);
    };
    const start = () => {
      if (lost || !pageVisible || parado() || pausadoRef.current || raf !== 0) return;
      ultimo = 0;
      raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };

    // Onda de clique. Só com o laço rodando: parado, o anel ficaria congelado no meio.
    const onPointerDown = (e: PointerEvent) => {
      if (!raf || !program.uniforms.uEnableRipples.value) return;
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const sx = gl.drawingBufferWidth / rect.width;
      const sy = gl.drawingBufferHeight / rect.height;
      cliquePos[proximoClique * 2] = (e.clientX - rect.left) * sx;
      cliquePos[proximoClique * 2 + 1] = (rect.height - (e.clientY - rect.top)) * sy;
      cliqueTempo[proximoClique] = program.uniforms.uTime.value as number;
      proximoClique = (proximoClique + 1) % MAX_CLICKS;
    };
    window.addEventListener("pointerdown", onPointerDown, { passive: true });

    const onVisibility = () => {
      pageVisible = !document.hidden;
      if (pageVisible) start();
      else stop();
    };
    const onReduce = () => {
      if (parado()) {
        stop();
        draw();
      } else start();
    };
    const onLost = (e: Event) => {
      e.preventDefault();
      lost = true;
      stop();
      canvas.style.display = "none";
    };
    document.addEventListener("visibilitychange", onVisibility);
    reduzir?.addEventListener("change", onReduce);
    canvas.addEventListener("webglcontextlost", onLost);
    controleRef.current = { start, stop, draw, dpr };
    start();

    return () => {
      stop();
      controleRef.current = null;
      programRef.current = null;
      ro.disconnect();
      window.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("visibilitychange", onVisibility);
      reduzir?.removeEventListener("change", onReduce);
      canvas.removeEventListener("webglcontextlost", onLost);
      if (canvas.parentNode === container) container.removeChild(canvas);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
    // Os valores iniciais entram na criação; as mudanças seguintes vão pelo efeito abaixo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    pausadoRef.current = paused;
    if (paused) controleRef.current?.stop();
    else controleRef.current?.start();
  }, [paused]);

  useEffect(() => {
    const program = programRef.current;
    const ctl = controleRef.current;
    if (!program || !ctl) return;
    const u = program.uniforms;
    u.uColor.value = new Float32Array(hexToRgb(color));
    u.uColor2.value = new Float32Array(hexToRgb(color2 ?? color));
    u.uPixelSize.value = pixelSize * ctl.dpr;
    u.uScale.value = patternScale;
    u.uDensity.value = patternDensity;
    u.uPixelJitter.value = pixelSizeJitter;
    u.uEnableRipples.value = enableRipples ? 1 : 0;
    u.uRippleSpeed.value = rippleSpeed;
    u.uRippleThickness.value = rippleThickness;
    u.uRippleIntensity.value = rippleIntensityScale;
    u.uEdgeFade.value = edgeFade;
    u.uShapeType.value = SHAPE[variant] ?? 0;
    ctl.draw();
  }, [color, color2, pixelSize, patternScale, patternDensity, pixelSizeJitter, enableRipples, rippleSpeed,
      rippleThickness, rippleIntensityScale, edgeFade, variant]);

  return <div ref={containerRef} className={`relative h-full w-full overflow-hidden ${className}`.trim()} aria-hidden />;
}

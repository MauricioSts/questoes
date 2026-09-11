// Fundo de curvas de nível animadas. Adaptado do "Topography" do React Bits
// (reactbits.dev/backgrounds/topography; Copyright (c) 2026 David Haz, licença
// MIT + Commons Clause: uso dentro do app, sem redistribuir o componente) para viver ATRÁS
// da interface do app:
// - o canvas não recebe clique (a camada é pointer-events: none), então o relevo que
//   segue o mouse escuta a janela inteira em vez do próprio canvas;
// - resolução limitada a 1.5x: são linhas finas e suaves, 2x só custava bateria;
// - prefers-reduced-motion congela o relevo num quadro parado;
// - sem WebGL 2 (navegador antigo, contexto perdido) a camada some e o fundo sólido do
//   tema continua lá — nada quebra.
import { useEffect, useRef } from "react";
import { Renderer, Program, Mesh, Triangle } from "ogl";

export type ColorMode = "elevation" | "uniform" | "alternating";

export interface TopographyProps {
  lowColor?: string;
  midColor?: string;
  highColor?: string;
  speed?: number;
  morphAmount?: number;
  morphSpeed?: number;
  bands?: number;
  thickness?: number;
  scale?: number;
  glow?: number;
  colorMode?: ColorMode;
  contrast?: number;
  brightness?: number;
  opacity?: number;
  grain?: boolean;
  grainIntensity?: number;
  mouseInteraction?: boolean;
  mouseRadius?: number;
  mouseStrength?: number;
  className?: string;
}

const hexToRgb = (hex: string): [number, number, number] => {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!r) return [1, 1, 1];
  return [parseInt(r[1], 16) / 255, parseInt(r[2], 16) / 255, parseInt(r[3], 16) / 255];
};

const colorModeToFloat = (mode: ColorMode) => (mode === "uniform" ? 1 : mode === "alternating" ? 2 : 0);

const vertex = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragment = `#version 300 es
precision highp float;
uniform vec2 iResolution;
uniform float iTime;
uniform float uMorphAmount;
uniform float uBands;
uniform float uThickness;
uniform float uScale;
uniform float uGlow;
uniform float uColorMode;
uniform float uContrast;
uniform float uBrightness;
uniform float uOpacity;
uniform vec3 uLow;
uniform vec3 uMid;
uniform vec3 uHigh;
uniform vec2 uMouse;
uniform float uMouseEnabled;
uniform float uMouseRadius;
uniform float uMouseStrength;
uniform float uMouseActive;
uniform float uGrain;
uniform float uGrainIntensity;
uniform vec4 uCtrlA;
uniform vec4 uCtrlB;
uniform vec4 uCtrlC;
uniform vec4 uCtrlD;
out vec4 fragColor;

float bez(float t, vec4 c) {
  float w = 6.2831853 * t;
  return 0.5 * (c.x * sin(w) + c.y * cos(w) + c.z * sin(2.0 * w) + c.w * cos(2.0 * w));
}

float field(vec2 uv) {
  vec2 a = vec2(bez(uv.x, uCtrlA), bez(uv.x, uCtrlB));
  vec2 b = vec2(bez(uv.y, uCtrlC), bez(uv.y, uCtrlD));
  return distance(a, b);
}

vec3 elevationColor(float e) {
  vec3 c = mix(uLow, uMid, smoothstep(0.0, 0.5, e));
  return mix(c, uHigh, smoothstep(0.5, 1.0, e));
}

void main() {
  vec2 res = iResolution.xy;
  vec2 uv = gl_FragCoord.xy / res;
  vec2 suv = (uv - 0.5) / max(uScale, 0.001) + 0.5;

  float fv = field(suv);

  if (uMouseEnabled > 0.5) {
    vec2 d = uv - uMouse;
    d.x *= res.x / max(res.y, 1.0);
    float r = max(uMouseRadius, 0.001);
    fv += exp(-dot(d, d) / (r * r)) * uMouseStrength * uMouseActive;
  }

  float f = fv * uBands;
  float frac = fract(f);
  float lineDist = min(frac, 1.0 - frac);

  float aa = fwidth(f) + 0.0001;
  float mask = 1.0 - smoothstep(uThickness - aa, uThickness + aa, lineDist);
  float glowR = uThickness + uGlow * 0.5 + aa;
  float glow = (1.0 - smoothstep(uThickness, glowR, lineDist)) * step(0.0001, uGlow);

  float elev = clamp(fv / (uMorphAmount * 2.5 + 0.001), 0.0, 1.0);

  vec3 lineCol;
  if (uColorMode < 0.5) {
    lineCol = elevationColor(elev);
  } else if (uColorMode < 1.5) {
    lineCol = uMid;
  } else {
    lineCol = mix(uMid, uHigh, mod(floor(f), 2.0));
  }

  float coverage = clamp(mask + glow * 0.55, 0.0, 1.0);
  coverage = pow(coverage, max(uContrast, 0.001));
  float outAlpha = coverage;

  if (uGrain > 0.5) {
    float g = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233)) + iTime) * 43758.5453);
    outAlpha += (g - 0.5) * uGrainIntensity;
  }

  vec3 outColor = clamp(lineCol * uBrightness, 0.0, 1.0);
  float a = clamp(outAlpha, 0.0, 1.0) * uOpacity;
  fragColor = vec4(outColor * a, a);
}
`;

const CTRL_INDICES = [
  [1, -2, 3, -4],
  [9, -8, 7, -6],
  [5, 2, 5, -5],
  [-1, -3, 8, 9],
];

export default function Topography({
  lowColor = "#5227FF",
  midColor = "#FF9FFC",
  highColor = "#FFFFFF",
  speed = 0.35,
  morphAmount = 3.0,
  morphSpeed = 0.05,
  bands = 2.0,
  thickness = 0.01,
  scale = 2.0,
  glow = 0.5,
  colorMode = "elevation",
  contrast = 3.0,
  brightness = 1.0,
  opacity = 1.0,
  grain = true,
  grainIntensity = 0.05,
  mouseInteraction = true,
  mouseRadius = 0.3,
  mouseStrength = 0.4,
  className = "",
}: TopographyProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const programRef = useRef<Program | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let renderer: Renderer;
    try {
      renderer = new Renderer({
        webgl: 2,
        alpha: true,
        premultipliedAlpha: true,
        antialias: false,
        dpr: Math.min(window.devicePixelRatio || 1, 1.5),
      });
      // O ogl cai para WebGL 1 (ou nada) em silêncio; o shader é GLSL 300 es.
      if (!renderer.isWebgl2) return;
    } catch {
      return; // sem WebGL: fica só o fundo sólido do tema
    }
    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);
    const canvas = gl.canvas as HTMLCanvasElement;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
    container.appendChild(canvas);

    const program = new Program(gl, {
      vertex,
      fragment,
      uniforms: {
        iTime: { value: 0 },
        iResolution: { value: new Float32Array([1, 1]) },
        uSpeed: { value: speed },
        uMorphAmount: { value: morphAmount },
        uMorphSpeed: { value: morphSpeed },
        uBands: { value: bands },
        uThickness: { value: thickness },
        uScale: { value: scale },
        uGlow: { value: glow },
        uColorMode: { value: colorModeToFloat(colorMode) },
        uContrast: { value: contrast },
        uBrightness: { value: brightness },
        uOpacity: { value: opacity },
        uGrain: { value: grain ? 1 : 0 },
        uGrainIntensity: { value: grainIntensity },
        uLow: { value: new Float32Array(hexToRgb(lowColor)) },
        uMid: { value: new Float32Array(hexToRgb(midColor)) },
        uHigh: { value: new Float32Array(hexToRgb(highColor)) },
        uMouse: { value: new Float32Array([0.5, 0.5]) },
        uMouseEnabled: { value: mouseInteraction ? 1 : 0 },
        uMouseRadius: { value: mouseRadius },
        uMouseStrength: { value: mouseStrength },
        uMouseActive: { value: 0 },
        uCtrlA: { value: new Float32Array(4) },
        uCtrlB: { value: new Float32Array(4) },
        uCtrlC: { value: new Float32Array(4) },
        uCtrlD: { value: new Float32Array(4) },
      },
    });
    programRef.current = program;
    const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });

    const ctrlArrays = [program.uniforms.uCtrlA, program.uniforms.uCtrlB, program.uniforms.uCtrlC, program.uniforms.uCtrlD].map(
      (u) => u.value as Float32Array,
    );
    const setCtrl = (time: number) => {
      const u = program.uniforms;
      const ma = u.uMorphAmount.value as number;
      const sp = u.uSpeed.value as number;
      const msp = u.uMorphSpeed.value as number;
      for (let g = 0; g < 4; g++) {
        for (let j = 0; j < 4; j++) {
          const i = CTRL_INDICES[g][j];
          ctrlArrays[g][j] = ma * Math.sin(time * sp * Math.sin(i * msp) + i);
        }
      }
    };

    const reduzir = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    // Um quadro parado bonito (t=0 dá um relevo quase simétrico).
    const TEMPO_PARADO = 40;

    const draw = () => renderer.render({ scene: mesh });

    const setSize = () => {
      const rect = container.getBoundingClientRect();
      renderer.setSize(Math.max(1, Math.floor(rect.width)), Math.max(1, Math.floor(rect.height)));
      const res = program.uniforms.iResolution.value as Float32Array;
      res[0] = gl.drawingBufferWidth;
      res[1] = gl.drawingBufferHeight;
      if (reduzir?.matches) setCtrl(TEMPO_PARADO);
      draw();
    };
    const ro = new ResizeObserver(setSize);
    ro.observe(container);
    setSize();

    const current = [0.5, 0.5];
    const target = [0.5, 0.5];
    let mouseActive = 0;
    let mouseActiveTarget = 0;
    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      const rect = canvas.getBoundingClientRect();
      target[0] = (e.clientX - rect.left) / rect.width;
      target[1] = 1 - (e.clientY - rect.top) / rect.height;
      mouseActiveTarget = 1;
    };
    const onPointerOut = (e: PointerEvent) => {
      if (!e.relatedTarget) mouseActiveTarget = 0; // saiu da janela
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("pointerout", onPointerOut);

    let raf = 0;
    let pageVisible = !document.hidden;
    let lost = false;
    const t0 = performance.now();

    const loop = (t: number) => {
      const time = (t - t0) * 0.001;
      program.uniforms.iTime.value = time;
      setCtrl(time);
      current[0] += 0.05 * (target[0] - current[0]);
      current[1] += 0.05 * (target[1] - current[1]);
      const m = program.uniforms.uMouse.value as Float32Array;
      m[0] = current[0];
      m[1] = current[1];
      mouseActive += 0.05 * (mouseActiveTarget - mouseActive);
      program.uniforms.uMouseActive.value = mouseActive;
      draw();
      raf = requestAnimationFrame(loop);
    };
    const start = () => {
      if (!lost && pageVisible && !reduzir?.matches && raf === 0) raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };

    const onVisibility = () => {
      pageVisible = !document.hidden;
      if (pageVisible) start();
      else stop();
    };
    const onReduce = () => {
      if (reduzir?.matches) {
        stop();
        setCtrl(TEMPO_PARADO);
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
    start();

    return () => {
      stop();
      ro.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerout", onPointerOut);
      document.removeEventListener("visibilitychange", onVisibility);
      reduzir?.removeEventListener("change", onReduce);
      canvas.removeEventListener("webglcontextlost", onLost);
      programRef.current = null;
      if (canvas.parentNode === container) container.removeChild(canvas);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
    // Os valores iniciais entram na criação; as mudanças seguintes vão pelo efeito abaixo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const program = programRef.current;
    if (!program) return;
    const u = program.uniforms;
    u.uSpeed.value = speed;
    u.uMorphAmount.value = morphAmount;
    u.uMorphSpeed.value = morphSpeed;
    u.uBands.value = bands;
    u.uThickness.value = thickness;
    u.uScale.value = scale;
    u.uGlow.value = glow;
    u.uColorMode.value = colorModeToFloat(colorMode);
    u.uContrast.value = contrast;
    u.uBrightness.value = brightness;
    u.uOpacity.value = opacity;
    u.uGrain.value = grain ? 1 : 0;
    u.uGrainIntensity.value = grainIntensity;
    u.uLow.value = new Float32Array(hexToRgb(lowColor));
    u.uMid.value = new Float32Array(hexToRgb(midColor));
    u.uHigh.value = new Float32Array(hexToRgb(highColor));
    u.uMouseEnabled.value = mouseInteraction ? 1 : 0;
    u.uMouseRadius.value = mouseRadius;
    u.uMouseStrength.value = mouseStrength;
  }, [lowColor, midColor, highColor, speed, morphAmount, morphSpeed, bands, thickness, scale, glow, colorMode,
      contrast, brightness, opacity, grain, grainIntensity, mouseInteraction, mouseRadius, mouseStrength]);

  return <div ref={containerRef} className={`relative h-full w-full overflow-hidden ${className}`.trim()} aria-hidden />;
}

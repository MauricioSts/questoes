// Malha elástica: uma placa em grade que afunda e estica sob o ponteiro e volta como
// membrana. Adaptado do "Elastic Mesh" do React Bits (reactbits.dev/animations/elastic-mesh;
// Copyright (c) 2026 David Haz, licença MIT + Commons Clause: uso dentro do app, sem
// redistribuir o componente) para servir de FUNDO de um cartão (components/PainelMalha.tsx):
// - `escutarPai`: o ponteiro é lido no elemento pai, porque o conteúdo do cartão fica por
//   cima do canvas e engoliria os eventos;
// - `fit` configurável: 1 com `tilt` 0 faz a placa ocupar o cartão inteiro em repouso;
// - o laço dorme quando a malha assenta e ninguém está apontando (a versão original
//   desenhava 60 quadros por segundo para sempre, por cartão), e também fora da tela e
//   com a aba escondida;
// - WebGL por software (gpu.ts) e prefers-reduced-motion desenham um quadro parado;
// - sem suporte a imagem (o app só usa o degradê).
import { useEffect, useRef, type CSSProperties } from "react";
import { Renderer, Geometry, Program, Mesh } from "ogl";
import { webglLento } from "./gpu";

const DIST = 4.6;

const VERT = `
precision highp float;
attribute vec2 aGrid;
attribute vec2 uv;
attribute vec3 aOffset;
attribute vec3 aNormal;

uniform float uAspect;
uniform float uTilt;
uniform float uDist;
uniform float uFit;

varying vec2 vUv;
varying vec3 vNormal;
varying float vDepth;

void main() {
  vUv = uv;
  vec2 base = vec2((aGrid.x * 2.0 - 1.0) * uAspect, 1.0 - aGrid.y * 2.0);
  vec3 p = vec3(base + aOffset.xy, aOffset.z);

  float ct = cos(uTilt);
  float st = sin(uTilt);
  float ry = p.y * ct - p.z * st;
  float rz = p.y * st + p.z * ct;
  p.y = ry;
  p.z = rz;

  float persp = uDist / (uDist - p.z);
  vec2 clip = vec2(p.x / uAspect, p.y) * persp * uFit;

  vNormal = aNormal;
  vDepth = aOffset.z;
  gl_Position = vec4(clip, 0.0, 1.0);
}
`;

const FRAG = `
precision highp float;

varying vec2 vUv;
varying vec3 vNormal;
varying float vDepth;

uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uHighlight;
uniform float uShading;
uniform vec2 uRes;
uniform float uRadius;
uniform float uGrid;
uniform float uGridDensity;
uniform float uGridOpacity;
uniform vec3 uGridColor;

void main() {
  vec3 base = mix(uColor1, uColor2, clamp(vUv.y, 0.0, 1.0));

  vec3 N = normalize(vNormal);
  vec3 L = normalize(vec3(-0.35, 0.55, 0.78));
  vec3 V = vec3(0.0, 0.0, 1.0);
  vec3 H = normalize(L + V);

  float diff = clamp(dot(N, L), 0.0, 1.0);
  float specRaw = pow(clamp(dot(N, H), 0.0, 1.0), 26.0);
  float specFlat = pow(clamp(H.z, 0.0, 1.0), 26.0);
  float spec = clamp((specRaw - specFlat) / (1.0 - specFlat), 0.0, 1.0);
  float ao = clamp(1.0 + vDepth * 0.45, 0.65, 1.25);

  vec3 lit = base * (1.0 - uShading * 0.28);
  lit += base * diff * uShading * 0.55;
  lit *= ao;
  lit += uHighlight * spec * uShading * 0.25;

  if (uGrid > 0.5) {
    vec2 g = vUv * uGridDensity;
    vec2 w = uGridDensity / max(uRes, vec2(1.0));
    vec2 d = abs(fract(g - 0.5) - 0.5) / max(w * 1.5, vec2(1e-4));
    float line = 1.0 - clamp(min(d.x, d.y), 0.0, 1.0);
    lit = mix(lit, uGridColor, line * uGridOpacity * (0.45 + diff * 0.55));
  }

  vec2 p = (vUv - 0.5) * uRes;
  vec2 halfRes = uRes * 0.5;
  float r = min(uRadius, min(halfRes.x, halfRes.y));
  vec2 q = abs(p) - (halfRes - r);
  float sd = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  float alpha = 1.0 - smoothstep(-1.25, 1.25, sd);
  if (alpha <= 0.002) discard;

  gl_FragColor = vec4(lit * alpha, alpha);
}
`;

function hexToRgb(hex: string): [number, number, number] {
  let h = (hex || "").replace("#", "").trim();
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h || "000000", 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export interface ElasticMeshProps {
  color1?: string;
  color2?: string;
  highlight?: string;
  showGrid?: boolean;
  gridDensity?: number;
  gridOpacity?: number;
  gridColor?: string;
  borderRadius?: number;
  stiffness?: number;
  damping?: number;
  grabRadius?: number;
  pull?: number;
  wobble?: number;
  tilt?: number;
  fit?: number;
  shading?: number;
  resolution?: number;
  interaction?: "hover" | "drag";
  /** Lê o ponteiro no elemento pai em vez do próprio canvas. */
  escutarPai?: boolean;
  className?: string;
  style?: CSSProperties;
}

export default function ElasticMesh({
  color1 = "#5227FF",
  color2 = "#B19EEF",
  highlight = "#ffffff",
  showGrid = true,
  gridDensity = 20,
  gridOpacity = 0.28,
  gridColor = "#ffffff",
  borderRadius = 25,
  stiffness = 0.05,
  damping = 0.2,
  grabRadius = 0.6,
  pull = 0.4,
  wobble = 5,
  tilt = 14,
  fit = 0.82,
  shading = 0.5,
  resolution = 25,
  interaction = "hover",
  escutarPai = false,
  className = "",
  style,
}: ElasticMeshProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const acordarRef = useRef<() => void>(() => {});

  const propsRef = useRef({
    color1, color2, highlight, showGrid, gridDensity, gridOpacity, gridColor, borderRadius,
    stiffness, damping, grabRadius, pull, wobble, tilt, fit, shading, interaction,
  });
  propsRef.current = {
    color1, color2, highlight, showGrid, gridDensity, gridOpacity, gridColor, borderRadius,
    stiffness, damping, grabRadius, pull, wobble, tilt, fit, shading, interaction,
  };

  // Cor ou grade mudou (troca de tema): um quadro basta, a malha pode estar dormindo.
  useEffect(() => {
    acordarRef.current();
  }, [color1, color2, highlight, showGrid, gridDensity, gridOpacity, gridColor, borderRadius, tilt, fit, shading]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const alvo: HTMLElement = (escutarPai && container.parentElement) || container;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let renderer: Renderer;
    try {
      renderer = new Renderer({ alpha: true, premultipliedAlpha: true, antialias: true, dpr: Math.min(window.devicePixelRatio || 1, 1.5) });
    } catch {
      return; // sem WebGL: o cartão continua com o fundo sólido
    }
    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);
    const canvas = gl.canvas as HTMLCanvasElement;
    canvas.style.display = "block";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    const lento = webglLento(gl as unknown as WebGL2RenderingContext);
    const estatico = lento || reduceMotion;

    const N = Math.max(6, Math.min(40, Math.round(resolution)));
    const nodeCount = N * N;

    const aGrid = new Float32Array(nodeCount * 2);
    const uv = new Float32Array(nodeCount * 2);
    const aOffset = new Float32Array(nodeCount * 3);
    const aNormal = new Float32Array(nodeCount * 3);
    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        const idx = j * N + i;
        const u = i / (N - 1);
        const v = j / (N - 1);
        aGrid[idx * 2] = u;
        aGrid[idx * 2 + 1] = v;
        uv[idx * 2] = u;
        uv[idx * 2 + 1] = v;
        aNormal[idx * 3 + 2] = 1;
      }
    }

    const index = new Uint16Array((N - 1) * (N - 1) * 6);
    let t = 0;
    for (let j = 0; j < N - 1; j++) {
      for (let i = 0; i < N - 1; i++) {
        const a = j * N + i;
        const b = a + 1;
        const c = a + N;
        const d = c + 1;
        index[t++] = a; index[t++] = c; index[t++] = b;
        index[t++] = b; index[t++] = c; index[t++] = d;
      }
    }

    const geometry = new Geometry(gl, {
      aGrid: { size: 2, data: aGrid },
      uv: { size: 2, data: uv },
      aOffset: { size: 3, data: aOffset },
      aNormal: { size: 3, data: aNormal },
      index: { data: index },
    });

    const p0 = propsRef.current;
    const program = new Program(gl, {
      vertex: VERT,
      fragment: FRAG,
      transparent: true,
      cullFace: false as unknown as GLenum,
      uniforms: {
        uColor1: { value: hexToRgb(p0.color1) },
        uColor2: { value: hexToRgb(p0.color2) },
        uHighlight: { value: hexToRgb(p0.highlight) },
        uGrid: { value: p0.showGrid ? 1 : 0 },
        uGridDensity: { value: p0.gridDensity },
        uGridOpacity: { value: p0.gridOpacity },
        uGridColor: { value: hexToRgb(p0.gridColor) },
        uShading: { value: p0.shading },
        uRes: { value: [1, 1] },
        uRadius: { value: p0.borderRadius },
        uAspect: { value: 1 },
        uTilt: { value: (p0.tilt * Math.PI) / 180 },
        uDist: { value: DIST },
        uFit: { value: p0.fit },
      },
    });
    const mesh = new Mesh(gl, { geometry, program });

    const baseX = new Float32Array(nodeCount);
    const baseY = new Float32Array(nodeCount);
    const pos = new Float32Array(nodeCount * 3);
    const vel = new Float32Array(nodeCount * 3);
    const accel = new Float32Array(nodeCount * 3);

    let aspect = 1;
    function refreshBase() {
      for (let idx = 0; idx < nodeCount; idx++) {
        baseX[idx] = (aGrid[idx * 2] * 2 - 1) * aspect;
        baseY[idx] = 1 - aGrid[idx * 2 + 1] * 2;
      }
    }

    function syncUniforms() {
      const p = propsRef.current;
      const u = program.uniforms;
      u.uShading.value = p.shading;
      u.uRadius.value = p.borderRadius;
      u.uTilt.value = (p.tilt * Math.PI) / 180;
      u.uFit.value = p.fit;
      u.uColor1.value = hexToRgb(p.color1);
      u.uColor2.value = hexToRgb(p.color2);
      u.uHighlight.value = hexToRgb(p.highlight);
      u.uGrid.value = p.showGrid ? 1 : 0;
      u.uGridDensity.value = p.gridDensity;
      u.uGridOpacity.value = p.gridOpacity;
      u.uGridColor.value = hexToRgb(p.gridColor);
    }
    const desenhar = () => {
      syncUniforms();
      renderer.render({ scene: mesh });
    };

    function resize() {
      const w = container!.offsetWidth || 1;
      const h = container!.offsetHeight || 1;
      renderer.setSize(w, h);
      aspect = w / h;
      program.uniforms.uAspect.value = aspect;
      program.uniforms.uRes.value = [w, h];
      refreshBase();
      desenhar();
    }
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    const pointer = { x: 0, y: 0, tx: 0, ty: 0, active: false, targetActive: false };

    function toPlane(clientX: number, clientY: number) {
      const rect = container!.getBoundingClientRect();
      const mx = (clientX - rect.left) / rect.width;
      const my = (clientY - rect.top) / rect.height;
      const clipX = mx * 2 - 1;
      const clipY = 1 - my * 2;
      const FIT = propsRef.current.fit;
      const tr = ((propsRef.current.tilt || 0) * Math.PI) / 180;
      const ct = Math.cos(tr);
      const st = Math.sin(tr);
      const a = clipY / (ct * FIT * DIST);
      const py = (a * DIST) / (1 + a * st);
      const persp = DIST / (DIST - py * st);
      pointer.tx = (clipX * aspect) / (persp * FIT);
      pointer.ty = py;
    }

    const STEP = 1 / 120;
    const MAX_SUB = 5;
    let accTime = 0;
    let last = 0;
    let maxOffset = 0;
    let maxVel = 0;

    function substep() {
      const p = propsRef.current;
      const s = p.stiffness;
      const retain = 1 - p.damping;
      const coupling = 0.06 + p.wobble * 0.032;
      const active = pointer.active;
      const r = Math.max(0.08, p.grabRadius) * 1.4;
      const invR = 1 / r;
      const force = p.pull * 0.009;

      for (let j = 0; j < N; j++) {
        for (let i = 0; i < N; i++) {
          const idx = j * N + i;
          const o3 = idx * 3;
          const ox = pos[o3];
          const oy = pos[o3 + 1];
          const oz = pos[o3 + 2];
          let ax = -s * ox;
          let ay = -s * oy;
          let az = -s * oz;

          let sumx = 0, sumy = 0, sumz = 0, cnt = 0;
          if (i > 0) { const n = (idx - 1) * 3; sumx += pos[n]; sumy += pos[n + 1]; sumz += pos[n + 2]; cnt++; }
          if (i < N - 1) { const n = (idx + 1) * 3; sumx += pos[n]; sumy += pos[n + 1]; sumz += pos[n + 2]; cnt++; }
          if (j > 0) { const n = (idx - N) * 3; sumx += pos[n]; sumy += pos[n + 1]; sumz += pos[n + 2]; cnt++; }
          if (j < N - 1) { const n = (idx + N) * 3; sumx += pos[n]; sumy += pos[n + 1]; sumz += pos[n + 2]; cnt++; }
          ax += coupling * (sumx - cnt * ox);
          ay += coupling * (sumy - cnt * oy);
          az += coupling * (sumz - cnt * oz);

          if (active) {
            const dx = pointer.x - (baseX[idx] + ox);
            const dy = pointer.y - (baseY[idx] + oy);
            const d = Math.sqrt(dx * dx + dy * dy);
            const tnorm = d * invR;
            if (tnorm < 1) {
              const zBump = 1 - tnorm * tnorm;
              az += force * zBump * zBump * 6.0;
              if (d > 1e-4) {
                const pinch = tnorm * (1 - tnorm) * (1 - tnorm) * 6.75;
                const dir = (force * pinch * 1.6) / d;
                ax += dx * dir;
                ay += dy * dir;
              }
            }
          }
          accel[o3] = ax;
          accel[o3 + 1] = ay;
          accel[o3 + 2] = az;
        }
      }

      for (let k = 0; k < nodeCount; k++) {
        const o3 = k * 3;
        const nvx = (vel[o3] + accel[o3]) * retain;
        const nvy = (vel[o3 + 1] + accel[o3 + 1]) * retain;
        const nvz = (vel[o3 + 2] + accel[o3 + 2]) * retain;
        vel[o3] = nvx;
        vel[o3 + 1] = nvy;
        vel[o3 + 2] = nvz;
        pos[o3] = Math.max(-1.2, Math.min(1.2, pos[o3] + nvx));
        pos[o3 + 1] = Math.max(-1.2, Math.min(1.2, pos[o3 + 1] + nvy));
        pos[o3 + 2] = Math.max(-1.2, Math.min(1.2, pos[o3 + 2] + nvz));
      }
    }

    function commit() {
      maxOffset = 0;
      maxVel = 0;
      for (let j = 0; j < N; j++) {
        for (let i = 0; i < N; i++) {
          const idx = j * N + i;
          const o3 = idx * 3;
          const iL = i > 0 ? idx - 1 : idx;
          const iR = i < N - 1 ? idx + 1 : idx;
          const iD = j > 0 ? idx - N : idx;
          const iU = j < N - 1 ? idx + N : idx;

          const txx = baseX[iR] + pos[iR * 3] - (baseX[iL] + pos[iL * 3]);
          const txy = baseY[iR] + pos[iR * 3 + 1] - (baseY[iL] + pos[iL * 3 + 1]);
          const txz = pos[iR * 3 + 2] - pos[iL * 3 + 2];
          const tyx = baseX[iU] + pos[iU * 3] - (baseX[iD] + pos[iD * 3]);
          const tyy = baseY[iU] + pos[iU * 3 + 1] - (baseY[iD] + pos[iD * 3 + 1]);
          const tyz = pos[iU * 3 + 2] - pos[iD * 3 + 2];

          let nx = txy * tyz - txz * tyy;
          let ny = txz * tyx - txx * tyz;
          let nz = txx * tyy - txy * tyx;
          if (nz < 0) { nx = -nx; ny = -ny; nz = -nz; }
          const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
          aNormal[o3] = nx / len;
          aNormal[o3 + 1] = ny / len;
          aNormal[o3 + 2] = nz / len;

          aOffset[o3] = pos[o3];
          aOffset[o3 + 1] = pos[o3 + 1];
          aOffset[o3 + 2] = pos[o3 + 2];

          const om = Math.abs(pos[o3]) + Math.abs(pos[o3 + 1]) + Math.abs(pos[o3 + 2]);
          if (om > maxOffset) maxOffset = om;
          const vm = Math.abs(vel[o3]) + Math.abs(vel[o3 + 1]) + Math.abs(vel[o3 + 2]);
          if (vm > maxVel) maxVel = vm;
        }
      }
      geometry.attributes.aOffset.needsUpdate = true;
      geometry.attributes.aNormal.needsUpdate = true;
    }

    let raf = 0;
    let visivel = true;
    let lost = false;

    function frame(now: number) {
      raf = 0;
      let dt = last ? (now - last) / 1000 : STEP;
      last = now;
      if (dt > 0.25) dt = 0.25;

      const kLerp = 1 - Math.exp(-Math.max(dt, 1e-4) / 0.06);
      pointer.x += (pointer.tx - pointer.x) * kLerp;
      pointer.y += (pointer.ty - pointer.y) * kLerp;
      pointer.active = pointer.targetActive;

      accTime += dt;
      let sub = 0;
      while (accTime >= STEP && sub < MAX_SUB) {
        substep();
        accTime -= STEP;
        sub++;
      }
      if (accTime > STEP) accTime = 0;

      commit();
      desenhar();

      // Assentou e ninguém está apontando: dorme até o próximo evento.
      if (!pointer.active && maxOffset < 1e-4 && maxVel < 1e-5) return;
      acordar();
    }

    function acordar() {
      if (raf || lost || estatico || !visivel || document.hidden) return;
      if (!last || performance.now() - last > 100) last = 0; // volta sem salto de tempo
      raf = requestAnimationFrame(frame);
    }
    acordarRef.current = () => {
      if (lost) return;
      if (raf) return; // o laço já desenha com as props novas
      desenhar();
    };

    function onMove(e: PointerEvent) {
      toPlane(e.clientX, e.clientY);
      if (propsRef.current.interaction === "hover") pointer.targetActive = true;
      acordar();
    }
    function onLeave() {
      pointer.targetActive = false;
      acordar();
    }
    // No toque não existe "passar por cima": o dedo apertando conta como hover até soltar.
    function onDown(e: PointerEvent) {
      if (propsRef.current.interaction === "drag" || e.pointerType === "touch") {
        toPlane(e.clientX, e.clientY);
        pointer.x = pointer.tx;
        pointer.y = pointer.ty;
        pointer.targetActive = true;
        acordar();
      }
    }
    function onUp(e: PointerEvent) {
      if (propsRef.current.interaction === "drag" || e.pointerType === "touch") pointer.targetActive = false;
      acordar();
    }

    if (!estatico) {
      alvo.addEventListener("pointermove", onMove, { passive: true });
      alvo.addEventListener("pointerdown", onDown, { passive: true });
      alvo.addEventListener("pointerleave", onLeave);
      alvo.addEventListener("pointercancel", onLeave);
      window.addEventListener("pointerup", onUp);
    }

    const io = new IntersectionObserver(([e]) => {
      visivel = e.isIntersecting;
      if (visivel) acordar();
      else if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    });
    io.observe(container);
    const onVisibility = () => {
      if (!document.hidden) acordar();
    };
    document.addEventListener("visibilitychange", onVisibility);
    const onLost = (e: Event) => {
      e.preventDefault();
      lost = true;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      canvas.style.display = "none";
    };
    canvas.addEventListener("webglcontextlost", onLost);

    container.appendChild(canvas);
    resize();

    return () => {
      if (raf) cancelAnimationFrame(raf);
      acordarRef.current = () => {};
      ro.disconnect();
      io.disconnect();
      alvo.removeEventListener("pointermove", onMove);
      alvo.removeEventListener("pointerdown", onDown);
      alvo.removeEventListener("pointerleave", onLeave);
      alvo.removeEventListener("pointercancel", onLeave);
      window.removeEventListener("pointerup", onUp);
      document.removeEventListener("visibilitychange", onVisibility);
      canvas.removeEventListener("webglcontextlost", onLost);
      if (canvas.parentElement === container) container.removeChild(canvas);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolution, escutarPai]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ position: "relative", width: "100%", height: "100%", minHeight: 0, ...style }}
      aria-hidden
    />
  );
}

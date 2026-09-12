// Fundo iridescente. Adaptado do "Iridescence" do React Bits
// (reactbits.dev/backgrounds/iridescence; Copyright (c) 2026 David Haz, licença MIT +
// Commons Clause: uso dentro do app, sem redistribuir o componente) seguindo as mesmas
// regras dos outros fundos daqui (ver Topography.tsx):
// - a camada não recebe clique e o componente nunca escuta o mouse (o app pediu fundo
//   parado sob o cursor), então não há uniforme de ponteiro nenhum;
// - resolução limitada a 1.5x: é um degradê suave, 2x só custava bateria;
// - prefers-reduced-motion e WebGL por software (gpu.ts) desenham UM quadro e param;
// - `paused` congela onde está (sessão de questões) e, ao soltar, continua do mesmo
//   ponto — o tempo do shader só anda enquanto o laço roda;
// - sem WebGL 2 a camada some e o fundo sólido do tema continua lá.
import { useEffect, useRef } from "react";
import { Renderer, Program, Mesh, Triangle } from "ogl";
import { webglLento } from "./gpu";

export interface IridescenceProps {
  /** Cor base multiplicada pelo padrão, em 0..1 (o mesmo formato do React Bits). */
  color?: [number, number, number];
  speed?: number;
  /** Congela no quadro atual enquanto verdadeiro. */
  paused?: boolean;
  className?: string;
}

const vertex = `#version 300 es
in vec2 position;
out vec2 vUv;
void main() {
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

// O laço de 8 voltas é o do React Bits: cada volta dobra o campo sobre si mesmo e é o
// que produz as franjas de interferência (a "iridescência").
const fragment = `#version 300 es
precision highp float;

uniform float uTime;
uniform vec3 uColor;
uniform vec3 uResolution;

in vec2 vUv;
out vec4 fragColor;

void main() {
  float mr = min(uResolution.x, uResolution.y);
  vec2 uv = (vUv * 2.0 - 1.0) * uResolution.xy / mr;

  float d = -uTime * 0.5;
  float a = 0.0;
  for (float i = 0.0; i < 8.0; ++i) {
    a += cos(i - d - a * uv.x);
    d += sin(uv.y * i + a);
  }
  d += uTime * 0.5;

  vec3 col = vec3(cos(uv * vec2(d, a)) * 0.6 + 0.4, cos(a + d) * 0.5 + 0.5);
  col = cos(col * cos(vec3(d, a, 2.5)) * 0.5 + 0.5) * uColor;
  fragColor = vec4(col, 1.0);
}
`;

export default function Iridescence({
  color = [1, 1, 1],
  speed = 1.0,
  paused = false,
  className = "",
}: IridescenceProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const programRef = useRef<Program | null>(null);
  const pausadoRef = useRef(paused);
  // A velocidade multiplica o passo do tempo (e não o tempo acumulado): mudá-la no meio
  // não faz o padrão saltar.
  const speedRef = useRef(speed);
  speedRef.current = speed;
  const controleRef = useRef<{ start: () => void; stop: () => void } | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let renderer: Renderer;
    try {
      renderer = new Renderer({
        webgl: 2,
        alpha: false,
        antialias: false,
        dpr: Math.min(window.devicePixelRatio || 1, 1.5),
      });
      if (!renderer.isWebgl2) return; // o shader é GLSL 300 es
    } catch {
      return; // sem WebGL: fica só o fundo sólido do tema
    }
    const gl = renderer.gl;
    const canvas = gl.canvas as HTMLCanvasElement;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
    container.appendChild(canvas);

    const program = new Program(gl, {
      vertex,
      fragment,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new Float32Array(color) },
        uResolution: { value: new Float32Array([1, 1, 1]) },
      },
    });
    programRef.current = program;
    const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });

    const reduzir = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const lento = webglLento(gl as unknown as WebGL2RenderingContext);
    const parado = () => lento || !!reduzir?.matches;
    // Quadro de repouso: t=12 cai num ponto em que as franjas estão abertas e o campo
    // não fica chapado, que é o que se vê quando a animação está desligada.
    const TEMPO_PARADO = 12;

    let tempo = 0;
    let ultimo = 0;

    const draw = () => renderer.render({ scene: mesh });

    const setSize = () => {
      const rect = container.getBoundingClientRect();
      renderer.setSize(Math.max(1, Math.floor(rect.width)), Math.max(1, Math.floor(rect.height)));
      const res = program.uniforms.uResolution.value as Float32Array;
      res[0] = gl.drawingBufferWidth;
      res[1] = gl.drawingBufferHeight;
      res[2] = gl.drawingBufferWidth / Math.max(1, gl.drawingBufferHeight);
      program.uniforms.uTime.value = parado() ? TEMPO_PARADO : tempo;
      draw();
    };
    const ro = new ResizeObserver(setSize);
    ro.observe(container);
    setSize();

    let raf = 0;
    let pageVisible = !document.hidden;
    let lost = false;

    const loop = (t: number) => {
      // Passo limitado a 100 ms: um quadro atrasado não vira um pulo no padrão.
      if (ultimo) tempo += Math.min(t - ultimo, 100) * 0.001 * speedRef.current;
      ultimo = t;
      program.uniforms.uTime.value = tempo;
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

    const onVisibility = () => {
      pageVisible = !document.hidden;
      if (pageVisible) start();
      else stop();
    };
    const onReduce = () => {
      if (parado()) {
        stop();
        program.uniforms.uTime.value = TEMPO_PARADO;
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
    controleRef.current = { start, stop };
    start();

    return () => {
      stop();
      controleRef.current = null;
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      reduzir?.removeEventListener("change", onReduce);
      canvas.removeEventListener("webglcontextlost", onLost);
      programRef.current = null;
      if (canvas.parentNode === container) container.removeChild(canvas);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
    // Os valores iniciais entram na criação; as mudanças seguintes vão pelos efeitos abaixo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    pausadoRef.current = paused;
    if (paused) controleRef.current?.stop();
    else controleRef.current?.start();
  }, [paused]);

  useEffect(() => {
    const program = programRef.current;
    if (!program) return;
    (program.uniforms.uColor.value as Float32Array).set(color);
  }, [color]);

  return <div ref={containerRef} className={`relative h-full w-full overflow-hidden ${className}`.trim()} aria-hidden />;
}

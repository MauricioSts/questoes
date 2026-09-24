// Tela cheia desenhada por um fragment shader (GLSL 300 es). Base dos fundos do Aranha e
// do Venom, com as mesmas regras dos fundos do React Bits (ver reactbits/Iridescence.tsx):
// - a camada não recebe clique e não escuta o mouse;
// - prefers-reduced-motion e WebGL por software (gpu.ts) desenham UM quadro e param;
// - `paused` congela onde está (sessão de questões) e, ao soltar, continua do mesmo ponto;
// - aba escondida para o laço;
// - sem WebGL 2 a camada some e o fundo sólido do tema continua lá.
//
// O shader recebe sempre uTime (s), uResolution (px do buffer, x/y) e uDpr (a escala do
// buffer em relação ao CSS, para medir traço e retícula em px de tela).
import { useEffect, useRef } from "react";
import { Renderer, Program, Mesh, Triangle } from "ogl";
import { webglLento } from "../reactbits/gpu";

const vertex = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

export interface ShaderTelaProps {
  fragment: string;
  /** Resolução do buffer em relação ao CSS. Padrão: devicePixelRatio limitado a 1.5. */
  escala?: number;
  /** Tempo (s) do quadro desenhado quando a animação está desligada. */
  tempoParado?: number;
  paused?: boolean;
  /** Canvas com transparência (o shader devolve alfa pré-multiplicado). */
  transparente?: boolean;
  className?: string;
}

export default function ShaderTela({
  fragment,
  escala,
  tempoParado = 8,
  paused = false,
  transparente = false,
  className = "",
}: ShaderTelaProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pausadoRef = useRef(paused);
  const controleRef = useRef<{ start: () => void; stop: () => void } | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const dpr = escala ?? Math.min(window.devicePixelRatio || 1, 1.5);
    let renderer: Renderer;
    try {
      renderer = new Renderer({ webgl: 2, alpha: transparente, premultipliedAlpha: true, antialias: false, dpr });
      if (!renderer.isWebgl2) return;
    } catch {
      return;
    }
    const gl = renderer.gl;
    const canvas = gl.canvas as HTMLCanvasElement;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
    container.appendChild(canvas);

    let program: Program;
    try {
      program = new Program(gl, {
        vertex,
        fragment,
        transparent: transparente,
        uniforms: {
          uTime: { value: 0 },
          uResolution: { value: new Float32Array([1, 1]) },
          uDpr: { value: dpr },
        },
      });
    } catch {
      container.removeChild(canvas);
      return;
    }
    const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });

    const reduzir = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const lento = webglLento(gl as unknown as WebGL2RenderingContext);
    const parado = () => lento || !!reduzir?.matches;

    let tempo = 0;
    let ultimo = 0;
    const draw = () => renderer.render({ scene: mesh });

    const setSize = () => {
      const rect = container.getBoundingClientRect();
      renderer.setSize(Math.max(1, Math.floor(rect.width)), Math.max(1, Math.floor(rect.height)));
      const res = program.uniforms.uResolution.value as Float32Array;
      res[0] = gl.drawingBufferWidth;
      res[1] = gl.drawingBufferHeight;
      program.uniforms.uTime.value = parado() ? tempoParado : tempo;
      draw();
    };
    const ro = new ResizeObserver(setSize);
    ro.observe(container);
    // Começa do quadro de repouso: o primeiro quadro já sai composto, sem o "vazio" do t=0.
    tempo = tempoParado;
    setSize();

    let raf = 0;
    let visivel = !document.hidden;
    let perdido = false;

    const loop = (t: number) => {
      if (ultimo) tempo += Math.min(t - ultimo, 100) * 0.001;
      ultimo = t;
      program.uniforms.uTime.value = tempo;
      draw();
      raf = requestAnimationFrame(loop);
    };
    const start = () => {
      if (perdido || !visivel || parado() || pausadoRef.current || raf !== 0) return;
      ultimo = 0;
      raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };
    const onVisibility = () => {
      visivel = !document.hidden;
      if (visivel) start();
      else stop();
    };
    const onReduce = () => {
      if (parado()) {
        stop();
        program.uniforms.uTime.value = tempoParado;
        draw();
      } else start();
    };
    const onLost = (e: Event) => {
      e.preventDefault();
      perdido = true;
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
      if (canvas.parentNode === container) container.removeChild(canvas);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
    // Shader e escala valem para a vida do componente.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    pausadoRef.current = paused;
    if (paused) controleRef.current?.stop();
    else controleRef.current?.start();
  }, [paused]);

  return <div ref={containerRef} className={`relative h-full w-full overflow-hidden ${className}`.trim()} aria-hidden />;
}

// Entrada do tema Venom: o simbionte toma a tela.
//
//   0 – 1050 ms   a gosma brota do botão clicado e das bordas da tela, com tentáculos
//                 correndo à frente, até fechar tudo (o tema troca por baixo nesse instante);
//   1050 – 2450   no escuro, os olhos brancos abrem, o sorriso de dentes se rasga e
//                 "NÓS SOMOS VENOM" bate na tela com tremor;
//   2450 – 3300   a massa se rasga do centro para as bordas e revela o app já no tema novo.
//
// A gosma é um shader (campo de ruído com normal por derivada e brilho especular azulado,
// o mesmo acabamento do fundo); o palco (olhos, dentes, texto) é SVG + CSS por cima.
// Clique ou Esc pulam a animação. Sem WebGL 2, uma cortina preta circular faz o papel
// da gosma.
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Renderer, Program, Mesh, Triangle } from "ogl";
import { RUIDO } from "../fundos/glsl";
import { OLHO_VENOM_DIR, OLHO_VENOM_ESQ } from "../SimbolosHeroi";
import type { Origem } from "../../store/theme";

const COBRE = 1050;
const REVELA = 2450;
const FIM = 3300;

// A fonte do letreiro só é usada aqui: pede o download assim que o pedaço carrega (no
// hover do botão), para o "VENOM" não sair na fonte de reserva.
try {
  void document.fonts?.load("400 120px 'Rubik Wet Paint'", "VENOM");
  void document.fonts?.load("400 40px 'Anton'", "NÓS SOMOS");
} catch {
  /* sem Font Loading API */
}

const vertex = `#version 300 es
in vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }
`;

const fragment = `#version 300 es
precision highp float;
uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uOrigem;
uniform float uAlcance;
uniform float uCobre;
uniform float uRevela;
out vec4 fragColor;
${RUIDO}

void main() {
  vec2 p = gl_FragCoord.xy;
  float esc = uResolution.y;

  // 1) avanço a partir do clique: frente irregular + espinhos angulares à frente
  vec2 v = (p - uOrigem) / esc;
  float d = length(v);
  float ang = atan(v.y, v.x);
  float espinho = pow(fbm3(vec2(ang * 3.2 + 11.0, uTime * 0.7)), 2.2) * 1.1;
  float frente = uCobre * (uAlcance + 0.55);
  float campoA = frente + espinho * 0.55 * (1.0 - uCobre * 0.5)
               + (fbm3(v * 2.6 + uTime * 0.9) - 0.5) * 0.24 - d;

  // 2) a massa também escorre das bordas para dentro
  vec2 q = p / esc;
  float borda = min(min(p.x, uResolution.x - p.x), min(p.y, uResolution.y - p.y)) / esc;
  float campoB = uCobre * 0.62 + (fbm3(q * 3.2 + vec2(0.0, uTime * 1.2)) - 0.55) * 0.3 - borda;

  float campo = max(campoA, campoB);

  // 3) o rasgo final, do centro para fora, com bordas de fiapo
  vec2 c = (p - 0.5 * uResolution) / esc;
  float dc = length(c);
  // (com uRevela = 0 fica sempre negativo: nenhum furo antes da hora)
  float rasgo = uRevela * 1.75 - 0.26 + (fbm3(c * 3.0 - uTime) - 0.5) * 0.36
              + pow(fbm3(vec2(atan(c.y, c.x) * 3.0, uTime * 0.5)), 2.0) * 0.5 * uRevela - dc;
  campo = min(campo, -rasgo);

  float aa = 1.6 / esc;
  float massa = smoothstep(-aa, aa, campo);
  if (massa <= 0.0) { fragColor = vec4(0.0); return; }

  // relevo: perfil de gota grossa a partir da borda (sqrt), liso por dentro — a normal
  // por derivada de tela só fica limpa num campo suave
  float h = sqrt(clamp(campo / 0.14, 0.0, 1.0)) * 0.14;
  vec3 n = normalize(vec3(-dFdx(h) * esc, -dFdy(h) * esc, 1.0));
  vec3 olho = vec3(0.0, 0.0, 1.0);
  vec3 refl = reflect(-olho, n);
  float ceu = smoothstep(0.25, 0.85, refl.y) * smoothstep(-0.2, 0.5, refl.x + 0.3);
  vec3 luz = normalize(vec3(-0.5, 0.7, 0.55));
  float esp = pow(max(dot(reflect(-luz, n), olho), 0.0), 60.0);
  float fresnel = pow(1.0 - n.z, 3.0);

  vec3 col = vec3(0.012, 0.013, 0.02);
  col += vec3(0.42, 0.52, 0.85) * ceu * 0.45;
  col += vec3(0.85, 0.9, 1.0) * esp;
  col += vec3(0.25, 0.34, 0.75) * fresnel * 0.5;
  fragColor = vec4(col * massa, massa);
}
`;

// Dentes: zigue-zague de pontas desencontradas (as do meio maiores), em 0..200 × 0..40.
function dentes(cima: boolean) {
  const n = 13;
  let d = cima ? "M0 0 " : "M0 40 ";
  for (let i = 0; i < n; i++) {
    const x0 = (200 / n) * i;
    const x1 = x0 + 200 / n / 2;
    const meio = 1 - Math.abs(i - (n - 1) / 2) / ((n - 1) / 2);
    const alt = 14 + meio * 22 + (i % 2 ? -3 : 3);
    d += cima ? `L${x1.toFixed(1)} ${alt.toFixed(1)} L${(x0 + 200 / n).toFixed(1)} 0 ` : `L${x1.toFixed(1)} ${(40 - alt).toFixed(1)} L${(x0 + 200 / n).toFixed(1)} 40 `;
  }
  return d + "Z";
}
const DENTES_CIMA = dentes(true);
const DENTES_BAIXO = dentes(false);

interface Props {
  origem: Origem;
  aoCobrir: () => void;
  aoTerminar: () => void;
}

export default function TransicaoVenom({ origem, aoCobrir, aoTerminar }: Props) {
  const canvasBox = useRef<HTMLDivElement | null>(null);
  const cortina = useRef<HTMLDivElement | null>(null);
  const [semGl, setSemGl] = useState(false);
  // Callbacks por ref: o laço é criado uma vez e sempre chama a versão atual.
  const cb = useRef({ aoCobrir, aoTerminar });
  cb.current = { aoCobrir, aoTerminar };
  const pular = useRef<() => void>(() => {});

  useEffect(() => {
    const box = canvasBox.current!;
    let cobriu = false;
    let terminou = false;
    const cobrir = () => {
      if (cobriu) return;
      cobriu = true;
      cb.current.aoCobrir();
    };
    const terminar = () => {
      if (terminou) return;
      terminou = true;
      cobrir();
      cb.current.aoTerminar();
    };
    pular.current = terminar;

    let renderer: Renderer | null = null;
    let program: Program | null = null;
    let mesh: Mesh | null = null;
    try {
      renderer = new Renderer({ webgl: 2, alpha: true, premultipliedAlpha: true, antialias: false, dpr: Math.min(window.devicePixelRatio || 1, 1.25) });
      if (!renderer.isWebgl2) throw new Error("sem webgl2");
      const gl = renderer.gl;
      gl.clearColor(0, 0, 0, 0);
      const canvas = gl.canvas as HTMLCanvasElement;
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      canvas.style.display = "block";
      box.appendChild(canvas);
      program = new Program(gl, {
        vertex,
        fragment,
        transparent: true,
        uniforms: {
          uTime: { value: 0 },
          uResolution: { value: new Float32Array([1, 1]) },
          uOrigem: { value: new Float32Array([0, 0]) },
          uAlcance: { value: 1 },
          uCobre: { value: 0 },
          uRevela: { value: 0 },
        },
      });
      mesh = new Mesh(gl, { geometry: new Triangle(gl), program });
    } catch {
      renderer = null;
      setSemGl(true);
    }

    const medir = () => {
      if (!renderer || !program) return;
      renderer.setSize(window.innerWidth, window.innerHeight);
      const gl = renderer.gl;
      const w = gl.drawingBufferWidth;
      const h = gl.drawingBufferHeight;
      const s = w / window.innerWidth;
      (program.uniforms.uResolution.value as Float32Array).set([w, h]);
      const ox = origem.x * s;
      const oy = h - origem.y * s;
      (program.uniforms.uOrigem.value as Float32Array).set([ox, oy]);
      const longe = Math.max(Math.hypot(ox, oy), Math.hypot(w - ox, oy), Math.hypot(ox, h - oy), Math.hypot(w - ox, h - oy));
      program.uniforms.uAlcance.value = longe / h;
    };
    medir();
    window.addEventListener("resize", medir);

    const raioMax = Math.hypot(Math.max(origem.x, window.innerWidth - origem.x), Math.max(origem.y, window.innerHeight - origem.y));
    const inicio = performance.now();
    let raf = 0;
    const quadro = (agora: number) => {
      const e = agora - inicio;
      const x = Math.min(e / COBRE, 1);
      // entra acelerando (a gosma "pega") e fecha rápido no fim
      const cobre = x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
      const y = Math.min(Math.max((e - REVELA) / (FIM - REVELA), 0), 1);
      const revela = y * y * (3 - 2 * y);
      if (renderer && program && mesh) {
        program.uniforms.uTime.value = e / 1000;
        program.uniforms.uCobre.value = cobre;
        program.uniforms.uRevela.value = revela;
        renderer.render({ scene: mesh });
      } else if (cortina.current) {
        cortina.current.style.clipPath = `circle(${(cobre * raioMax * 1.05).toFixed(1)}px at ${origem.x}px ${origem.y}px)`;
        cortina.current.style.opacity = String(1 - revela);
      }
      if (e >= COBRE) cobrir();
      if (e >= FIM) {
        terminar();
        return;
      }
      raf = requestAnimationFrame(quadro);
    };
    raf = requestAnimationFrame(quadro);

    const tecla = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") terminar();
    };
    window.addEventListener("keydown", tecla);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", medir);
      window.removeEventListener("keydown", tecla);
      if (renderer) {
        const canvas = renderer.gl.canvas as HTMLCanvasElement;
        if (canvas.parentNode === box) box.removeChild(canvas);
        renderer.gl.getExtension("WEBGL_lose_context")?.loseContext();
      }
    };
    // Uma animação por montagem; a origem é a do clique que a criou.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return createPortal(
    <div
      className="tv"
      role="status"
      aria-live="polite"
      aria-label="Entrando no tema Venom"
      onClick={() => pular.current()}
      style={{ ["--tv-cobre" as string]: `${COBRE}ms`, ["--tv-revela" as string]: `${REVELA}ms` }}
    >
      <div ref={canvasBox} className="tv__gosma" />
      {semGl && <div ref={cortina} className="tv__cortina" />}
      <div className="tv__palco" aria-hidden>
        <div className="tv__rosto">
          <svg className="tv__olhos" viewBox="1 4.8 22 11.4">
            <path d={OLHO_VENOM_ESQ} />
            <path d={OLHO_VENOM_DIR} />
          </svg>
          <div className="tv__boca">
            <div className="tv__garganta" />
            <svg className="tv__dentes tv__dentes--cima" viewBox="0 0 200 40" preserveAspectRatio="none">
              <path d={DENTES_CIMA} />
            </svg>
            <svg className="tv__dentes tv__dentes--baixo" viewBox="0 0 200 40" preserveAspectRatio="none">
              <path d={DENTES_BAIXO} />
            </svg>
          </div>
        </div>
        <p className="tv__letreiro">
          <span className="tv__nos">Nós somos</span>
          <span className="tv__nome">
            {"VENOM".split("").map((l, i) => (
              <span key={i} style={{ animationDelay: `calc(var(--tv-cobre) + ${620 + i * 70}ms)` }}>
                {l}
              </span>
            ))}
          </span>
        </p>
      </div>
      <div className="tv__lampejo" />
    </div>,
    document.body
  );
}

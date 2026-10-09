// Liga o motor de golpes a uma arena: o canvas por cima de tudo e os "atores" (os sprites
// marcados com data-ator="meu-0", "inimigo-1"...). O motor pede a âncora de um ator (centro
// e tamanho do sprite agora) e anima o sprite pela Web Animations API, somando ao que o CSS
// da arena já faz (composite "add"), então o golpe e a animação de dano não brigam.
import { useEffect, useRef } from "react";
import type { Atores, MotorGolpes } from "./motor";
import type { Ancora } from "./tipos";

type Centro = (lado: "meu" | "inimigo", slot: 0 | 1) => [number, number];

function atoresDe(raiz: HTMLElement, centro: Centro): Atores {
  const vivas = new Set<Animation>();
  const guarda = (a: Animation | undefined) => {
    if (!a) return;
    vivas.add(a);
    a.onfinish = a.oncancel = () => vivas.delete(a);
  };
  return {
    ancora(chave: string): Ancora | null {
      const base = chave.split(":")[0];
      const lado = base.startsWith("meu") ? "meu" : "inimigo";
      const b = raiz.getBoundingClientRect();
      const img = raiz.querySelector<HTMLImageElement>(`[data-ator="${base}"] img`);
      const r = img?.getBoundingClientRect();
      if (r && r.width > 2) return { x: r.left - b.left + r.width / 2, y: r.top - b.top + r.height / 2, w: r.width * 0.8, h: r.height * 0.8, lado, chave: base };
      // sem sprite desenhado (Move Lab sem imagem, sprite carregando): o centro do lado
      const [px, py] = centro(lado, base.endsWith("1") ? 1 : 0);
      const w = b.width * (lado === "meu" ? 0.16 : 0.11);
      return { x: (px / 100) * b.width, y: (py / 100) * b.height, w, h: w, lado, chave: base };
    },
    silhueta(chave: string) {
      const b = raiz.getBoundingClientRect();
      const img = raiz.querySelector<HTMLImageElement>(`[data-ator="${chave.split(":")[0]}"] img`);
      const r = img?.getBoundingClientRect();
      if (!img || !r || r.width < 2 || !img.complete) return null;
      return { img, x: r.left - b.left, y: r.top - b.top, w: r.width, h: r.height };
    },
    animar(chave, quadros, ms, easing = "ease-in-out") {
      const ator = raiz.querySelector<HTMLElement>(`[data-ator="${chave.split(":")[0]}"]`);
      if (!ator) return;
      const img = ator.querySelector("img") ?? ator;
      const temT = quadros.some((q) => q.transform !== undefined);
      const temV = quadros.some((q) => q.filter !== undefined || q.opacity !== undefined);
      const opc = { duration: ms, easing };
      if (temT)
        guarda(
          ator.animate(
            quadros.map((q) => ({ transform: (q.transform as string | undefined) ?? "translate(0,0)", ...(q.offset !== undefined ? { offset: q.offset } : {}) })),
            { ...opc, composite: "add" }
          )
        );
      if (temV)
        guarda(
          img.animate(
            quadros.map((q) => ({ filter: (q.filter as string | undefined) ?? "none", opacity: q.opacity ?? 1, ...(q.offset !== undefined ? { offset: q.offset } : {}) })),
            opc
          )
        );
    },
    tremerTela(px, ms) {
      const q: Keyframe[] = [];
      for (let i = 0; i <= 8; i++) q.push({ transform: `translate(${i === 8 ? 0 : (i % 2 ? -1 : 1) * px * (1 - i / 8)}px, ${i === 8 ? 0 : (i % 3 ? 1 : -1) * px * 0.4 * (1 - i / 8)}px)` });
      guarda(raiz.animate(q, { duration: ms, composite: "add" }));
    },
    cancelar() {
      for (const a of vivas) a.cancel();
      vivas.clear();
    },
  };
}

export function CamadaGolpes({ motor, centro }: { motor: MotorGolpes; centro: Centro }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const refFundo = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    const raiz = c?.parentElement;
    if (!c || !raiz) return;
    motor.atores = atoresDe(raiz, centro);
    const mq = typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : null;
    const lerRm = () => (motor.reducedMotion = !!mq?.matches);
    lerRm();
    mq?.addEventListener?.("change", lerRm);
    motor.ligarFundo(refFundo.current);
    motor.ligarCanvas(c);
    void motor.sprites?.iniciar();
    const ro = typeof ResizeObserver === "function" ? new ResizeObserver(() => motor.redimensionar()) : null;
    ro?.observe(c);
    return () => {
      ro?.disconnect();
      mq?.removeEventListener?.("change", lerRm);
      motor.atores.cancelar();
      motor.ligarCanvas(null);
      motor.ligarFundo(null);
    };
  }, [motor, centro]);
  // fundo dos golpes (Psychic, Surf...) atrás dos Pokémon; o resto por cima de tudo
  return (
    <>
      <canvas ref={refFundo} className="pk-golpes-fundo" aria-hidden />
      <canvas ref={ref} className="pk-golpes" aria-hidden />
    </>
  );
}

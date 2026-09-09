// Camada de movimento do app (motion.dev).
//
// Peso: o bundle inicial leva só o componente mínimo (`m`, de motion/react-m) e os hooks
// de scroll. Os recursos de animação (`domAnimation`) entram por import dinâmico, num
// pedaço próprio (lib/motionFeatures.ts) — layout, drag e SVG não são usados aqui e
// nunca são baixados. `strict` faz o build falhar se alguém usar `motion.div`, que
// traria a biblioteca inteira de volta para o bundle inicial.
//
// Acessibilidade: todo movimento nasce desligado quando o sistema pede menos animação
// (prefers-reduced-motion), como o resto do app já faz no CSS.
import { useRef, type ReactNode } from "react";
import { LazyMotion, useReducedMotion, useScroll, useTransform } from "motion/react";
import * as m from "motion/react-m";

const recursos = () => import("../lib/motionFeatures").then((mod) => mod.default);

export function ProvedorMovimento({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={recursos} strict>
      {children}
    </LazyMotion>
  );
}

// Paralaxe vertical: o conteúdo desliza mais devagar (ou mais rápido) que a página
// enquanto passa pela viewport. `distancia` em px é o deslocamento total, ponta a ponta.
// Valores pequenos (8–40) mantêm o efeito perceptível sem embaralhar a leitura.
export function Paralaxe({
  children,
  distancia = 28,
  className,
}: {
  children: ReactNode;
  distancia?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduzir = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [distancia, -distancia]);

  if (reduzir) return <div className={className}>{children}</div>;
  return (
    <m.div ref={ref} style={{ y }} className={className}>
      {children}
    </m.div>
  );
}

// Paralaxe de fundo decorativo (halos, brilho do cabeçalho): mesma ideia, mas sem
// interferir no clique e amarrada ao scroll da página inteira.
export function ParalaxeFundo({
  children,
  distancia = 120,
  className,
}: {
  children: ReactNode;
  distancia?: number;
  className?: string;
}) {
  const reduzir = useReducedMotion();
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 1400], [0, distancia]);

  if (reduzir) return <div className={className} aria-hidden>{children}</div>;
  return (
    <m.div style={{ y }} className={className} aria-hidden>
      {children}
    </m.div>
  );
}

// Entrada de seção: sobe e aparece quando entra na viewport, uma vez só.
// Substitui o `.fadeup` global nas telas longas, onde animar tudo no load
// fazia a página inteira tremer de uma vez.
export function Revelar({
  children,
  atraso = 0,
  className,
}: {
  children: ReactNode;
  atraso?: number;
  className?: string;
}) {
  const reduzir = useReducedMotion();
  if (reduzir) return <div className={className}>{children}</div>;
  return (
    <m.div
      className={className}
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.42, delay: atraso, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </m.div>
  );
}

// Item de lista/grade com resposta ao toque e ao passar o mouse. Usa transform
// (composto na GPU) para não provocar reflow em listas grandes.
export function Toque({
  children,
  className,
  escala = 1.015,
}: {
  children: ReactNode;
  className?: string;
  escala?: number;
}) {
  const reduzir = useReducedMotion();
  if (reduzir) return <div className={className}>{children}</div>;
  return (
    <m.div
      className={className}
      whileHover={{ scale: escala, y: -2 }}
      whileTap={{ scale: 0.985 }}
      transition={{ type: "spring", stiffness: 380, damping: 30 }}
    >
      {children}
    </m.div>
  );
}

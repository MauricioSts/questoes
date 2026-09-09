// Recursos de animação do motion.dev carregados em separado (import dinâmico).
// Mantê-los fora do bundle inicial é o que faz a biblioteca não pesar no primeiro
// carregamento: o app renderiza com o componente mínimo (`m`) e as animações ganham
// vida quando este pedaço chega. Ver components/Movimento.tsx.
export { domAnimation as default } from "motion/react";

// Cartão do Cyberpunk com a malha elástica (React Bits) de fundo: uma grade ciano que
// afunda sob o ponteiro, como uma placa holográfica sendo tocada. O conteúdo fica por
// cima e o ponteiro é lido no cartão inteiro (a malha escuta o elemento pai).
// Usado nos cartões que são "painel de leitura" da Home: modos de estudo e contagem da
// prova. A malha dorme quando assenta, então cartão parado não custa quadro.
import { lazy, Suspense, type ReactNode } from "react";

const ElasticMesh = lazy(() => import("./reactbits/ElasticMesh"));

export function PainelMalha({ children, className = "", conteudoClassName = "" }: { children: ReactNode; className?: string; conteudoClassName?: string }) {
  return (
    <div className={`card painel-malha relative overflow-hidden ${className}`}>
      <Suspense fallback={null}>
        <ElasticMesh
          escutarPai
          style={{ position: "absolute", inset: 0 }}
          color1="#0E0C18"
          color2="#1C0D27"
          highlight="#FF2A6D"
          gridColor="#00F0FF"
          gridOpacity={0.17}
          gridDensity={14}
          shading={0.9}
          tilt={0}
          fit={1}
          borderRadius={3}
          pull={0.55}
          grabRadius={0.5}
          stiffness={0.06}
          damping={0.2}
          wobble={4}
          resolution={22}
        />
      </Suspense>
      <span className="painel-malha__quinas" aria-hidden />
      <div className={`relative h-full ${conteudoClassName}`}>{children}</div>
    </div>
  );
}

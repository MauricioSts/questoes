// Fundo fixo atrás do conteúdo. Nunca captura clique.
// Fantasy: relevo animado (Topography, React Bits) + vinheta.
// Cyberpunk: Molten Metal (WebGL) nas cores do tema.
import { lazy, Suspense } from "react";
import { useTheme } from "../store/theme";
import { useFundoPausado } from "../store/fundo";
import { MoltenMetal } from "./MoltenMetal";

// ogl + shader do relevo só descem para quem está no Fantasy.
const Topography = lazy(() => import("./reactbits/Topography"));

// Cores pedidas (reactbits.dev/backgrounds/topography?lowColor=2800c9&midColor=ffffff&highColor=ffffff);
// o resto são os valores da demonstração do React Bits, com opacidade reduzida para o
// relevo não brigar com o texto por cima. Sem interação com o mouse (pedido do usuário) e
// parado durante sessões de questões (store/fundo.ts). Exportado à parte porque o Login
// também usa.
export function FundoFantasy() {
  const { tema } = useTheme();
  const pausado = useFundoPausado();
  if (tema !== "fantasy") return null;
  return (
    <div className="fundo-topo" aria-hidden>
      <Suspense fallback={null}>
        <Topography
          lowColor="#2800c9"
          midColor="#ffffff"
          highColor="#ffffff"
          scale={2}
          opacity={0.6}
          mouseInteraction={false}
          paused={pausado}
        />
      </Suspense>
      <div className="fundo-topo__vinheta" />
    </div>
  );
}

export function Atmosfera() {
  const { tema } = useTheme();
  if (tema === "fantasy") return <FundoFantasy />;

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden>
      <MoltenMetal
        key={tema}
        backgroundColor="#F4F1FF"
        color1="#00C2FF"
        color2="#E6007E"
        color3="#8B5CF6"
        colorMode="molten"
        lightMode
        speed={0.35}
        scale={3.6}
        detail={3}
        glow={1.5}
        coreSize={0.12}
        swirl={1.1}
        fold={-0.22}
        blackPoint={0.05}
        brightness={1.15}
        grain={false}
        mouseInteraction={false}
        opacity={1.0}
        className="h-full w-full"
      />
    </div>
  );
}

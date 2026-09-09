import { useTheme } from "../store/theme";
import { MoltenMetal } from "./MoltenMetal";

// Background fixo atrás do conteúdo.
// Mantém apenas o novo fundo WebGL Molten Metal com as cores relativas ao tema, sem camadas antigas de ruído, halos ou blur.
export function Atmosfera() {
  const { tema } = useTheme();
  const fantasy = tema === "fantasy";

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden>
      <MoltenMetal
        key={tema}
        backgroundColor={fantasy ? "#120E1E" : "#F4F1FF"}
        color1={fantasy ? "#2E1E54" : "#00C2FF"}
        color2={fantasy ? "#C9A227" : "#E6007E"}
        color3={fantasy ? "#FCEAA7" : "#8B5CF6"}
        colorMode={fantasy ? "ember" : "molten"}
        lightMode={!fantasy}
        speed={fantasy ? 0.28 : 0.35}
        scale={3.6}
        detail={3}
        glow={fantasy ? 1.7 : 1.5}
        coreSize={0.12}
        swirl={1.1}
        fold={-0.22}
        blackPoint={0.05}
        brightness={fantasy ? 1.25 : 1.15}
        grain={false}
        mouseInteraction={false}
        opacity={1.0}
        className="h-full w-full"
      />
    </div>
  );
}

// Fundo fixo atrás do conteúdo. Nunca captura clique.
// Fantasy: relevo animado (Topography, React Bits) + vinheta.
// Rose: Molten Metal (WebGL) nas cores do tema.
// Cyberpunk: Pixel Blast (React Bits) + linhas de varredura + vinheta.
import { lazy, Suspense } from "react";
import { useTheme } from "../store/theme";
import { useFundoPausado } from "../store/fundo";
import { MoltenMetal } from "./MoltenMetal";

// ogl + shaders só descem para quem está no tema que usa cada fundo.
const Topography = lazy(() => import("./reactbits/Topography"));
const PixelBlast = lazy(() => import("./reactbits/PixelBlast"));

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

// Pixels magenta (canto de cima) que viram ciano (canto de baixo), a dupla de Edgerunners.
// A camada fica a 50% (index.css, .fundo-cyber__pixels) para os pixels serem textura e não
// competirem com os cartões. Clicar em qualquer lugar solta uma onda nos pixels. Parado
// durante sessões de questões, como o relevo do Fantasy.
function FundoCyberpunk() {
  const pausado = useFundoPausado();
  return (
    <div className="fundo-cyber" aria-hidden>
      <div className="fundo-cyber__pixels">
        <Suspense fallback={null}>
          <PixelBlast
            variant="square"
            pixelSize={4}
            color="#FF2A6D"
            color2="#00F0FF"
            patternScale={2.6}
            patternDensity={1.05}
            pixelSizeJitter={0.4}
            enableRipples
            rippleSpeed={0.4}
            rippleThickness={0.12}
            rippleIntensityScale={1.5}
            speed={0.45}
            edgeFade={0.12}
            paused={pausado}
          />
        </Suspense>
      </div>
      <div className="fundo-cyber__varredura" />
      <div className="fundo-cyber__vinheta" />
    </div>
  );
}

export function Atmosfera() {
  const { tema } = useTheme();
  // Rose: o metal também congela durante uma sessão de questões.
  const pausado = useFundoPausado();
  if (tema === "fantasy") return <FundoFantasy />;
  if (tema === "cyberpunk") return <FundoCyberpunk />;

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
        paused={pausado}
        opacity={1.0}
        className="h-full w-full"
      />
    </div>
  );
}

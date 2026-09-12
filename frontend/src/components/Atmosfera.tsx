// Fundo fixo atrás do conteúdo. Nunca captura clique.
// Fantasy: relevo animado (Topography, React Bits) + vinheta.
// Rose ("Lugia", claro): Iridescence (React Bits) sob véu branco.
// Cyberpunk: Pixel Blast (React Bits) + linhas de varredura + vinheta.
import { lazy, Suspense } from "react";
import { useTheme } from "../store/theme";
import { useFundoPausado } from "../store/fundo";

// ogl + shaders só descem para quem está no tema que usa cada fundo.
const Topography = lazy(() => import("./reactbits/Topography"));
const PixelBlast = lazy(() => import("./reactbits/PixelBlast"));
const Iridescence = lazy(() => import("./reactbits/Iridescence"));

// Azul das placas das asas do Lugia, em 0..1 (o formato do React Bits). Constante de
// módulo porque é prop de identidade: recriar o array a cada render reenviaria o
// uniforme sem necessidade.
const AZUL_LUGIA: [number, number, number] = [
  0.09803921568627451, 0.24313725490196078, 0.5372549019607843,
];

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
  // Rose/Lugia: o reflexo também congela durante uma sessão de questões.
  const pausado = useFundoPausado();
  if (tema === "fantasy") return <FundoFantasy />;
  if (tema === "cyberpunk") return <FundoCyberpunk />;

  // Claro ("Lugia"): iridescência no azul das asas, coberta por um véu branco. O padrão
  // cru ocupa a tela inteira e briga com o texto; o véu deixa só o reflexo perolado.
  // Sem interação com o mouse, como nos outros fundos.
  return (
    <div className="fundo-lugia" aria-hidden>
      <div className="fundo-lugia__canvas">
        <Suspense fallback={null}>
          <Iridescence color={AZUL_LUGIA} speed={0.6} paused={pausado} />
        </Suspense>
      </div>
      <div className="fundo-lugia__veu" />
      <div className="fundo-lugia__brilho" />
    </div>
  );
}

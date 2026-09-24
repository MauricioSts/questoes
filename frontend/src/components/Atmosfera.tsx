// Fundo fixo atrás do conteúdo. Nunca captura clique.
// Fantasy: relevo animado (Topography, React Bits) + vinheta.
// Rose ("Lugia", claro): Iridescence (React Bits) sob véu branco.
// Cyberpunk: Pixel Blast (React Bits) + linhas de varredura + vinheta.
// Aranha: página de gibi (fundos/TeiaReticula) + aranha pendurada no fio + véu de papel.
// Venom: simbionte vivo nas bordas (fundos/Simbionte) + olhos que aparecem no escuro.
import { lazy, Suspense } from "react";
import { useTheme } from "../store/theme";
import { useFundoPausado } from "../store/fundo";
import { importarChunk } from "../lib/importarChunk";
import { OLHO_VENOM_DIR, OLHO_VENOM_ESQ } from "./SimbolosHeroi";

// ogl + shaders só descem para quem está no tema que usa cada fundo.
const Topography = lazy(() => importarChunk(() => import("./reactbits/Topography")));
const PixelBlast = lazy(() => importarChunk(() => import("./reactbits/PixelBlast")));
const Iridescence = lazy(() => importarChunk(() => import("./reactbits/Iridescence")));
const TeiaReticula = lazy(() => importarChunk(() => import("./fundos/TeiaReticula")));
const Simbionte = lazy(() => importarChunk(() => import("./fundos/Simbionte")));

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
// Na sessão de questões param os pixels E a faixa de luz que desce pela tela: ela cruza o
// enunciado a cada 9 s e puxa o olho para fora da leitura.
// A camada fica a 50% (index.css, .fundo-cyber__pixels) para os pixels serem textura e não
// competirem com os cartões. Clicar em qualquer lugar solta uma onda nos pixels. Parado
// durante sessões de questões, como o relevo do Fantasy.
function FundoCyberpunk() {
  const pausado = useFundoPausado();
  return (
    <div className={`fundo-cyber ${pausado ? "fundo-cyber--parado" : ""}`} aria-hidden>
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

// Aranha: o shader desenha papel, retícula e teia; por cima, um véu de papel no miolo
// (onde ficam os cartões) e uma aranhinha descendo pelo fio a partir da teia, que para
// junto com o resto numa sessão de questões.
function FundoAranha() {
  const pausado = useFundoPausado();
  return (
    <div className={`fundo-aranha ${pausado ? "fundo-aranha--parado" : ""}`} aria-hidden>
      <div className="fundo-aranha__canvas">
        <Suspense fallback={null}>
          <TeiaReticula paused={pausado} />
        </Suspense>
      </div>
      <div className="fundo-aranha__veu" />
      <div className="fundo-aranha__fio">
        <svg className="fundo-aranha__bicho" viewBox="0 0 24 24" width="30" height="30">
          <g stroke="#141018" strokeWidth="1.3" strokeLinecap="round" fill="none">
            <path d="M10.6 10.8 7.4 7.6 6.6 2.8M13.4 10.8l3.2-3.2.8-4.8M10.3 12.3 6.2 10.6 2.8 8.2M13.7 12.3l4.1-1.7 3.4-2.4M10.3 14.2 6.1 15.8 3.4 19.4M13.7 14.2l4.2 1.6 2.7 3.6M10.9 15.9 8.3 18.9 7.3 22.4M13.1 15.9l2.6 3 1 3.5" />
          </g>
          <circle cx="12" cy="8.7" r="1.7" fill="#141018" />
          <ellipse cx="12" cy="13.6" rx="2.4" ry="3.9" fill="#D4192C" stroke="#141018" strokeWidth="0.9" />
        </svg>
      </div>
      <div className="fundo-aranha__vinheta" />
    </div>
  );
}

// Venom: a massa viva nas bordas; os olhos brancos abrem de vez em quando no canto de
// baixo, piscam e somem dentro da massa. Parado na sessão de questões.
function FundoVenom() {
  const pausado = useFundoPausado();
  return (
    <div className={`fundo-venom ${pausado ? "fundo-venom--parado" : ""}`} aria-hidden>
      <div className="fundo-venom__canvas">
        <Suspense fallback={null}>
          <Simbionte paused={pausado} />
        </Suspense>
      </div>
      <svg className="fundo-venom__olhos" viewBox="0 0 24 24">
        <path d={OLHO_VENOM_ESQ} />
        <path d={OLHO_VENOM_DIR} />
      </svg>
      <div className="fundo-venom__vinheta" />
      {/* Filtro de gosma do título (TituloVivo): borra e corta o alfa, então filete e
          gotas que se tocam viram uma massa só. Vive aqui porque o fundo existe uma vez
          por tela, e o id precisa ser único. */}
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <filter id="gosma-venom">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="borrado" />
          <feColorMatrix in="borrado" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -8" />
        </filter>
      </svg>
    </div>
  );
}

export function Atmosfera() {
  const { tema } = useTheme();
  // Rose/Lugia: o reflexo também congela durante uma sessão de questões.
  const pausado = useFundoPausado();
  if (tema === "fantasy") return <FundoFantasy />;
  if (tema === "cyberpunk") return <FundoCyberpunk />;
  if (tema === "aranha") return <FundoAranha />;
  if (tema === "venom") return <FundoVenom />;

  // Claro ("Lugia"): iridescência no azul das asas, coberta por um véu branco. O padrão
  // cru ocupa a tela inteira e briga com o texto; o véu deixa só o reflexo perolado.
  // Sem interação com o mouse, como nos outros fundos.
  // As camadas depois do véu são o "detalhe" do tema: uma grade fina de papel
  // milimetrado, duas asas de luz que derivam devagar e um grão bem baixo. Tudo em CSS:
  // o custo é zero perto de um segundo shader, e some junto com o resto quando o fundo
  // está pausado (sessão de questões).
  return (
    <div className={`fundo-lugia ${pausado ? "fundo-lugia--parado" : ""}`} aria-hidden>
      <div className="fundo-lugia__canvas">
        <Suspense fallback={null}>
          <Iridescence color={AZUL_LUGIA} speed={0.6} paused={pausado} />
        </Suspense>
      </div>
      <div className="fundo-lugia__veu" />
      <div className="fundo-lugia__grade" />
      <div className="fundo-lugia__asa fundo-lugia__asa--uma" />
      <div className="fundo-lugia__asa fundo-lugia__asa--outra" />
      <div className="fundo-lugia__brilho" />
      <div className="fundo-lugia__grao" />
    </div>
  );
}

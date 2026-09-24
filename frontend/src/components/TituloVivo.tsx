// Título de página. No Fantasy o texto é desenhado pelo WarpText (WebGL, distorção
// viva) e o leitor de tela lê o <span class="sr-only">, o canvas é só decoração. No
// Cyberpunk é um <h1> com glitch em CSS (.titulo-glitch, index.css: as cópias ciano e
// magenta vêm de data-texto, pseudo-elementos que o leitor de tela ignora). No Rose é o
// <h1> de sempre. No Aranha o título é impresso fora de registro (vermelho e azul
// deslocados, como gibi barato) e de tempos em tempos dá o "salto de dimensão" do
// Aranhaverso. No Venom o título pinga: um filete branco sob o texto passa por um filtro
// de gosma (SVG) e solta gotas que escorrem.
//
// O WarpText (e a biblioteca ogl) chegam por import dinâmico: quem usa os outros temas
// nunca baixa. Enquanto o pedaço carrega, o fallback mostra o mesmo texto na mesma fonte e
// entrelinha, então o título não pula quando o canvas assume.
import { lazy, Suspense } from "react";
import { useTheme } from "../store/theme";
import { importarChunk } from "../lib/importarChunk";

const WarpText = lazy(() => importarChunk(() => import("./reactbits/WarpText")));

const FONTE_FANTASY = "'Fraunces', Georgia, serif";
const COR_FANTASY = "#ECEAFF";
const ENTRELINHA = 1.08;

export function TituloVivo({ texto, tamanho = 40, className = "" }: { texto: string; tamanho?: number; className?: string }) {
  const { tema } = useTheme();

  if (tema === "aranha") {
    return (
      <h1 className={`titulo-gibi ${className}`} data-texto={texto} style={{ fontSize: tamanho }}>
        {texto}
      </h1>
    );
  }

  if (tema === "venom") return <TituloVenom texto={texto} tamanho={tamanho} className={className} />;

  if (tema === "cyberpunk") {
    return (
      <h1 className={`titulo-glitch ${className}`} data-texto={texto} style={{ fontSize: tamanho }}>
        {texto}
      </h1>
    );
  }

  if (tema !== "fantasy") {
    return (
      <h1
        className={`font-display text-brand-ink ${className}`}
        style={{ fontSize: tamanho, fontWeight: "var(--displayWeight)" as never }}
      >
        {texto}
      </h1>
    );
  }

  const estatico = (
    <span
      aria-hidden
      className="block"
      style={{ fontFamily: FONTE_FANTASY, fontSize: tamanho, fontWeight: 600, lineHeight: ENTRELINHA, letterSpacing: "-0.01em", color: COR_FANTASY }}
    >
      {texto}
    </span>
  );

  return (
    <h1 className={`titulo-vivo ${className}`}>
      <span className="sr-only">{texto}</span>
      <Suspense fallback={estatico}>
        <WarpText text={texto} fontSize={tamanho} fontFamily={FONTE_FANTASY} fontWeight={600} lineHeight={ENTRELINHA} color={COR_FANTASY} halo="rgba(4,4,12,.9)" />
      </Suspense>
    </h1>
  );
}

// Gotas do título do Venom: posição (% da largura), largura, duração e atraso fixos, para
// o título pingar sempre do mesmo jeito (sorteio a cada render faria as gotas pularem).
const GOTAS = [
  { x: 6, w: 7, dur: 4.2, atraso: 0.3 },
  { x: 19, w: 10, dur: 5.6, atraso: 2.1 },
  { x: 34, w: 6, dur: 3.8, atraso: 1.2 },
  { x: 52, w: 9, dur: 6.1, atraso: 3.4 },
  { x: 67, w: 7, dur: 4.7, atraso: 0.8 },
  { x: 83, w: 11, dur: 5.2, atraso: 2.7 },
];

function TituloVenom({ texto, tamanho, className }: { texto: string; tamanho: number; className: string }) {
  return (
    <h1 className={`titulo-venom ${className}`} style={{ fontSize: tamanho }}>
      <span className="titulo-venom__texto">{texto}</span>
      <span className="titulo-venom__gosma" aria-hidden>
        <span className="titulo-venom__filete" />
        {GOTAS.map((g, i) => (
          <span
            key={i}
            className="titulo-venom__gota"
            style={{ left: `${g.x}%`, width: g.w, height: g.w, animationDuration: `${g.dur}s`, animationDelay: `${g.atraso}s` }}
          />
        ))}
      </span>
    </h1>
  );
}

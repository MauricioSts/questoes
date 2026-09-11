// Título de página. No Fantasy o texto é desenhado pelo WarpText (WebGL, distorção
// viva) e o leitor de tela lê o <span class="sr-only">, o canvas é só decoração. No
// Cyberpunk é um <h1> com glitch em CSS (.titulo-glitch, index.css: as cópias ciano e
// magenta vêm de data-texto, pseudo-elementos que o leitor de tela ignora). No Rose é o
// <h1> de sempre.
//
// O WarpText (e a biblioteca ogl) chegam por import dinâmico: quem usa os outros temas
// nunca baixa. Enquanto o pedaço carrega, o fallback mostra o mesmo texto na mesma fonte e
// entrelinha, então o título não pula quando o canvas assume.
import { lazy, Suspense } from "react";
import { useTheme } from "../store/theme";

const WarpText = lazy(() => import("./reactbits/WarpText"));

const FONTE_FANTASY = "'Fraunces', Georgia, serif";
const COR_FANTASY = "#ECEAFF";
const ENTRELINHA = 1.08;

export function TituloVivo({ texto, tamanho = 40, className = "" }: { texto: string; tamanho?: number; className?: string }) {
  const { tema } = useTheme();

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

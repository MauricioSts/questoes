// Casca do Counter (React Bits) com os padrões deste app: sem caixa nem espaçamento
// entre dígitos, para o número rolante ocupar exatamente o lugar do texto que
// substituiu, e com o degradê de topo/base na cor da superfície do cartão — o padrão
// do componente é preto, que no tema claro apareceria como duas faixas escuras.
import type { CSSProperties } from "react";
import { useReducedMotion } from "motion/react";
import Counter from "./Counter";

interface ContadorProps {
  valor: number;
  /** Em px. O componente precisa da altura exata da linha para rolar os dígitos. */
  fontSize: number;
  cor?: string;
  fontWeight?: CSSProperties["fontWeight"];
  /** Cor de fundo atrás do número, para o degradê de recorte. */
  fundo?: string;
}

// O Counter só desenha dígitos, então o separador de milhar do pt-BR se perderia.
// Ele aceita "." como casa literal, então basta intercalar um a cada três dígitos.
function casasComMilhar(valor: number): (number | ".")[] {
  const digitos = Math.max(1, Math.trunc(Math.abs(valor)).toString().length);
  const casas: (number | ".")[] = [];
  for (let i = digitos - 1; i >= 0; i--) {
    casas.push(10 ** i);
    if (i > 0 && i % 3 === 0) casas.push(".");
  }
  return casas;
}

export function Contador({
  valor,
  fontSize,
  cor = "var(--text)",
  fontWeight = "inherit",
  fundo = "var(--surfaceHex)",
}: ContadorProps) {
  const reduzido = useReducedMotion();

  if (reduzido) {
    return <span style={{ color: cor, fontWeight }}>{valor.toLocaleString("pt-BR")}</span>;
  }

  return (
    <Counter
      value={valor}
      places={casasComMilhar(valor)}
      fontSize={fontSize}
      padding={0}
      gap={0}
      horizontalPadding={0}
      borderRadius={0}
      textColor={cor}
      fontWeight={fontWeight}
      gradientHeight={Math.max(6, Math.round(fontSize * 0.2))}
      gradientFrom={fundo}
      gradientTo="transparent"
    />
  );
}

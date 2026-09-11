// Casca temática do BorderGlow (React Bits): fecha as cores nos tokens do app para
// não repetir hex em toda tela. Fantasy = ultramar e branco-lua sobre noite (a escala do
// relevo do fundo); Rose = neon magenta sobre superfície clara (o BorderGlow troca sozinho
// para a variante clara); Cyberpunk = amarelo, ciano e magenta sobre preto, de quina viva.
import type { ReactNode } from "react";
import BorderGlow from "./BorderGlow";
import { useTheme, type Tema } from "../store/theme";

const CORES: Record<Tema, { fundo: string; brilho: string; cores: string[]; raio?: number }> = {
  fantasy: { fundo: "#0B0A1C", brilho: "250 100 73", cores: ["#ECEAFF", "#8B74FF", "#4B22F0"] },
  rose: { fundo: "#FFFFFF", brilho: "327 100 62", cores: ["#E6007E", "#8B5CF6", "#00B39A"] },
  cyberpunk: { fundo: "#0C0B12", brilho: "184 100 55", cores: ["#FCEE0A", "#00F0FF", "#FF2A6D"], raio: 3 },
};

interface BrilhoBordaProps {
  children: ReactNode;
  className?: string;
  /** Passa a varredura de entrada uma vez, ao montar. */
  animated?: boolean;
  borderRadius?: number;
  glowRadius?: number;
  glowIntensity?: number;
  fillOpacity?: number;
  edgeSensitivity?: number;
}

export function BrilhoBorda({
  children,
  className = "",
  animated = false,
  borderRadius = 16,
  glowRadius = 34,
  glowIntensity = 0.9,
  fillOpacity = 0.45,
  edgeSensitivity = 30,
}: BrilhoBordaProps) {
  const { tema } = useTheme();
  const c = CORES[tema];

  return (
    <BorderGlow
      className={className}
      animated={animated}
      borderRadius={c.raio ?? borderRadius}
      glowRadius={glowRadius}
      glowIntensity={glowIntensity}
      fillOpacity={fillOpacity}
      edgeSensitivity={edgeSensitivity}
      backgroundColor={c.fundo}
      glowColor={c.brilho}
      colors={c.cores}
    >
      {children}
    </BorderGlow>
  );
}

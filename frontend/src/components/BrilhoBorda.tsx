// Casca temática do BorderGlow (React Bits): fecha as cores nos tokens do app para
// não repetir hex em toda tela. Fantasy = ultramar e branco-lua sobre noite (a escala do relevo do fundo); cyberpunk = neon magenta
// sobre superfície clara (o BorderGlow troca sozinho para a variante clara).
import type { ReactNode } from "react";
import BorderGlow from "./BorderGlow";
import { useTheme } from "../store/theme";

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
  const fantasy = tema === "fantasy";

  return (
    <BorderGlow
      className={className}
      animated={animated}
      borderRadius={borderRadius}
      glowRadius={glowRadius}
      glowIntensity={glowIntensity}
      fillOpacity={fillOpacity}
      edgeSensitivity={edgeSensitivity}
      backgroundColor={fantasy ? "#0B0A1C" : "#FFFFFF"}
      glowColor={fantasy ? "250 100 73" : "327 100 62"}
      colors={
        fantasy
          ? ["#ECEAFF", "#8B74FF", "#4B22F0"]
          : ["#E6007E", "#8B5CF6", "#00B39A"]
      }
    >
      {children}
    </BorderGlow>
  );
}

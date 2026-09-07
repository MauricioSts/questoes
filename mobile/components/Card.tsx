import { View, type ViewProps } from "react-native";
import { useTema } from "@/theme/ThemeProvider";

/** Superfície padrão do app. O raio muda por tema: reto no Fantasy, redondo no Cyberpunk. */
export function Card({ style, className = "", ...resto }: ViewProps & { className?: string }) {
  const { raio, hex, tema } = useTema();
  return (
    <View
      className={`border border-hair bg-surface p-4 ${className}`}
      style={[
        { borderRadius: raio.r },
        tema === "cyberpunk"
          ? { shadowColor: "#5A3CBE", shadowOpacity: 0.18, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 2 }
          : { shadowColor: "#000", shadowOpacity: 0.5, shadowRadius: 18, shadowOffset: { width: 0, height: 12 }, elevation: 4 },
        style,
      ]}
      {...resto}
    />
  );
}

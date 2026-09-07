import { View } from "react-native";
import { useTema } from "@/theme/ThemeProvider";

/** Barra de progresso simples. `valor` de 0 a 1. */
export function Barra({ valor, altura = 6 }: { valor: number; altura?: number }) {
  const { hex, raio } = useTema();
  const pct = Math.round(Math.min(1, Math.max(0, valor)) * 100);
  return (
    <View style={{ height: altura, borderRadius: raio.chip, backgroundColor: hex.track, overflow: "hidden" }}>
      <View style={{ width: `${pct}%`, height: "100%", backgroundColor: hex.accent }} />
    </View>
  );
}

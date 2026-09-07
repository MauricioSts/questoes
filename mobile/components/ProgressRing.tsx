import { View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useTema } from "@/theme/ThemeProvider";
import { Fraco, Txt } from "./Texto";

/** Anel da meta diária. Porte direto do ProgressRing do web (SVG inline -> react-native-svg). */
export function ProgressRing({ feito, meta, tamanho = 112 }: { feito: number; meta: number; tamanho?: number }) {
  const { hex } = useTema();
  const traco = 9;
  const r = (tamanho - traco) / 2;
  const volta = 2 * Math.PI * r;
  const razao = meta > 0 ? Math.min(feito / meta, 1) : 0;

  return (
    <View style={{ width: tamanho, height: tamanho, alignItems: "center", justifyContent: "center" }}>
      <Svg width={tamanho} height={tamanho} style={{ position: "absolute" }}>
        <Circle cx={tamanho / 2} cy={tamanho / 2} r={r} stroke={hex.track} strokeWidth={traco} fill="none" />
        <Circle
          cx={tamanho / 2}
          cy={tamanho / 2}
          r={r}
          stroke={hex.accent}
          strokeWidth={traco}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={volta}
          strokeDashoffset={volta * (1 - razao)}
          // Começa no topo em vez de às 3 horas.
          transform={`rotate(-90 ${tamanho / 2} ${tamanho / 2})`}
        />
      </Svg>
      <Txt className="text-[26px] font-bold">{feito}</Txt>
      <Fraco className="text-[11px]">de {meta}</Fraco>
    </View>
  );
}

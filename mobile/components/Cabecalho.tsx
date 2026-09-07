import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";
import { Moon, Sun } from "lucide-react-native";
import { useTema } from "@/theme/ThemeProvider";
import { Rotulo, Txt } from "./Texto";

/** Marca por tema: eclipse dourado no Fantasy, quadrado neon no Cyberpunk. */
function Marca() {
  const { tema, hex, raio } = useTema();
  if (tema === "fantasy") {
    return (
      <Svg width={32} height={32} viewBox="0 0 34 34">
        <Circle cx={17} cy={17} r={15} fill="none" stroke={hex.accent} strokeWidth={1.4} opacity={0.8} />
        <Path d="M17 4a13 13 0 100 26 10 10 0 010-26z" fill={hex.accent} opacity={0.9} />
        <Circle cx={24} cy={10} r={1.6} fill={hex.accentHi} />
      </Svg>
    );
  }
  return (
    <View style={{ width: 32, height: 32, borderRadius: raio.sm, backgroundColor: "#14103A", alignItems: "center", justifyContent: "center" }}>
      <Txt className="text-[18px] font-bold" style={{ color: hex.accent }}>A</Txt>
    </View>
  );
}

export function Cabecalho({ titulo }: { titulo: string }) {
  const { tema, alternar, hex, raio } = useTema();
  const inset = useSafeAreaInsets();
  const Icone = tema === "fantasy" ? Sun : Moon;

  return (
    <View
      className="flex-row items-center gap-3 border-b border-hair bg-surface px-4 pb-3"
      style={{ paddingTop: inset.top + 10 }}
    >
      <Marca />
      <View className="flex-1">
        <Txt className="text-[15px] font-bold">devconcursado</Txt>
        <Rotulo>{titulo}</Rotulo>
      </View>
      <Pressable
        onPress={alternar}
        hitSlop={10}
        style={{ padding: 8, borderRadius: raio.sm, borderWidth: 1, borderColor: hex.line }}
      >
        <Icone size={18} color={hex.accent} />
      </Pressable>
    </View>
  );
}

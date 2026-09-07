import { Pressable, Text, View, type PressableProps } from "react-native";
import { useTema } from "@/theme/ThemeProvider";

type Props = Omit<PressableProps, "style" | "children"> & {
  titulo: string;
  variante?: "cheio" | "contorno";
};

/**
 * O visual mora numa View interna, e não no `style` do Pressable.
 *
 * Motivo: o NativeWind embrulha o Pressable para traduzir className, e nesse
 * caminho o `style` na forma de função — a maneira padrão de reagir a `pressed` —
 * deixa de ser aplicado, e o botão renderiza sem fundo. Com a View interna o
 * estilo é um objeto comum e independe desse interop.
 */
export function Botao({ titulo, variante = "cheio", ...resto }: Props) {
  const { hex, raio } = useTema();
  const cheio = variante === "cheio";

  return (
    <Pressable accessibilityRole="button" {...resto}>
      {({ pressed }) => (
        <View
          style={{
            borderRadius: raio.r,
            paddingVertical: 13,
            paddingHorizontal: 18,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: cheio ? hex.accent : "transparent",
            borderWidth: cheio ? 0 : 1,
            borderColor: hex.line,
            opacity: pressed ? 0.75 : 1,
          }}
        >
          <Text style={{ color: cheio ? hex.onAccent : hex.text, fontWeight: "700", fontSize: 15 }}>
            {titulo}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

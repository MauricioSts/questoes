import { View } from "react-native";
import { Cabecalho } from "./Cabecalho";
import { Card } from "./Card";
import { Fraco, Titulo } from "./Texto";

/** Tela ainda não portada. Existe para a navegação ficar completa desde já. */
export function EmBreve({ titulo, fase }: { titulo: string; fase: string }) {
  return (
    <View className="flex-1">
      <Cabecalho titulo={titulo} />
      <View className="flex-1 justify-center p-4">
        <Card className="gap-2">
          <Titulo>{titulo}</Titulo>
          <Fraco>Porte previsto para a {fase} (SDD §8).</Fraco>
        </Card>
      </View>
    </View>
  );
}

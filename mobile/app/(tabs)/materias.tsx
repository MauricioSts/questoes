import { FlatList, Pressable, View } from "react-native";
import { router } from "expo-router";
import { Cabecalho } from "@/components/Cabecalho";
import { Card } from "@/components/Card";
import { Fraco, Rotulo, Txt } from "@/components/Texto";
import { Barra } from "@/components/Barra";
import { useMaterias } from "@/lib/hooks/useMaterias";

export default function Materias() {
  const materias = useMaterias();

  return (
    <View className="flex-1">
      <Cabecalho titulo="Matérias" />
      <FlatList
        data={materias}
        keyExtractor={(m) => m.materia}
        contentContainerClassName="gap-2 p-4 pb-8"
        ListEmptyComponent={
          <Card>
            <Fraco>Nenhuma questão no acervo deste concurso.</Fraco>
          </Card>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              router.push({ pathname: "/sessao", params: { modo: "topico", materia: item.materia } })
            }
          >
            <Card className="gap-2">
              <View className="flex-row items-center gap-2">
                <Txt className="flex-1 font-bold">{item.materia}</Txt>
                <Rotulo>MÓD {item.modulo}</Rotulo>
              </View>
              <Barra valor={item.cobertura} />
              <Fraco>
                {item.respondidas} de {item.total} respondidas
                {item.erradas > 0 && ` · ${item.erradas} erradas`}
              </Fraco>
            </Card>
          </Pressable>
        )}
      />
    </View>
  );
}

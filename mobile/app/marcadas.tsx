import { ActivityIndicator, FlatList, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Botao } from "@/components/Botao";
import { Card } from "@/components/Card";
import { Fraco, Titulo, Txt } from "@/components/Texto";
import { useTema } from "@/theme/ThemeProvider";
import { useConcurso } from "@/store/concurso";
import { useMarcadas } from "@/lib/hooks/useMarcadas";

export default function Marcadas() {
  const { hex } = useTema();
  const inset = useSafeAreaInsets();
  const { ativo } = useConcurso();
  const { questoes, alternar, carregando } = useMarcadas(ativo?.id ?? null);

  // As marcadas vêm do servidor como ids; o conteúdo sai do acervo em memória.
  // Uma questão excluída do acervo simplesmente não aparece, em vez de quebrar.
  const lista = questoes();

  return (
    <View className="flex-1">
      <View
        className="flex-row items-center gap-3 border-b border-hair bg-surface px-4 pb-3"
        style={{ paddingTop: inset.top + 10 }}
      >
        <Titulo className="flex-1">Marcadas</Titulo>
        <Botao titulo="Voltar" variante="contorno" onPress={() => router.back()} />
      </View>

      {carregando ? (
        <ActivityIndicator color={hex.accent} className="mt-6" />
      ) : (
        <FlatList
          data={lista}
          keyExtractor={(q) => String(q.id)}
          contentContainerClassName="gap-2 p-4 pb-8"
          ListEmptyComponent={
            <Card>
              <Fraco>Nenhuma questão marcada.</Fraco>
            </Card>
          }
          renderItem={({ item }) => (
            <Card className="gap-2">
              <Fraco>
                {item.materia} · {item.assunto}
              </Fraco>
              <Txt numberOfLines={3}>{item.enunciado}</Txt>
              <Botao titulo="Desmarcar" variante="contorno" onPress={() => void alternar(item.id)} />
            </Card>
          )}
        />
      )}
    </View>
  );
}

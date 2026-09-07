import { ScrollView, View } from "react-native";
import { router } from "expo-router";
import { Cabecalho } from "@/components/Cabecalho";
import { Card } from "@/components/Card";
import { Botao } from "@/components/Botao";
import { Fraco, Titulo } from "@/components/Texto";
import { useConcurso } from "@/store/concurso";
import { useProgresso } from "@/lib/hooks/useProgresso";

export default function Revisar() {
  const { ativo } = useConcurso();
  const { dados } = useProgresso(ativo?.id ?? null);
  const pendentes = dados?.revisaoPendente ?? 0;

  return (
    <View className="flex-1">
      <Cabecalho titulo="Revisar" />
      <ScrollView contentContainerClassName="gap-3 p-4 pb-8">
        <Card className="gap-2">
          <Titulo>{pendentes} para revisar</Titulo>
          <Fraco>
            Fila de revisão espaçada (SRS), calculada no servidor a partir do seu histórico.
          </Fraco>
          <Botao
            titulo="Revisar agora"
            disabled={pendentes === 0}
            onPress={() => router.push({ pathname: "/sessao", params: { modo: "revisar" } })}
          />
        </Card>
      </ScrollView>
    </View>
  );
}

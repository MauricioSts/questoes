import { ScrollView, View } from "react-native";
import { router } from "expo-router";
import { Cabecalho } from "@/components/Cabecalho";
import { Card } from "@/components/Card";
import { Botao } from "@/components/Botao";
import { Fraco, Rotulo, Titulo } from "@/components/Texto";
import { useQuestoes } from "@/store/questoes";

const MODOS = [
  { modo: "flash", titulo: "Flash", desc: "10 questões, priorizando o que você errou." },
  { modo: "topico", titulo: "Tópico", desc: "Questões ainda não respondidas do acervo." },
  { modo: "simulado", titulo: "Simulado", desc: "Prova completa na proporção do edital." },
] as const;

export default function Estudar() {
  const { total, offline, carregando } = useQuestoes();

  return (
    <View className="flex-1">
      <Cabecalho titulo="Estudar" />
      <ScrollView contentContainerClassName="gap-3 p-4 pb-8">
        <Card className="gap-1">
          <Rotulo>Acervo</Rotulo>
          <Fraco>
            {carregando ? "Carregando…" : `${total} questões disponíveis`}
            {offline && " · em cache, sem conexão"}
          </Fraco>
        </Card>

        {MODOS.map((m) => (
          <Card key={m.modo} className="gap-2">
            <Titulo>{m.titulo}</Titulo>
            <Fraco>{m.desc}</Fraco>
            <Botao
              titulo="Começar"
              onPress={() => router.push({ pathname: "/sessao", params: { modo: m.modo } })}
            />
          </Card>
        ))}
      </ScrollView>
    </View>
  );
}

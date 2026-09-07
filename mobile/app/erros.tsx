import { useState } from "react";
import { ActivityIndicator, FlatList, Pressable, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Botao } from "@/components/Botao";
import { Card } from "@/components/Card";
import { Fraco, Rotulo, Titulo, Txt } from "@/components/Texto";
import { useTema } from "@/theme/ThemeProvider";
import { useConcurso } from "@/store/concurso";
import { useErros, type PeriodoErros } from "@/lib/hooks/useErros";

const PERIODOS: { valor: PeriodoErros; rotulo: string }[] = [
  { valor: "7d", rotulo: "7 dias" },
  { valor: "30d", rotulo: "30 dias" },
  { valor: "all", rotulo: "Tudo" },
];

export default function Erros() {
  const { hex, raio } = useTema();
  const inset = useSafeAreaInsets();
  const { ativo } = useConcurso();
  const [periodo, setPeriodo] = useState<PeriodoErros>("30d");
  const { itens, carregando, erro } = useErros(ativo?.id ?? null, periodo, "todas");

  const pendentes = itens.filter((i) => !i.acertouUltima).length;

  return (
    <View className="flex-1">
      <View
        className="flex-row items-center gap-3 border-b border-hair bg-surface px-4 pb-3"
        style={{ paddingTop: inset.top + 10 }}
      >
        <Titulo className="flex-1">Meus erros</Titulo>
        <Botao titulo="Voltar" variante="contorno" onPress={() => router.back()} />
      </View>

      <View className="flex-row gap-2 p-4 pb-2">
        {PERIODOS.map((p) => (
          <Pressable
            key={p.valor}
            onPress={() => setPeriodo(p.valor)}
            style={{
              flex: 1,
              alignItems: "center",
              paddingVertical: 9,
              borderRadius: raio.sm,
              borderWidth: 1,
              borderColor: periodo === p.valor ? hex.accent : hex.line,
              backgroundColor: periodo === p.valor ? hex.accentBg : "transparent",
            }}
          >
            <Txt className="text-[13px] font-bold">{p.rotulo}</Txt>
          </Pressable>
        ))}
      </View>

      {carregando ? (
        <ActivityIndicator color={hex.accent} className="mt-6" />
      ) : (
        <FlatList
          data={itens}
          keyExtractor={(i) => String(i.questaoId)}
          contentContainerClassName="gap-2 p-4 pt-2 pb-8"
          ListHeaderComponent={
            <Card className="mb-1 gap-1">
              <Rotulo>Resumo</Rotulo>
              <Fraco>
                {erro ?? `${itens.length} questões erradas no período · ${pendentes} ainda não recuperadas`}
              </Fraco>
            </Card>
          }
          ListEmptyComponent={
            <Card>
              <Fraco>{erro ?? "Nenhum erro no período."}</Fraco>
            </Card>
          }
          renderItem={({ item }) => (
            <Card className="gap-1">
              <View className="flex-row gap-2">
                <Txt className="flex-1 text-[14px] font-bold">{item.materia}</Txt>
                {/* Recuperada = errou antes, mas acertou na última vez. */}
                <Rotulo style={{ color: item.acertouUltima ? hex.goodText : hex.accentText }}>
                  {item.acertouUltima ? "RECUPERADA" : "PENDENTE"}
                </Rotulo>
              </View>
              <Fraco>{item.assunto}</Fraco>
              <Fraco>
                {item.erros} {item.erros === 1 ? "erro" : "erros"} · você marcou {item.alternativaMarcada}
              </Fraco>
            </Card>
          )}
        />
      )}
    </View>
  );
}

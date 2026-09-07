import { useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from "react-native";
import { Cabecalho } from "@/components/Cabecalho";
import { Card } from "@/components/Card";
import { Barra } from "@/components/Barra";
import { Fraco, Rotulo, Titulo, Txt } from "@/components/Texto";
import { useTema } from "@/theme/ThemeProvider";
import { useConcurso } from "@/store/concurso";
import { useStats, type PeriodoStats } from "@/lib/hooks/useStats";

const PERIODOS: { valor: PeriodoStats; rotulo: string }[] = [
  { valor: "7d", rotulo: "7 dias" },
  { valor: "30d", rotulo: "30 dias" },
  { valor: "all", rotulo: "Tudo" },
];

function pct(v: number) {
  return `${Math.round(v * 100)}%`;
}

export default function Stats() {
  const { hex, raio } = useTema();
  const { ativo } = useConcurso();
  const [periodo, setPeriodo] = useState<PeriodoStats>("30d");
  const { stats, dias, carregando, erro, recarregar } = useStats(ativo?.id ?? null, periodo);

  return (
    <View className="flex-1">
      <Cabecalho titulo="Estatísticas" />
      <ScrollView
        contentContainerClassName="gap-3 p-4 pb-8"
        refreshControl={
          <RefreshControl refreshing={carregando} onRefresh={recarregar} tintColor={hex.accent} />
        }
      >
        <View className="flex-row gap-2">
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

        {erro && (
          <Card>
            <Txt style={{ color: hex.accentText }}>{erro}</Txt>
          </Card>
        )}

        {carregando && !stats ? (
          <ActivityIndicator color={hex.accent} />
        ) : stats ? (
          <>
            <Card className="gap-1">
              <Rotulo>Desempenho</Rotulo>
              <Txt className="text-[28px] font-bold">{pct(stats.taxaGlobal)}</Txt>
              <Fraco>
                {stats.totalAcertos} acertos em {stats.totalRespondidas} respostas
                {stats.tempoMedioSegundos != null &&
                  ` · ${Math.round(stats.tempoMedioSegundos)}s por questão`}
              </Fraco>
            </Card>

            {stats.pontosFracos.length > 0 && (
              <Card className="gap-3">
                <Titulo>Pontos fracos</Titulo>
                <Fraco>Assuntos com menor taxa de acerto e volume suficiente.</Fraco>
                {stats.pontosFracos.slice(0, 8).map((p) => (
                  <View key={p.chave} className="gap-1">
                    <View className="flex-row gap-2">
                      <Txt className="flex-1 text-[14px]">{p.chave}</Txt>
                      <Fraco>{pct(p.taxa)}</Fraco>
                    </View>
                    <Barra valor={p.taxa} altura={4} />
                  </View>
                ))}
              </Card>
            )}

            <Card className="gap-3">
              <Titulo>Por matéria</Titulo>
              {stats.porMateria.map((m) => (
                <View key={m.chave} className="gap-1">
                  <View className="flex-row gap-2">
                    <Txt className="flex-1 text-[14px]">{m.chave}</Txt>
                    <Fraco>
                      {pct(m.taxa)} · {m.total}
                    </Fraco>
                  </View>
                  <Barra valor={m.taxa} altura={4} />
                </View>
              ))}
            </Card>

            <Card className="gap-1">
              <Rotulo>Atividade</Rotulo>
              <Fraco>{dias.length} dias com pelo menos uma resposta registrada.</Fraco>
            </Card>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

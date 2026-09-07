import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Bookmark } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Botao } from "@/components/Botao";
import { Card } from "@/components/Card";
import { QuestaoView } from "@/components/QuestaoView";
import { Fraco, Rotulo, Titulo, Txt } from "@/components/Texto";
import { useTema } from "@/theme/ThemeProvider";
import { useSessao } from "@/lib/hooks/useSessao";
import { useMarcadas } from "@/lib/hooks/useMarcadas";
import { useConcurso } from "@/store/concurso";
import { useMontarSessao, type ModoSessao } from "@/lib/hooks/useMontarSessao";
import type { Contexto, Questao } from "@/types/questao";

// Cada modo de estudo vira um contexto de resposta no backend.
const CONTEXTO: Record<ModoSessao, Contexto> = {
  flash: "FLASH",
  simulado: "SIMULADO",
  topico: "TOPICO",
  revisar: "ESTUDO",
};

export default function Sessao() {
  const { modo = "flash", materia, assunto } = useLocalSearchParams<{
    modo?: ModoSessao;
    materia?: string;
    assunto?: string;
  }>();
  const { hex } = useTema();
  const montar = useMontarSessao();

  const [questoes, setQuestoes] = useState<Questao[] | null>(null);

  useEffect(() => {
    (async () => {
      if (modo === "flash") setQuestoes(await montar.flash());
      else if (modo === "simulado") setQuestoes(await montar.simulado());
      else if (modo === "revisar") setQuestoes(await montar.revisar());
      else
        setQuestoes(
          montar.topico({
            materia,
            assunto,
            quantidade: 10,
            // Filtrando por matéria, incluir as já respondidas evita a tela vazia
            // numa matéria que o usuário já percorreu inteira.
            incluirRespondidas: Boolean(materia || assunto),
            priorizarErradas: true,
          })
        );
    })();
    // Monta uma única vez por modo; remontar a cada render sortearia questões novas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modo, materia, assunto]);

  if (questoes === null) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator color={hex.accent} />
      </View>
    );
  }

  if (questoes.length === 0) {
    return (
      <View className="flex-1 justify-center p-4">
        <Card className="gap-3">
          <Titulo>Nada para responder</Titulo>
          <Fraco>{montar.erro ?? "Não há questões disponíveis para este modo agora."}</Fraco>
          <Botao titulo="Voltar" variante="contorno" onPress={() => router.back()} />
        </Card>
      </View>
    );
  }

  return <Runner questoes={questoes} contexto={CONTEXTO[modo]} aviso={montar.aviso} />;
}

function Runner({
  questoes,
  contexto,
  aviso,
}: {
  questoes: Questao[];
  contexto: Contexto;
  aviso: string | null;
}) {
  const { hex } = useTema();
  // A sessão não fica dentro das abas, então não herda o inset delas: a barra de
  // progresso precisa descer abaixo da status bar por conta própria.
  const inset = useSafeAreaInsets();
  const { ativo } = useConcurso();
  const marcadas = useMarcadas(ativo?.id ?? null);
  const { estado, marcar, confirmar, avancar, abandonar } = useSessao(questoes, { contexto });

  if (estado.terminou) {
    const pct = Math.round((estado.acertos / Math.max(1, estado.respondidas)) * 100);
    return (
      <View className="flex-1 justify-center p-4">
        <Card className="gap-3">
          <Titulo>Sessão concluída</Titulo>
          <Txt className="text-[28px] font-bold">
            {estado.acertos} de {estado.respondidas}
          </Txt>
          <Fraco>{pct}% de acerto</Fraco>
          <Botao titulo="Voltar" onPress={() => router.back()} />
        </Card>
      </View>
    );
  }

  if (!estado.atual) return null;

  return (
    <View className="flex-1">
      <View
        className="flex-row items-center gap-3 border-b border-hair bg-surface px-4 pb-3"
        style={{ paddingTop: inset.top + 10 }}
      >
        <Rotulo>
          {estado.indice + 1} / {estado.questoes.length}
        </Rotulo>
        <View className="flex-1" />
        <Rotulo>{estado.segundos}s</Rotulo>
        <Rotulo>
          {estado.acertos}/{estado.respondidas}
        </Rotulo>
        <Pressable
          hitSlop={10}
          onPress={() => estado.atual && void marcadas.alternar(estado.atual.id)}
        >
          <Bookmark
            size={18}
            color={hex.accent}
            fill={estado.atual && marcadas.ids.has(estado.atual.id) ? hex.accent : "transparent"}
          />
        </Pressable>
      </View>

      {aviso && (
        <View className="px-4 pt-3">
          <Fraco style={{ color: hex.accentText }}>{aviso}</Fraco>
        </View>
      )}

      <View className="flex-1">
        <QuestaoView
          questao={estado.atual}
          marcada={estado.marcada}
          acertou={estado.acertou}
          onMarcar={marcar}
        />
      </View>

      <View
        className="gap-2 border-t border-hair bg-surface px-4 pt-4"
        style={{ paddingBottom: inset.bottom + 16 }}
      >
        {estado.acertou === null ? (
          <Botao titulo="Confirmar" onPress={() => confirmar()} disabled={estado.marcada === null} />
        ) : (
          <Botao
            titulo={estado.indice + 1 >= estado.questoes.length ? "Finalizar" : "Próxima"}
            onPress={avancar}
          />
        )}
        <Botao
          titulo="Sair da sessão"
          variante="contorno"
          onPress={() => {
            abandonar();
            router.back();
          }}
        />
      </View>
    </View>
  );
}

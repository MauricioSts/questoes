import { Pressable, ScrollView, View } from "react-native";
import type { Alternativa, Questao } from "@/types/questao";
import * as repo from "@/lib/questoesRepo";
import { useTema } from "@/theme/ThemeProvider";
import { Fraco, Rotulo, Txt } from "./Texto";

/**
 * Enunciado + alternativas. Casca funcional: o visual final vem com o design novo.
 * O que precisa continuar valendo é o comportamento — alternativa travada depois de
 * confirmar, e o gabarito só aparece com `acertou !== null`.
 */
export function QuestaoView({
  questao,
  marcada,
  acertou,
  onMarcar,
}: {
  questao: Questao;
  marcada: Alternativa | null;
  acertou: boolean | null;
  onMarcar: (a: Alternativa) => void;
}) {
  const { hex, raio } = useTema();
  const confirmado = acertou !== null;
  const textoBase = repo.getTextoBase(questao.texto_base);

  const letras = Object.keys(questao.alternativas).sort() as Alternativa[];

  function corDaAlternativa(letra: Alternativa) {
    if (!confirmado) return marcada === letra ? hex.accentBg : "transparent";
    if (letra === questao.gabarito) return hex.goodBg;
    if (letra === marcada) return hex.accentBg;
    return "transparent";
  }

  function bordaDaAlternativa(letra: Alternativa) {
    if (!confirmado) return marcada === letra ? hex.accent : hex.line;
    if (letra === questao.gabarito) return hex.goodBd;
    if (letra === marcada) return hex.accentBd;
    return hex.line;
  }

  return (
    <ScrollView contentContainerClassName="gap-3 p-4 pb-8">
      <View className="flex-row gap-2">
        <Rotulo>{questao.materia}</Rotulo>
        <Rotulo>· {questao.assunto}</Rotulo>
        <Rotulo>· {questao.dificuldade}</Rotulo>
      </View>

      {textoBase && (
        <View style={{ borderRadius: raio.sm, borderWidth: 1, borderColor: hex.line, padding: 12 }}>
          <Fraco>{textoBase}</Fraco>
        </View>
      )}

      <Txt className="text-[16px] leading-6">{questao.enunciado}</Txt>

      {questao.codigo && (
        <View style={{ borderRadius: raio.sm, backgroundColor: hex.surface2, padding: 12 }}>
          <Txt style={{ fontFamily: "monospace", fontSize: 13 }}>{questao.codigo}</Txt>
        </View>
      )}

      <View className="gap-2">
        {letras.map((letra) => (
          <Pressable key={letra} onPress={() => onMarcar(letra)} disabled={confirmado}>
            <View
              style={{
                flexDirection: "row",
                gap: 10,
                borderRadius: raio.sm,
                borderWidth: 1,
                borderColor: bordaDaAlternativa(letra),
                backgroundColor: corDaAlternativa(letra),
                padding: 12,
              }}
            >
              <Txt className="font-bold">{letra}</Txt>
              <Txt className="flex-1">{questao.alternativas[letra]}</Txt>
            </View>
          </Pressable>
        ))}
      </View>

      {confirmado && questao.explicacao ? (
        <View style={{ borderRadius: raio.sm, borderWidth: 1, borderColor: hex.line, padding: 12, gap: 6 }}>
          <Rotulo>{acertou ? "Você acertou" : `Resposta certa: ${questao.gabarito}`}</Rotulo>
          <Fraco>{questao.explicacao}</Fraco>
        </View>
      ) : null}
    </ScrollView>
  );
}

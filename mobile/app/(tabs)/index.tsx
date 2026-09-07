import { ActivityIndicator, RefreshControl, ScrollView, View } from "react-native";
import { router } from "expo-router";
import { Flame, Target, TrendingUp } from "lucide-react-native";
import { Cabecalho } from "@/components/Cabecalho";
import { Card } from "@/components/Card";
import { ProgressRing } from "@/components/ProgressRing";
import { Botao } from "@/components/Botao";
import { Fraco, Rotulo, Titulo, Txt } from "@/components/Texto";
import { useTema } from "@/theme/ThemeProvider";
import { useAuth } from "@/store/auth";
import { useConcurso } from "@/store/concurso";
import { useProgresso } from "@/lib/hooks/useProgresso";

function Metrica({ icone: Icone, valor, rotulo }: { icone: typeof Flame; valor: string; rotulo: string }) {
  const { hex } = useTema();
  return (
    <Card className="flex-1 items-center gap-1 p-3">
      <Icone size={18} color={hex.accent} />
      <Txt className="text-[19px] font-bold">{valor}</Txt>
      <Rotulo>{rotulo}</Rotulo>
    </Card>
  );
}

export default function Inicio() {
  const { hex } = useTema();
  const { usuario } = useAuth();
  const { ativo, concursos, carregando: carregandoConcursos } = useConcurso();
  const { dados, carregando, erro, recarregar } = useProgresso(ativo?.id ?? null);

  // Percentual de acerto do dia: sobre as respondidas de hoje, não sobre a meta.
  const pctAcerto =
    dados && dados.respondidasHoje > 0
      ? Math.round((dados.acertosHoje / dados.respondidasHoje) * 100)
      : 0;

  return (
    <View className="flex-1">
      <Cabecalho titulo={ativo ? ativo.iniciais : "Início"} />
      <ScrollView
        contentContainerClassName="gap-3 p-4 pb-8"
        refreshControl={
          <RefreshControl refreshing={carregando} onRefresh={recarregar} tintColor={hex.accent} />
        }
      >
        {erro && (
          <Card>
            <Txt style={{ color: hex.accentText }}>{erro}</Txt>
            <Fraco>Puxe para baixo para tentar de novo.</Fraco>
          </Card>
        )}

        <Card className="flex-row items-center gap-4">
          <ProgressRing feito={dados?.respondidasHoje ?? 0} meta={dados?.meta ?? 0} />
          <View className="flex-1 gap-1">
            <Titulo>Meta de hoje</Titulo>
            {carregando && !dados ? (
              <ActivityIndicator color={hex.accent} />
            ) : (
              <Fraco>
                {usuario ? `Olá, ${usuario.nome}.` : ""}
                {dados?.cumpriuHoje ? " Meta batida." : ""}
              </Fraco>
            )}
          </View>
        </Card>

        <View className="flex-row gap-3">
          <Metrica icone={Flame} valor={String(dados?.streak ?? 0)} rotulo="Ofensiva" />
          <Metrica icone={Target} valor={`${pctAcerto}%`} rotulo="Acertos hoje" />
          <Metrica icone={TrendingUp} valor={String(dados?.revisaoPendente ?? 0)} rotulo="A revisar" />
        </View>

        <Card className="gap-2">
          <Titulo>{ativo ? ativo.nome : "Nenhum concurso"}</Titulo>
          {carregandoConcursos && !ativo ? (
            <ActivityIndicator color={hex.accent} />
          ) : ativo ? (
            <>
              <Fraco>
                {ativo.banca} · {ativo.cargo} · {ativo.ano}
              </Fraco>
              <Fraco>
                {ativo.respondidas} de {ativo.noBanco} questões respondidas · prova em{" "}
                {ativo.diasProva} dias
              </Fraco>
            </>
          ) : (
            <Fraco>
              {concursos.length === 0
                ? "Sua conta ainda não tem concurso cadastrado."
                : "Nenhum concurso ativo."}
            </Fraco>
          )}
        </Card>

        <View className="flex-row gap-3">
          <View className="flex-1">
            <Botao titulo="Meus erros" variante="contorno" onPress={() => router.push("/erros")} />
          </View>
          <View className="flex-1">
            <Botao titulo="Marcadas" variante="contorno" onPress={() => router.push("/marcadas")} />
          </View>
        </View>

        {dados && (
          <Card className="gap-2">
            <Rotulo>Acervo</Rotulo>
            <Fraco>
              {dados.respondidasTotal} de {dados.totalQuestoes} questões distintas respondidas
              {dados.progressoTempo != null && ` · ${dados.progressoTempo}% do tempo até a prova`}
            </Fraco>
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

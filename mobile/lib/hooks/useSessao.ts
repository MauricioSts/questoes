// Motor de uma sessão de questões, sem nenhuma decisão visual.
//
// É o equivalente headless do SessionRunner do web: guarda a lista de questões, o
// cursor, a alternativa marcada e o resultado, corrige com `correcao.ts` e enfileira
// a resposta. A tela só lê `estado` e chama `marcar`, `confirmar` e `avancar`.
//
// A separação existe porque o design ainda vai mudar: trocar a interface não pode
// exigir mexer em regra de sessão.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Alternativa, Contexto, Questao } from "@/types/questao";
import { montarResultado, type ResultadoResposta } from "@/lib/correcao";
import { enviarResposta, enviarLote } from "@/lib/answers";
import { atualizarCursor, encerrarSessao, salvarSessao } from "@/lib/sessao";
import { useQuestoes } from "@/store/questoes";

export interface EstadoSessao {
  questoes: Questao[];
  indice: number;
  atual: Questao | null;
  marcada: Alternativa | null;
  /** null enquanto não confirmou; depois, se acertou. */
  acertou: boolean | null;
  respondidas: number;
  acertos: number;
  terminou: boolean;
  /** Segundos na questão atual. */
  segundos: number;
}

export interface OpcoesSessao {
  contexto: Contexto;
  /**
   * SIMULADO envia tudo de uma vez no fim (é uma prova, não estudo avulso);
   * os demais contextos enviam questão a questão, para não perder progresso
   * se o app for fechado no meio.
   */
  envioEmLote?: boolean;
}

export function useSessao(questoes: Questao[], opcoes: OpcoesSessao) {
  const { registrarResposta } = useQuestoes();
  const envioEmLote = opcoes.envioEmLote ?? opcoes.contexto === "SIMULADO";

  const [indice, setIndice] = useState(0);
  const [marcada, setMarcada] = useState<Alternativa | null>(null);
  const [acertou, setAcertou] = useState<boolean | null>(null);
  const [acertos, setAcertos] = useState(0);
  const [respondidasN, setRespondidasN] = useState(0);
  const [terminou, setTerminou] = useState(false);
  const [segundos, setSegundos] = useState(0);

  const loteRef = useRef<ResultadoResposta[]>([]);
  const inicioQuestaoRef = useRef<number>(Date.now());

  const atual = questoes[indice] ?? null;

  // Cronômetro da questão atual. Reinicia a cada troca.
  useEffect(() => {
    inicioQuestaoRef.current = Date.now();
    setSegundos(0);
    if (terminou) return;
    const t = setInterval(() => {
      setSegundos(Math.floor((Date.now() - inicioQuestaoRef.current) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, [indice, terminou]);

  // Persiste a sessão no backend para permitir retomar depois de fechar o app.
  useEffect(() => {
    if (questoes.length === 0) return;
    void salvarSessao(opcoes.contexto, questoes.map((q) => q.id), 0);
    // Só ao montar com um conjunto novo de questões.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questoes]);

  const marcar = useCallback(
    (alt: Alternativa) => {
      // Depois de confirmar, a marcação trava: reabrir mudaria a resposta já enviada.
      if (acertou !== null) return;
      setMarcada(alt);
    },
    [acertou]
  );

  const confirmar = useCallback(() => {
    if (!atual || marcada === null || acertou !== null) return;

    const tempo = Math.max(1, Math.floor((Date.now() - inicioQuestaoRef.current) / 1000));
    const resultado = montarResultado(atual, marcada, opcoes.contexto, tempo);

    setAcertou(resultado.acertou);
    setRespondidasN((n) => n + 1);
    if (resultado.acertou) setAcertos((n) => n + 1);
    registrarResposta(atual.id, resultado.acertou);

    if (envioEmLote) loteRef.current.push(resultado);
    else void enviarResposta(resultado); // a fila offline absorve a falta de rede

    return resultado;
  }, [atual, marcada, acertou, opcoes.contexto, envioEmLote, registrarResposta]);

  const avancar = useCallback(() => {
    const proximo = indice + 1;
    if (proximo >= questoes.length) {
      setTerminou(true);
      if (envioEmLote && loteRef.current.length > 0) {
        void enviarLote(loteRef.current);
        loteRef.current = [];
      }
      void encerrarSessao();
      return;
    }
    setIndice(proximo);
    setMarcada(null);
    setAcertou(null);
    void atualizarCursor(proximo);
  }, [indice, questoes.length, envioEmLote]);

  /** Sai da sessão no meio. O que já foi confirmado permanece enviado/enfileirado. */
  const abandonar = useCallback(() => {
    if (envioEmLote && loteRef.current.length > 0) {
      void enviarLote(loteRef.current);
      loteRef.current = [];
    }
    void encerrarSessao();
  }, [envioEmLote]);

  const estado = useMemo<EstadoSessao>(
    () => ({
      questoes,
      indice,
      atual,
      marcada,
      acertou,
      respondidas: respondidasN,
      acertos,
      terminou,
      segundos,
    }),
    [questoes, indice, atual, marcada, acertou, respondidasN, acertos, terminou, segundos]
  );

  return { estado, marcar, confirmar, avancar, abandonar };
}

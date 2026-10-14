// Estado da assinatura: se a conta tem acesso completo e, se não tem, quantas questões
// do limite diário já foram usadas. Recarrega quando uma resposta sincroniza, para o
// limite fechar no meio da sessão e não só depois de um F5.
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "../lib/api";
import { EVENTO_LIMITE_DIARIO, EVENTO_RESPOSTAS_SINCRONIZADAS } from "../lib/answers";

export type PlanoId = "mensal" | "anual";

export interface DadosAssinatura {
  // false = cobrança desligada no servidor: ninguém é limitado e não há o que assinar.
  pagamentosAtivos: boolean;
  premium: boolean;
  motivo: "desligado" | "admin" | "cortesia" | "assinatura" | null;
  assinatura: {
    plano: PlanoId;
    status: string;
    proximaCobranca: string | null;
    validoAte: string | null;
  } | null;
  planos: { id: PlanoId; nome: string; meses: number; valor: number }[];
  limiteGratisDia: number;
  usadasHoje: number;
  // A Batalha vale no plano gratuito só até esta data (os primeiros dias da conta).
  batalhaFreeAte: string | null;
  diasBatalhaFree: number;
}

interface AssinaturaContextValue {
  dados: DadosAssinatura | null;
  carregando: boolean;
  /** Enquanto não se sabe, vale true: travar a tela por causa de uma falha de rede seria pior. */
  premium: boolean;
  limiteAtingido: boolean;
  /** Pode jogar a Batalha: Premium, ou Free dentro do período grátis. */
  batalhaLiberada: boolean;
  /** Free dentro do período grátis: dias que faltam (arredondado para cima). null fora disso. */
  diasBatalhaRestantes: number | null;
  recarregar: () => Promise<void>;
}

const AssinaturaContext = createContext<AssinaturaContextValue | null>(null);

export function AssinaturaProvider({ children }: { children: ReactNode }) {
  const [dados, setDados] = useState<DadosAssinatura | null>(null);
  const [carregando, setCarregando] = useState(true);

  const recarregar = useCallback(async () => {
    try {
      setDados(await api<DadosAssinatura>("/assinatura"));
    } catch {
      // offline ou API fora: mantém o último estado conhecido
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void recarregar();
    const aoSincronizar = () => void recarregar();
    // O servidor recusou uma correção por limite: a contagem daqui estava atrasada.
    const eventos = [EVENTO_RESPOSTAS_SINCRONIZADAS, EVENTO_LIMITE_DIARIO];
    eventos.forEach((e) => window.addEventListener(e, aoSincronizar));
    return () => eventos.forEach((e) => window.removeEventListener(e, aoSincronizar));
  }, [recarregar]);

  const premium = dados?.premium ?? true;
  const limiteAtingido = !!dados && !dados.premium && dados.usadasHoje >= dados.limiteGratisDia;
  const msBatalha = dados?.batalhaFreeAte ? new Date(dados.batalhaFreeAte).getTime() - Date.now() : 0;
  const batalhaLiberada = premium || msBatalha > 0;
  const diasBatalhaRestantes = !premium && msBatalha > 0 ? Math.ceil(msBatalha / 86_400_000) : null;

  return (
    <AssinaturaContext.Provider value={{ dados, carregando, premium, limiteAtingido, batalhaLiberada, diasBatalhaRestantes, recarregar }}>
      {children}
    </AssinaturaContext.Provider>
  );
}

export function useAssinatura() {
  const ctx = useContext(AssinaturaContext);
  if (!ctx) throw new Error("useAssinatura deve ser usado dentro de AssinaturaProvider");
  return ctx;
}

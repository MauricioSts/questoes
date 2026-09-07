// Acervo do concurso ativo + o que o usuário já respondeu.
//
// Popula o `questoesRepo` (o índice em memória copiado do web), que é a única fonte
// de enunciado e gabarito no app. Estratégia cache-primeiro: o cache do SQLite entra
// já no primeiro render, e a API atualiza por cima quando responder.
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "@/lib/api";
import { carregarTudo, lerCache, type DadosCarregados } from "@/lib/questoesStore";
import * as repo from "@/lib/questoesRepo";
import { useAuth } from "./auth";
import { useConcurso } from "./concurso";

interface QuestoesContextValue {
  /** Sobe a cada troca de acervo. Serve de dependência para quem lê do repo. */
  versao: number;
  total: number;
  respondidas: Set<number>;
  erradas: Set<number>;
  carregando: boolean;
  /** true = o que está na tela veio do cache local e pode estar velho. */
  offline: boolean;
  recarregar: () => Promise<void>;
  /** Marca uma questão como respondida sem ir ao servidor (uso otimista). */
  registrarResposta: (questaoId: number, acertou: boolean) => void;
}

const Ctx = createContext<QuestoesContextValue | null>(null);

export function QuestoesProvider({ children }: { children: ReactNode }) {
  const { usuario } = useAuth();
  const { ativo } = useConcurso();

  const [versao, setVersao] = useState(0);
  const [total, setTotal] = useState(0);
  const [respondidas, setRespondidas] = useState<Set<number>>(new Set());
  const [erradas, setErradas] = useState<Set<number>>(new Set());
  const [carregando, setCarregando] = useState(false);
  const [offline, setOffline] = useState(false);

  const aplicar = useCallback((d: DadosCarregados) => {
    repo.setDados(d.questoes, d.textosBase, d.provas);
    setTotal(d.questoes.length);
    setVersao((v) => v + 1);
  }, []);

  const recarregar = useCallback(async () => {
    setCarregando(true);
    try {
      // 1) cache local, síncrono: a tela já abre com conteúdo.
      aplicar(lerCache());

      // 2) rede. As duas chamadas são independentes; uma falhar não pode
      //    derrubar a outra, senão ficar offline apagaria o histórico da tela.
      const [acervo, ids] = await Promise.allSettled([
        carregarTudo(),
        api<{ respondidas: number[]; erradas: number[] }>("/answers/ids"),
      ]);

      if (acervo.status === "fulfilled") {
        aplicar(acervo.value);
        setOffline(acervo.value.veioDoCache);
      } else {
        setOffline(true);
      }

      if (ids.status === "fulfilled") {
        setRespondidas(new Set(ids.value.respondidas));
        setErradas(new Set(ids.value.erradas));
      }
    } finally {
      setCarregando(false);
    }
  }, [aplicar]);

  useEffect(() => {
    if (!usuario) {
      repo.setDados([], {}, {});
      setTotal(0);
      setRespondidas(new Set());
      setErradas(new Set());
      return;
    }
    void recarregar();
    // `ativo?.id` na dependência: trocar de concurso troca o acervo inteiro.
  }, [usuario, ativo?.id, recarregar]);

  const registrarResposta = useCallback((questaoId: number, acertou: boolean) => {
    setRespondidas((s) => new Set(s).add(questaoId));
    setErradas((s) => {
      const n = new Set(s);
      if (acertou) n.delete(questaoId);
      else n.add(questaoId);
      return n;
    });
  }, []);

  return (
    <Ctx.Provider
      value={{ versao, total, respondidas, erradas, carregando, offline, recarregar, registrarResposta }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useQuestoes(): QuestoesContextValue {
  const c = useContext(Ctx);
  if (!c) throw new Error("useQuestoes fora do QuestoesProvider");
  return c;
}

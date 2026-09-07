// Anotação por questão. Texto vazio apaga a nota (regra do backend, não do cliente).
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

export interface Nota {
  questaoId: number;
  texto: string;
  updatedAt: string;
}

/** Lista completa de anotações do usuário. */
export function useNotas(concursoId: string | null) {
  const [notas, setNotas] = useState<Nota[]>([]);
  const [carregando, setCarregando] = useState(true);

  const recarregar = useCallback(async () => {
    setCarregando(true);
    try {
      const r = await api<{ notas: Nota[] }>("/notes");
      setNotas(r.notas);
    } catch {
      // mantém o que já estava na tela
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void recarregar();
  }, [recarregar, concursoId]);

  return { notas, carregando, recarregar };
}

/** Anotação de UMA questão, para editar dentro da sessão. */
export function useNotaDaQuestao(questaoId: number | null) {
  const [texto, setTexto] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (questaoId == null) {
      setTexto("");
      return;
    }
    let cancelado = false;
    setCarregando(true);
    api<{ nota: Nota | null }>(`/notes/${questaoId}`)
      .then((r) => {
        // Sem esta guarda, trocar de questão rápido faria a resposta da questão
        // anterior sobrescrever o texto da atual.
        if (!cancelado) setTexto(r.nota?.texto ?? "");
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelado) setCarregando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [questaoId]);

  const salvar = useCallback(async () => {
    if (questaoId == null) return;
    setSalvando(true);
    try {
      await api(`/notes/${questaoId}`, { method: "PUT", body: { texto } });
    } finally {
      setSalvando(false);
    }
  }, [questaoId, texto]);

  return { texto, setTexto, salvar, salvando, carregando };
}

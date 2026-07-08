// Lê/salva a anotação de uma questão (uma por questão por usuário).
import { useEffect, useState, useCallback } from "react";
import { api } from "../lib/api";

interface NotaResp {
  nota: { texto: string } | null;
}

export function useNota(questaoId: number | null) {
  const [texto, setTexto] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (questaoId == null) return;
    setCarregando(true);
    api<NotaResp>(`/notes/${questaoId}`)
      .then((d) => setTexto(d.nota?.texto ?? ""))
      .catch(() => setTexto(""))
      .finally(() => setCarregando(false));
  }, [questaoId]);

  const salvar = useCallback(
    async (novo: string) => {
      if (questaoId == null) return;
      setSalvando(true);
      try {
        await api(`/notes/${questaoId}`, { method: "PUT", body: { texto: novo } });
      } finally {
        setSalvando(false);
      }
    },
    [questaoId]
  );

  return { texto, setTexto, carregando, salvando, salvar };
}

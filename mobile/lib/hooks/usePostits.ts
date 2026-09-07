// Post-its do quadro da Home (StickyBoard do web).
//
// Só os dados: posição, texto e cor. O arrasto em si é da tela — no mobile vai ser
// gesture-handler + Reanimated (SDD §6.7), e o `mover` daqui é o que a tela chama
// quando o dedo solta.
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

export type CorPostit = "amber" | "sage" | "rose" | "slate";

export interface PostIt {
  id: string;
  x: number;
  y: number;
  texto: string;
  cor: CorPostit;
}

export function usePostits(concursoId: string | null) {
  const [postits, setPostits] = useState<PostIt[]>([]);
  const [carregando, setCarregando] = useState(false);

  // Um timer por post-it: mover dois ao mesmo tempo não pode cancelar o debounce do outro.
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const recarregar = useCallback(async () => {
    if (!concursoId) {
      setPostits([]);
      return;
    }
    setCarregando(true);
    try {
      const r = await api<{ postits: PostIt[] }>(`/postits?concursoId=${concursoId}`);
      setPostits(r.postits);
    } catch {
      // mantém o quadro atual
    } finally {
      setCarregando(false);
    }
  }, [concursoId]);

  useEffect(() => {
    void recarregar();
  }, [recarregar]);

  // Limpa os timers pendentes ao desmontar, senão um PATCH dispara para uma tela morta.
  useEffect(() => {
    const mapa = timers.current;
    return () => {
      for (const t of mapa.values()) clearTimeout(t);
      mapa.clear();
    };
  }, []);

  const criar = useCallback(async () => {
    if (!concursoId) return;
    const r = await api<{ postit: PostIt }>("/postits", {
      method: "POST",
      body: { concursoId, x: 0, y: 0, texto: "", cor: "amber" },
    });
    setPostits((p) => [...p, r.postit]);
    return r.postit;
  }, [concursoId]);

  /** Aplica local na hora e persiste com debounce — arrastar gera dezenas de eventos. */
  const atualizar = useCallback((id: string, campos: Partial<Omit<PostIt, "id">>, atrasoMs = 500) => {
    setPostits((p) => p.map((x) => (x.id === id ? { ...x, ...campos } : x)));

    const anterior = timers.current.get(id);
    if (anterior) clearTimeout(anterior);

    timers.current.set(
      id,
      setTimeout(() => {
        timers.current.delete(id);
        void api(`/postits/${id}`, { method: "PATCH", body: campos }).catch(() => {});
      }, atrasoMs)
    );
  }, []);

  const remover = useCallback(async (id: string) => {
    const anterior = timers.current.get(id);
    if (anterior) {
      // Sem isto, um PATCH atrasado chegaria depois do DELETE e recriaria nada —
      // mas erraria no servidor e sujaria o log.
      clearTimeout(anterior);
      timers.current.delete(id);
    }
    setPostits((p) => p.filter((x) => x.id !== id));
    await api(`/postits/${id}`, { method: "DELETE" }).catch(() => {});
  }, []);

  return { postits, criar, atualizar, remover, carregando, recarregar };
}

// Discursivas da trilha (prova discursiva do TJPB): temas cadastrados por trilha, e as
// tentativas do usuário em cada um, com a nota que ele mesmo se dá (autoavaliação pelo
// padrão de resposta, que só aparece depois da primeira tentativa).
import { api } from "./api";

export interface Discursiva {
  id: string;
  trilhaId: string;
  enunciado: string;
  padraoResposta: string | null; // null até a 1ª tentativa
  maxLinhas: number;
  caracteresPorLinha: number;
  valor: number;
  ordem: number;
}

export interface TentativaDiscursiva {
  id: string;
  texto: string;
  nota: number | null;
  createdAt: string;
}

// Linhas que o texto ocupa na folha: cada parágrafo (separado por \n) começa numa linha
// nova e quebra a cada `porLinha` caracteres. Parágrafo vazio (linha em branco) conta 1.
export function contarLinhas(texto: string, porLinha: number): number {
  if (!texto) return 0;
  const n = Math.max(1, porLinha);
  return texto.split("\n").reduce((s, p) => s + Math.max(1, Math.ceil(p.length / n)), 0);
}

export const listarDiscursivas = (trilhaId: string) =>
  api<{ discursivas: Discursiva[] }>(`/discursivas?trilhaId=${encodeURIComponent(trilhaId)}`).then((r) =>
    [...(r.discursivas ?? [])].sort((a, b) => a.ordem - b.ordem)
  );

export const listarTentativas = (id: string) =>
  api<{ tentativas: TentativaDiscursiva[] }>(`/discursivas/${encodeURIComponent(id)}/tentativas`).then((r) => r.tentativas ?? []);

export const enviarTentativa = (id: string, texto: string, nota?: number) =>
  api<{ tentativa: TentativaDiscursiva }>(`/discursivas/${encodeURIComponent(id)}/tentativas`, {
    method: "POST",
    body: nota == null ? { texto } : { texto, nota },
  }).then((r) => r.tentativa);

export const darNota = (tentativaId: string, nota: number) =>
  api<{ tentativa: TentativaDiscursiva }>(`/discursivas/tentativas/${encodeURIComponent(tentativaId)}`, {
    method: "PATCH",
    body: { nota },
  }).then((r) => r.tentativa);

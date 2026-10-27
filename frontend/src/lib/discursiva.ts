// Discursivas da trilha (prova discursiva do TJPB): temas cadastrados por trilha, e as
// tentativas do usuário em cada um, com a nota que ele mesmo se dá (autoavaliação pelo
// padrão de resposta, que só aparece depois da primeira tentativa). Os temas de lote
// abrem um por terça; o próximo da fila pode ser adiantado. A resposta pode ser digitada
// ou a foto da folha escrita à mão.
import { api } from "./api";

export interface Discursiva {
  id: string;
  trilhaId: string;
  titulo?: string | null;
  enunciado: string;
  padraoResposta: string | null; // null até a 1ª tentativa
  temPadrao?: boolean; // false: tema sem padrão de resposta (correção feita fora)
  maxLinhas: number;
  caracteresPorLinha: number;
  valor: number;
  ordem: number;
  liberaEm?: string | null; // terça em que abre (null = sempre esteve aberto)
  tentativas?: number; // quantas o usuário já fez
}

// O próximo tema da fila: só o título e a data, o enunciado vem ao adiantar.
export interface ProximaDiscursiva {
  id: string;
  titulo: string | null;
  liberaEm: string;
}

export type OrigemTentativa = "TREINO" | "SIMULADO";

export interface TentativaDiscursiva {
  id: string;
  texto: string;
  nota: number | null;
  origem?: OrigemTentativa;
  fotos?: string[]; // ids das fotos da folha
  createdAt: string;
  linhas?: number; // contadas pelo servidor
}

// Linhas que o texto ocupa na folha: cada parágrafo (separado por \n) começa numa linha
// nova e quebra a cada `porLinha` caracteres. Parágrafo vazio (linha em branco) conta 1.
// Um Enter solto no fim não abre linha: o cursor parado ali não ocupa a folha.
export function contarLinhas(bruto: string, porLinha: number): number {
  const texto = bruto.replace(/\n$/, "");
  if (!texto) return 0;
  const n = Math.max(1, porLinha);
  return texto.split("\n").reduce((s, p) => s + Math.max(1, Math.ceil(p.length / n)), 0);
}

export interface ListaDiscursivas {
  discursivas: Discursiva[];
  proxima: ProximaDiscursiva | null;
  restantes: number; // temas agendados depois do próximo
}

export const listarDiscursivas = (trilhaId: string): Promise<ListaDiscursivas> =>
  api<Partial<ListaDiscursivas>>(`/discursivas?trilhaId=${encodeURIComponent(trilhaId)}`).then((r) => ({
    discursivas: [...(r.discursivas ?? [])].sort((a, b) => a.ordem - b.ordem),
    proxima: r.proxima ?? null,
    restantes: r.restantes ?? 0,
  }));

// O tema inteiro (adiantar o próximo da fila).
export const buscarDiscursiva = (id: string) =>
  api<{ discursiva: Discursiva }>(`/discursivas/${encodeURIComponent(id)}`).then((r) => r.discursiva);

// Tema para o simulado: o aberto mais recente ainda não feito; sem nenhum, o próximo da
// fila (adiantado); sem fila, o aberto mais recente mesmo que já feito.
export async function temaParaSimulado(trilhaId: string): Promise<Discursiva | null> {
  const { discursivas, proxima } = await listarDiscursivas(trilhaId);
  const recentes = [...discursivas].reverse();
  const naoFeita = recentes.find((d) => !d.tentativas);
  if (naoFeita) return naoFeita;
  if (proxima) return buscarDiscursiva(proxima.id);
  return recentes[0] ?? null;
}

// As tentativas e o padrão de resposta (null até a 1ª tentativa).
export const listarTentativas = (id: string) =>
  api<{ tentativas: TentativaDiscursiva[]; padraoResposta?: string | null }>(
    `/discursivas/${encodeURIComponent(id)}/tentativas`
  ).then((r) => ({ tentativas: r.tentativas ?? [], padraoResposta: r.padraoResposta ?? null }));

// 201 com a tentativa e o padrão de resposta, que abre com ela.
export const enviarTentativa = (
  id: string,
  texto: string,
  nota?: number,
  extra: { comFoto?: boolean; origem?: OrigemTentativa } = {}
) =>
  api<{ tentativa: TentativaDiscursiva; padraoResposta?: string | null }>(`/discursivas/${encodeURIComponent(id)}/tentativas`, {
    method: "POST",
    body: { texto, ...(nota == null ? {} : { nota }), ...extra },
  }).then((r) => ({ tentativa: r.tentativa, padraoResposta: r.padraoResposta ?? null }));

// Grava a tentativa e sobe as fotos, uma por vez. Se alguma foto falhar, a tentativa é
// desfeita: sem isso ficaria uma entrega vazia no histórico.
export async function entregarResposta(
  id: string,
  { texto, nota, fotos, origem }: { texto: string; nota?: number; fotos: Blob[]; origem?: OrigemTentativa }
) {
  const r = await enviarTentativa(id, texto, nota, { comFoto: fotos.length > 0, origem });
  const ids: string[] = [];
  try {
    for (const f of fotos) ids.push(await enviarFoto(r.tentativa.id, f));
  } catch (e) {
    await apagarTentativa(r.tentativa.id).catch(() => {});
    throw e;
  }
  return { ...r, tentativa: { ...r.tentativa, fotos: ids } };
}

export const enviarFoto = (tentativaId: string, foto: Blob) =>
  api<{ foto: string }>(`/discursivas/tentativas/${encodeURIComponent(tentativaId)}/fotos`, {
    method: "POST",
    arquivo: foto,
  }).then((r) => r.foto);

export const apagarTentativa = (tentativaId: string) =>
  api<void>(`/discursivas/tentativas/${encodeURIComponent(tentativaId)}`, { method: "DELETE" });

// A foto vem com login (não dá para pôr a URL direto no <img>): baixa como Blob.
export const baixarFoto = (fotoId: string) => api<Blob>(`/discursivas/fotos/${encodeURIComponent(fotoId)}`, { blob: true });

// Foto de celular tem 3–12 MB: reduz o lado maior para 2000 px e regrava em JPEG, o que
// deixa a folha legível com algumas centenas de KB. Se o navegador não decodificar o
// formato (HEIC fora do Safari), manda o arquivo como está e o servidor decide.
export async function comprimirFoto(arquivo: File, ladoMax = 2000, qualidade = 0.82): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(arquivo, { imageOrientation: "from-image" });
    const escala = Math.min(1, ladoMax / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * escala);
    canvas.height = Math.round(bmp.height * escala);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    bmp.close();
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", qualidade));
    return blob ?? arquivo;
  } catch {
    return arquivo;
  }
}

export const darNota = (tentativaId: string, nota: number | null) =>
  api<{ tentativa: TentativaDiscursiva }>(`/discursivas/tentativas/${encodeURIComponent(tentativaId)}`, {
    method: "PATCH",
    body: { nota },
  }).then((r) => r.tentativa);

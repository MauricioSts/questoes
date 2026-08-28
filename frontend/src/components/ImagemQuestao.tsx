// Figura de uma questão. A imagem já chega embutida no lote como data URI, então o src
// é usado direto: sem fetch, sem pasta de estáticos. Clicar amplia num lightbox próprio
// (diagramas BPMN e prints de tela ficam ilegíveis no mobile no tamanho do cartão).
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ImageOff, X } from "lucide-react";
import type { ImagemQuestao as DadosImagem } from "../types/questao";

// Fundo branco fixo (não tematizado) porque os diagramas têm fundo transparente e
// traço escuro: nos temas Fantasy/Cyberpunk eles somem contra a superfície.
const MOLDURA = "rounded-xl border border-hair p-3";

export function ImagemQuestao({ imagem }: { imagem: DadosImagem }) {
  const [quebrada, setQuebrada] = useState(false);
  const [ampliada, setAmpliada] = useState(false);

  // ESC fecha; enquanto ampliada, trava o scroll do fundo.
  useEffect(() => {
    if (!ampliada) return;
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAmpliada(false);
    };
    window.addEventListener("keydown", aoTeclar);
    const overflowAntes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", aoTeclar);
      document.body.style.overflow = overflowAntes;
    };
  }, [ampliada]);

  // data URI corrompido: avisa sem derrubar o resto da questão.
  if (quebrada) {
    return (
      <figure className={`${MOLDURA} flex items-center gap-3 bg-surface2 text-muted`}>
        <ImageOff size={20} strokeWidth={1.5} className="flex-shrink-0" />
        <figcaption className="text-xs leading-relaxed">
          Não foi possível carregar a imagem: <span className="font-semibold">{imagem.legenda}</span>
        </figcaption>
      </figure>
    );
  }

  return (
    <>
      <figure className="space-y-2">
        <button
          type="button"
          onClick={() => setAmpliada(true)}
          className={`tap block w-full bg-white ${MOLDURA} transition hover:border-brand-400`}
          title="Clique para ampliar"
          aria-label={`Ampliar imagem: ${imagem.legenda}`}
        >
          <img
            src={imagem.dados}
            alt={imagem.legenda}
            onError={() => setQuebrada(true)}
            className="mx-auto h-auto max-w-full"
          />
        </button>
        <figcaption className="text-center text-xs leading-relaxed text-muted">{imagem.legenda}</figcaption>
      </figure>

      {/* Lightbox: vai no body via portal porque os containers da sessão animam com
          transform (que vira bloco de contenção e prenderia o position: fixed). */}
      {ampliada &&
        createPortal(
          <div
            className="fixed inset-0 z-[60] grid place-items-center bg-black/80 p-4"
            onClick={() => setAmpliada(false)}
            role="dialog"
            aria-modal="true"
            aria-label={imagem.legenda}
          >
            <button
              type="button"
              onClick={() => setAmpliada(false)}
              className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-white transition hover:bg-white/25"
              aria-label="Fechar"
            >
              <X size={22} strokeWidth={2} />
            </button>
            <figure className="max-h-full space-y-3" onClick={(e) => e.stopPropagation()}>
              <img
                src={imagem.dados}
                alt={imagem.legenda}
                className="mx-auto max-h-[80vh] max-w-full rounded-xl bg-white p-3"
              />
              <figcaption className="text-center text-xs text-white/80">{imagem.legenda}</figcaption>
            </figure>
          </div>,
          document.body
        )}
    </>
  );
}

// Lista de figuras de uma posição da questão. Devolve null quando não há nenhuma,
// que é o caso da esmagadora maioria das questões.
export function ImagensQuestao({
  imagens,
  posicao,
}: {
  imagens: DadosImagem[] | undefined;
  posicao: DadosImagem["posicao"];
}) {
  const daPosicao = (imagens ?? []).filter((img) => img.posicao === posicao);
  if (daPosicao.length === 0) return null;
  return (
    <div className="space-y-4">
      {daPosicao.map((img, i) => (
        <ImagemQuestao key={`${img.arquivo}-${i}`} imagem={img} />
      ))}
    </div>
  );
}

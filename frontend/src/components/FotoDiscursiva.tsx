// Foto da folha de uma tentativa. A imagem só sai com login, então é baixada como Blob e
// mostrada por object URL; um toque abre em tela cheia.
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { baixarFoto } from "../lib/discursiva";

export function FotoDiscursiva({ id, rotulo }: { id: string; rotulo: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [falhou, setFalhou] = useState(false);
  const [aberta, setAberta] = useState(false);

  useEffect(() => {
    let vivo = true;
    let criada: string | null = null;
    baixarFoto(id)
      .then((b) => {
        if (!vivo) return;
        criada = URL.createObjectURL(b);
        setUrl(criada);
      })
      .catch(() => vivo && setFalhou(true));
    return () => {
      vivo = false;
      if (criada) URL.revokeObjectURL(criada);
    };
  }, [id]);

  useEffect(() => {
    if (!aberta) return;
    const fechar = (e: KeyboardEvent) => e.key === "Escape" && setAberta(false);
    window.addEventListener("keydown", fechar);
    return () => window.removeEventListener("keydown", fechar);
  }, [aberta]);

  if (falhou) {
    return <div className="flex aspect-[3/4] items-center justify-center rounded-xl border border-hair p-3 text-center text-xs text-faint">Não deu para carregar a foto</div>;
  }
  if (!url) return <div className="aspect-[3/4] animate-pulse rounded-xl border border-hair" />;

  return (
    <>
      <button onClick={() => setAberta(true)} className="block w-full overflow-hidden rounded-xl border border-hair" aria-label={`Ampliar ${rotulo}`}>
        <img src={url} alt={rotulo} className="block aspect-[3/4] w-full object-cover" />
      </button>
      {aberta &&
        createPortal(
          <div
            role="dialog"
            aria-label={rotulo}
            onClick={() => setAberta(false)}
            className="fixed inset-0 z-[100] flex items-center justify-center p-3"
            style={{ background: "rgba(0,0,0,.88)" }}
          >
            <img src={url} alt={rotulo} className="max-h-full max-w-full object-contain" />
            <button
              onClick={() => setAberta(false)}
              aria-label="Fechar"
              className="absolute right-3 top-3 rounded-full p-2 text-white"
              style={{ background: "rgba(255,255,255,.15)" }}
            >
              <X size={20} />
            </button>
          </div>,
          document.body
        )}
    </>
  );
}

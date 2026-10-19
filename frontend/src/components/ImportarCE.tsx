// Importação de lote certo/errado (docs/formato-lote-ce.md). A validação mora no servidor
// (POST /questoes/import-ce?simular=1): a tela só mostra o relatório e confirma.
import { useEffect, useState } from "react";
import { CircleCheck, CircleX, TriangleAlert } from "lucide-react";
import { api, ApiError } from "../lib/api";
import { Spinner } from "./Spinner";

interface Relatorio {
  ok: boolean;
  simulado: boolean;
  erros: string[];
  avisos: string[];
  itens: number;
  comandos: number;
  certos: number;
  pendencias: Record<string, number>;
  faixaFinal: [number, number];
  deslocamento: number;
  proximoIdLivre: number;
  adicionadas?: number;
}

const MOTIVOS: Record<string, string> = {
  anulado: "anulados",
  sem_gabarito: "sem gabarito",
  depende_de_figura: "dependem de figura",
  ilegivel: "ilegíveis",
  fora_do_edital: "fora do edital",
};

export function ImportarCE({
  lote,
  nomeArquivo,
  concursoId,
  onImportado,
}: {
  lote: unknown;
  nomeArquivo: string;
  concursoId: string;
  onImportado: () => Promise<void>;
}) {
  const [relatorio, setRelatorio] = useState<Relatorio | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(simular: boolean) {
    setErro(null);
    setEnviando(true);
    try {
      const r = await api<Relatorio>(`/questoes/import-ce${simular ? "?simular=1" : ""}`, {
        method: "POST",
        body: { lote, concursoId },
      });
      setRelatorio(r);
      if (!simular && r.ok) await onImportado();
    } catch (e) {
      const corpo = e instanceof ApiError ? (e.body as Partial<Relatorio> | undefined) : undefined;
      if (corpo?.erros) setRelatorio(corpo as Relatorio);
      else setErro(e instanceof Error ? e.message : "Falha ao falar com o servidor.");
    } finally {
      setEnviando(false);
    }
  }

  useEffect(() => {
    void enviar(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lote]);

  const importado = relatorio && !relatorio.simulado && relatorio.ok;

  return (
    <div className="card space-y-3 p-4 text-sm">
      <p className="font-semibold">{nomeArquivo} · certo/errado</p>
      {enviando && !relatorio && (
        <p className="inline-flex items-center gap-2 text-muted"><Spinner tamanho={16} className="" />Validando no servidor…</p>
      )}
      {erro && <p className="text-erro">{erro}</p>}

      {relatorio && (
        <>
          <p>
            {relatorio.itens} itens em {relatorio.comandos} comandos · IDs {relatorio.faixaFinal[0]} a {relatorio.faixaFinal[1]}
            {relatorio.deslocamento > 0 && <> (renumerados +{relatorio.deslocamento})</>} ·{" "}
            {relatorio.itens ? Math.round((100 * relatorio.certos) / relatorio.itens) : 0}% C
          </p>
          {Object.keys(relatorio.pendencias).length > 0 && (
            <p className="text-muted">
              Ficaram de fora:{" "}
              {Object.entries(relatorio.pendencias).map(([m, n]) => `${n} ${MOTIVOS[m] ?? m}`).join(", ")}.
            </p>
          )}

          {relatorio.erros.length > 0 ? (
            <div className="space-y-1 text-erro">
              <p className="flex items-center gap-2 font-semibold"><CircleX size={16} className="flex-shrink-0" /> {relatorio.erros.length} erro(s). Corrija antes de importar:</p>
              <ul className="list-disc space-y-0.5 pl-5">
                {relatorio.erros.slice(0, 30).map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          ) : importado ? (
            <p className="flex items-center gap-2 font-semibold text-acerto"><CircleCheck size={16} /> {relatorio.adicionadas} itens importados. Próximo id livre: {relatorio.proximoIdLivre}.</p>
          ) : (
            <p className="flex items-center gap-2 font-semibold text-acerto"><CircleCheck size={16} /> Sem erros. Próximo id livre depois dele: {relatorio.proximoIdLivre}.</p>
          )}

          {relatorio.avisos.length > 0 && (
            <details className="text-amber-500">
              <summary className="cursor-pointer"><TriangleAlert size={16} className="mr-1.5 inline-block align-[-3px]" />{relatorio.avisos.length} aviso(s)</summary>
              <ul className="mt-1 list-disc space-y-0.5 pl-5">
                {relatorio.avisos.slice(0, 30).map((a, i) => <li key={i}>{a}</li>)}
              </ul>
            </details>
          )}

          {relatorio.erros.length === 0 && !importado && (
            <button onClick={() => void enviar(false)} disabled={enviando} className="btn-primary w-full">
              {enviando ? "Importando…" : `Importar ${relatorio.itens} itens`}
            </button>
          )}
        </>
      )}
    </div>
  );
}

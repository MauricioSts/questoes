// Comparação Free × Premium (ver lib/planos.ts).
import { Check, Minus } from "lucide-react";
import { linhasPlanos } from "../lib/planos";

function Celula({ valor, destaque }: { valor: string | boolean; destaque?: boolean }) {
  if (valor === true) return <Check size={18} strokeWidth={2.6} className={`mx-auto ${destaque ? "text-brand-500" : "text-muted"}`} aria-label="Incluso" />;
  if (valor === false) return <Minus size={18} strokeWidth={2} className="mx-auto text-faint" aria-label="Não incluso" />;
  return <span className={`text-xs font-bold ${destaque ? "text-brand-700" : "text-muted"}`}>{valor}</span>;
}

export function TabelaPlanos({ limiteGratisDia, diasBatalhaFree }: { limiteGratisDia: number; diasBatalhaFree: number }) {
  return (
    <div className="card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-hair">
            <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[.14em] text-faint">O que você ganha</th>
            <th className="w-20 px-2 py-3 text-center text-[11px] font-bold uppercase tracking-[.14em] text-faint sm:w-28">Free</th>
            <th className="w-20 bg-brand-100/60 px-2 py-3 text-center text-[11px] font-bold uppercase tracking-[.14em] text-brand-700 sm:w-28">Premium</th>
          </tr>
        </thead>
        <tbody>
          {linhasPlanos(limiteGratisDia, diasBatalhaFree).map((l) => (
            <tr key={l.recurso} className="border-b border-hair/60 last:border-0">
              <td className="px-4 py-3">
                <span className="font-semibold text-brand-ink">{l.recurso}</span>
                {l.detalhe && <span className="mt-0.5 block text-xs text-faint">{l.detalhe}</span>}
              </td>
              <td className="px-2 py-3 text-center"><Celula valor={l.free} /></td>
              <td className="bg-brand-100/60 px-2 py-3 text-center"><Celula valor={l.premium} destaque /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

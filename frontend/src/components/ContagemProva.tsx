// Contagem regressiva até a prova oficial da trilha (perfil da prova): dias e horas até
// data_prova + horario_prova.inicio, no fuso de Brasília. Sem moldura própria — entra
// dentro do cartão de quem usa. Se o perfil avisa que o conteúdo é provisório, o aviso
// vem embaixo, discreto, com o texto do perfil.
import { useEffect, useState } from "react";
import { Info } from "lucide-react";
import type { PerfilProva } from "../lib/notaCE";
import { inicioDaProva, tempoRestante } from "../lib/contagemProva";

type PerfilContagem = Pick<PerfilProva, "data_prova" | "horario_prova" | "aviso_conteudo_provisorio">;

export function ContagemProva({ perfil, className = "" }: { perfil: PerfilContagem; className?: string }) {
  const alvo = inicioDaProva(perfil);
  // Relógio de minuto em minuto: a contagem mostra horas, não segundos.
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setAgora(Date.now()), 60_000);
    return () => window.clearInterval(t);
  }, []);
  if (alvo == null) return null;

  const r = tempoRestante(alvo, agora);
  const quando = new Date(alvo).toLocaleString("pt-BR", {
    timeZone: perfil.horario_prova?.fuso ?? "America/Sao_Paulo",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className={className}>
      {r.passou ? (
        <p className="font-display text-[28px] font-bold leading-none text-brand-ink">Dia de prova</p>
      ) : (
        <p className="flex flex-wrap items-end gap-x-3 gap-y-1">
          <Numero valor={r.dias} rotulo={r.dias === 1 ? "dia" : "dias"} />
          <Numero valor={r.horas} rotulo={r.horas === 1 ? "hora" : "horas"} />
          {r.dias === 0 && <Numero valor={r.minutos} rotulo="min" />}
        </p>
      )}
      <p className="mt-1 text-sm text-muted">Prova: {quando} (Brasília)</p>
      {perfil.aviso_conteudo_provisorio && (
        <p className="mt-3 flex items-start gap-1.5 text-xs text-faint">
          <Info size={13} strokeWidth={2} className="mt-px flex-shrink-0" />
          <span>{perfil.aviso_conteudo_provisorio}</span>
        </p>
      )}
    </div>
  );
}

function Numero({ valor, rotulo }: { valor: number; rotulo: string }) {
  return (
    <span className="flex items-end gap-1.5">
      <span className="font-display font-bold leading-none text-brand-ink tabular-nums" style={{ fontSize: 38 }}>
        {valor}
      </span>
      <span className="pb-1 text-sm text-muted">{rotulo}</span>
    </span>
  );
}

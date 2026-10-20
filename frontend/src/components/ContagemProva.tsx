// Contagem regressiva até a prova oficial da trilha (perfil da prova): dias e horas até
// data_prova + horario_prova.inicio, no fuso de Brasília. Sem moldura própria — entra
// dentro do cartão de quem usa. Se o perfil avisa que o conteúdo é provisório, o aviso
// vem embaixo, discreto, com o texto do perfil. Sem horário no perfil, ou depois do fim
// da prova, não desenha nada (quem usa volta para a data manual). No dia da prova (no
// fuso dela) o título vira "Hoje é dia de prova", com as horas até o início embaixo.
import { Info } from "lucide-react";
import type { PerfilProva } from "../lib/notaCE";
import { contagemOficial, diasCorridos, rotuloFuso, tempoRestante } from "../lib/contagemProva";
import { useAgora } from "../hooks/useAgora";

type PerfilContagem = Pick<PerfilProva, "data_prova" | "horario_prova" | "aviso_conteudo_provisorio">;

export function ContagemProva({
  perfil,
  agora: agoraDeFora,
  className = "",
}: {
  perfil: PerfilContagem;
  // Relógio de quem usa (a Home), para a contagem e o resto da tela virarem juntos.
  agora?: number;
  className?: string;
}) {
  // Relógio de minuto em minuto: a contagem mostra horas, não segundos.
  const relogio = useAgora();
  const agora = agoraDeFora ?? relogio;
  const oficial = contagemOficial(perfil, agora);
  if (!oficial) return null;

  const r = tempoRestante(oficial.inicio, agora);
  const fuso = perfil.horario_prova?.fuso;
  const hoje = diasCorridos(perfil.data_prova ?? "", agora, fuso) === 0;
  const quando = new Date(oficial.inicio).toLocaleString("pt-BR", {
    timeZone: fuso ?? "America/Sao_Paulo",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className={className}>
      {hoje || r.passou ? (
        <>
          <p className="font-display text-[28px] font-bold leading-none text-brand-ink">Hoje é dia de prova</p>
          <p className="mt-1.5 text-sm text-muted">
            {r.passou ? "A prova já começou. Boa prova!" : r.horas === 0 && r.minutos === 0
                ? "Começa em instantes."
                : `Começa em ${r.horas > 0 ? `${r.horas} h ` : ""}${r.minutos} min.`}
          </p>
        </>
      ) : (
        <p className="flex flex-wrap items-end gap-x-3 gap-y-1">
          <Numero valor={r.dias} rotulo={r.dias === 1 ? "dia" : "dias"} />
          <Numero valor={r.horas} rotulo={r.horas === 1 ? "hora" : "horas"} />
          {r.dias === 0 && <Numero valor={r.minutos} rotulo="min" />}
        </p>
      )}
      <p className="mt-1 text-sm text-muted">Prova: {quando} ({rotuloFuso(fuso)})</p>
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

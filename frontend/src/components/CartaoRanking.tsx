// Colocação no ranking da trilha, no painel. Não é um atalho com rótulo: o painel
// existe para dizer onde você está, e a posição só vira motivação quando vem com o
// próximo passo junto ("faltam 12 acertos para passar Bruno L.").
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Crown, Trophy } from "lucide-react";
import { carregarMinhaPosicao, type MinhaPosicao } from "../lib/trilhas";
import { useConcurso } from "../store/concurso";

const num = (n: number) => n.toLocaleString("pt-BR");

export function CartaoRanking() {
  const { ativo, activeId } = useConcurso();
  const [dados, setDados] = useState<MinhaPosicao | null>(null);
  const trilhaId = ativo?.trilhaId ?? null;

  useEffect(() => {
    if (!trilhaId) return;
    let vivo = true;
    carregarMinhaPosicao(trilhaId)
      .then((d) => vivo && setDados(d))
      .catch(() => null);
    return () => {
      vivo = false;
    };
  }, [trilhaId, activeId]);

  // Concurso sem trilha (ou placar ainda carregando): o cartão não inventa número.
  const eu = dados?.eu ?? null;
  const lidera = eu != null && eu.posicao === 1;
  const faltam = dados?.acima ? Math.max(1, dados.acima.acertos - (eu?.acertos ?? 0) + 1) : 0;

  // Barra: quanto do total do adversário eu já tenho. Liderando, a barra fica cheia.
  const proporcao = lidera || !dados?.acima ? 1 : Math.min(1, (eu?.acertos ?? 0) / Math.max(1, dados.acima.acertos));

  return (
    <Link to="/ranking" className="card group relative flex h-full flex-col overflow-hidden p-5">
      {/* Faixa de progresso rumo a quem está logo acima: é o fundo do cartão, então a
          distância se lê antes do número. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 transition-[width] duration-700 ease-out"
        style={{ width: `${proporcao * 100}%`, background: "var(--accentBg)" }}
      />

      <div className="relative flex items-start gap-4">
        <div
          className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-2xl"
          style={{ background: "var(--accentBg)", color: "var(--accentText)" }}
        >
          {lidera ? <Crown size={22} strokeWidth={2} /> : <Trophy size={22} strokeWidth={2} />}
        </div>

        <div className="min-w-0 flex-1">
          <p className="legenda text-[11px] font-bold uppercase tracking-[.16em] text-faint">
            Ranking da trilha
          </p>

          {eu ? (
            <>
              <p className="mt-1 flex items-baseline gap-2 font-display font-bold leading-none text-brand-ink">
                <span className="text-[32px] tabular-nums">{eu.posicao}º</span>
                <span className="text-sm font-semibold text-muted">
                  de {num(dados!.participantes)} no placar
                </span>
              </p>
              <p className="mt-2 text-sm text-muted">
                {lidera
                  ? `Você lidera com ${num(eu.acertos)} acertos. Segure o posto.`
                  // O nome público costuma terminar em ponto ("Bruno L."), então o ponto
                  // final da frase sai fora para não virar "Bruno L..".
                  : `Faltam ${num(faltam)} ${faltam === 1 ? "acerto" : "acertos"} para passar ${dados!.acima!.nome}`}
              </p>
            </>
          ) : (
            <>
              <p className="mt-1 font-display text-xl font-bold leading-tight text-brand-ink">
                Você ainda não está no placar
              </p>
              <p className="mt-1.5 text-sm text-muted">
                Responda a primeira questão da trilha para entrar na lista.
              </p>
            </>
          )}
        </div>

        <ArrowUpRight
          size={18}
          strokeWidth={2.2}
          className="flex-shrink-0 text-faint transition group-hover:text-brand-500"
        />
      </div>
    </Link>
  );
}

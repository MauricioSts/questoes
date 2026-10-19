// Exercícios práticos de programação da trilha ativa: escrever código e rodar contra os
// testes no sandbox. Só trilhas "dev" têm exercícios; nas demais a tela explica e aponta
// para as trilhas.
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, Code2, RefreshCw } from "lucide-react";
import { useExercicios } from "../hooks/useExercicios";
import { ROTULO_LINGUAGEM, type ExercicioResumo } from "../lib/execucao";
import { Card } from "../components/Card";
import { Skeleton } from "../components/Skeleton";
import { PageHeader } from "../components/PageHeader";
import { MetaPill } from "../components/MetaPill";
import { Revelar } from "../components/Movimento";

const DIFICULDADES = ["facil", "media", "dificil"] as const;
const ROTULO_DIFICULDADE: Record<string, string> = { facil: "Fácil", media: "Média", dificil: "Difícil" };

export function PillDificuldade({ dificuldade }: { dificuldade: string }) {
  const d = (DIFICULDADES as readonly string[]).includes(dificuldade) ? dificuldade : "media";
  return (
    <MetaPill
      type={`dificuldade-${d}` as "dificuldade-facil" | "dificuldade-media" | "dificuldade-dificil"}
      label={ROTULO_DIFICULDADE[d]}
    />
  );
}

export function Exercicios() {
  const { exercicios, carregando, erro, recarregar } = useExercicios();
  const [filtro, setFiltro] = useState<string>("");

  const lista = exercicios ?? [];
  const linguagens = useMemo(() => [...new Set(lista.map((e) => e.linguagem))], [lista]);
  const visiveis = filtro ? lista.filter((e) => e.linguagem === filtro) : lista;
  const resolvidos = lista.filter((e) => e.resolvido).length;

  return (
    <div className="fadeup mx-auto max-w-[820px] pt-2">
      <PageHeader
        rotulo="Prática"
        titulo="Exercícios de código"
        subtitulo={
          lista.length > 0
            ? `Escreva o código, rode contra os testes e veja na hora o que passou. ${resolvidos} de ${lista.length} resolvidos.`
            : "Escreva o código, rode contra os testes e veja na hora o que passou."
        }
        right={
          linguagens.length > 1 ? (
            <select
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              className="filter-select !w-auto"
              aria-label="Filtrar por linguagem"
            >
              <option value="">Todas as linguagens</option>
              {linguagens.map((l) => (
                <option key={l} value={l}>
                  {ROTULO_LINGUAGEM[l] ?? l}
                </option>
              ))}
            </select>
          ) : undefined
        }
      />

      {carregando ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[84px]" />
          ))}
        </div>
      ) : erro ? (
        <Card className="p-8 text-center">
          <p className="font-display text-lg font-bold text-brand-ink">Não deu para carregar os exercícios</p>
          <p className="mx-auto mt-2 max-w-[46ch] text-sm text-faint">Confira sua conexão e tente de novo.</p>
          <button onClick={recarregar} className="btn-secondary mt-5 inline-flex items-center gap-2 text-base">
            <RefreshCw size={16} strokeWidth={2.2} /> Tentar de novo
          </button>
        </Card>
      ) : lista.length === 0 ? (
        <Card className="p-10 text-center">
          <div
            className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl"
            style={{ background: "var(--accentBg)", color: "var(--accentText)" }}
          >
            <Code2 size={26} strokeWidth={2} />
          </div>
          <p className="font-display text-xl font-bold text-brand-ink">Nenhum exercício nesta trilha</p>
          <p className="mx-auto mt-2 max-w-[48ch] text-sm text-faint">
            Os exercícios práticos de programação acompanham as trilhas de desenvolvimento. Quando
            a sua trilha tiver exercícios, eles aparecem aqui — com editor, testes e resultado na hora.
          </p>
          <Link to="/trilhas" className="btn-primary mt-6 inline-flex items-center gap-2 text-base">
            Explorar trilhas
            <ArrowRight size={18} strokeWidth={2.4} />
          </Link>
        </Card>
      ) : (
        <ul className="space-y-2.5">
          {visiveis.map((e, i) => (
            <Revelar key={e.id} atraso={Math.min(i, 6) * 0.03}>
              <li>
                <ItemExercicio e={e} />
              </li>
            </Revelar>
          ))}
        </ul>
      )}
    </div>
  );
}

function ItemExercicio({ e }: { e: ExercicioResumo }) {
  return (
    <Link to={`/exercicios/${encodeURIComponent(e.id)}`} className="block">
      <Card className="card-hover flex items-center gap-4 p-4 transition hover:border-brand-400">
        <div
          className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl"
          style={
            e.resolvido
              ? { background: "var(--goodBg)", color: "var(--goodText)" }
              : { background: "var(--accentBg)", color: "var(--accentText)" }
          }
          aria-hidden
        >
          {e.resolvido ? <CheckCircle2 size={20} strokeWidth={2.2} /> : <Code2 size={20} strokeWidth={2} />}
        </div>
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="truncate font-display text-base font-bold text-brand-ink">{e.titulo}</p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="meta-pill meta-modulo">{ROTULO_LINGUAGEM[e.linguagem] ?? e.linguagem}</span>
            <PillDificuldade dificuldade={e.dificuldade} />
            <span className="truncate text-[11px] font-semibold text-faint">{e.topico}</span>
            {e.resolvido && <span className="sr-only">resolvido</span>}
          </div>
        </div>
        <ArrowRight size={18} strokeWidth={2} className="flex-shrink-0 text-faint" aria-hidden />
      </Card>
    </Link>
  );
}

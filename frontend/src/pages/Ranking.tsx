// Ranking da trilha. O app deixou de ser de uma pessoa só: quem estuda o mesmo acervo
// agora se vê num placar. A leitura principal é ACERTOS (quantas questões a pessoa já
// acertou na trilha); a taxa fica ao lado para dizer a que custo — e tem ranking próprio,
// com volume mínimo, para não premiar quem acertou 3 de 3.
import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { CalendarDays, Crown, Flame, Swords, Target, Trophy, Users, X } from "lucide-react";
import {
  carregarPerfilRanking,
  carregarRanking,
  type PerfilRanking,
  listarTrilhas,
  type LinhaRanking,
  type RankingTrilha,
  type Trilha,
} from "../lib/trilhas";
import { PageHeader } from "../components/PageHeader";
import { Card } from "../components/Card";
import { Skeleton } from "../components/Skeleton";
import { FilterSelect } from "../components/FilterSelect";

type Criterio = "acertos" | "taxa";

// Metais do pódio. São cores fixas de propósito: medalha é medalha nos três temas, e
// o acento do tema continua reservado para "você".
const METAL = [
  { anel: "#D9A441", brilho: "rgba(217,164,65,.22)", rotulo: "Ouro" },
  { anel: "#A8B2C4", brilho: "rgba(168,178,196,.18)", rotulo: "Prata" },
  { anel: "#B0764A", brilho: "rgba(176,118,74,.18)", rotulo: "Bronze" },
];

// URLs repetidas aqui (e não importadas de lib/poke) para o ranking não puxar o motor
// da batalha para o bundle principal.
const spriteTreinador = (nome: string) => `https://play.pokemonshowdown.com/sprites/trainers/${nome}.png`;
const spritePokemon = (id: number) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/${id}.gif`;
const REGIAO = ["Kanto", "Johto", "Hoenn", "Sinnoh", "Unova"];

// Linha/cartão clicável sem virar <button> (o conteúdo tem blocos e títulos).
const clicavel = (abrir: () => void) => ({
  role: "button" as const,
  tabIndex: 0,
  onClick: abrir,
  onKeyDown: (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      abrir();
    }
  },
});

// Avatar: o treinador da Batalha Pokémon, ou as iniciais para quem nunca jogou.
function Avatar({ linha, tamanho, cor, fundo }: { linha: LinhaRanking; tamanho: number; cor: string; fundo?: string }) {
  return (
    <span
      className="grid flex-shrink-0 place-items-center overflow-hidden rounded-full border-2 font-display font-bold tabular-nums"
      style={{ height: tamanho, width: tamanho, fontSize: tamanho * 0.38, borderColor: cor, color: cor, background: fundo ?? "var(--surface2)" }}
    >
      {linha.treinador ? (
        <img src={spriteTreinador(linha.treinador)} alt="" className="h-[118%] w-[118%] max-w-none translate-y-[6%] object-contain [image-rendering:pixelated]" />
      ) : (
        linha.iniciais
      )}
    </span>
  );
}

const pct = (t: number) => Math.round(t * 100);
const num = (n: number) => n.toLocaleString("pt-BR");

// "hoje" / "ontem" / "há N dias": o placar fica mais honesto quando dá para ver quem
// ainda está estudando e quem parou faz três semanas.
function desdeUltima(iso: string | null): string {
  if (!iso) return "sem resposta";
  const dias = Math.floor((Date.now() - new Date(iso).getTime()) / 864e5);
  if (dias <= 0) return "hoje";
  if (dias === 1) return "ontem";
  if (dias < 30) return `há ${dias} dias`;
  const meses = Math.floor(dias / 30);
  return meses === 1 ? "há 1 mês" : `há ${meses} meses`;
}

export function Ranking() {
  const [trilhas, setTrilhas] = useState<Trilha[]>([]);
  const [trilhaId, setTrilhaId] = useState<string | null>(null);
  const [dados, setDados] = useState<RankingTrilha | null>(null);
  const [criterio, setCriterio] = useState<Criterio>("acertos");
  const [erro, setErro] = useState(false);
  // As barras só crescem depois da primeira pintura: largura 0 → largura real.
  const [montado, setMontado] = useState(false);
  const [aberto, setAberto] = useState<LinhaRanking | null>(null);

  useEffect(() => {
    listarTrilhas()
      .then((lista) => {
        setTrilhas(lista);
        // A trilha que o usuário segue é a que interessa; sem nenhuma, a primeira.
        setTrilhaId(lista.find((t) => t.concursoId)?.id ?? lista[0]?.id ?? null);
      })
      .catch(() => setErro(true));
  }, []);

  useEffect(() => {
    if (!trilhaId) return;
    setDados(null);
    setMontado(false);
    carregarRanking(trilhaId)
      .then((r) => {
        setDados(r);
        requestAnimationFrame(() => setMontado(true));
      })
      .catch(() => setErro(true));
  }, [trilhaId]);

  // Ranking por taxa é outra lista: só quem tem volume mínimo, reordenado e renumerado.
  const linhas = useMemo(() => {
    if (!dados) return [];
    if (criterio === "acertos") return dados.linhas;
    return [...dados.linhas]
      .filter((l) => l.elegivelTaxa)
      .sort((a, b) => b.taxa - a.taxa || b.acertos - a.acertos)
      .map((l, i) => ({ ...l, posicao: i + 1 }));
  }, [dados, criterio]);

  const foraDoCriterio = useMemo(
    () => (dados && criterio === "taxa" ? dados.linhas.filter((l) => !l.elegivelTaxa).length : 0),
    [dados, criterio]
  );

  const valorDe = (l: LinhaRanking) => (criterio === "acertos" ? l.acertos : pct(l.taxa));
  const lider = linhas.length ? valorDe(linhas[0]) : 0;
  const voce = dados ? dados.linhas.find((l) => l.userId === dados.voceId) ?? null : null;
  const voceNaLista = linhas.some((l) => l.userId === dados?.voceId);

  if (erro)
    return (
      <div className="mx-auto max-w-4xl p-6 text-center">
        <p className="font-medium text-danger-from">Não foi possível carregar o ranking.</p>
      </div>
    );

  return (
    <div className="fadeup mx-auto max-w-[900px] pt-2">
      <PageHeader
        rotulo="Comunidade"
        titulo="Ranking da trilha"
        subtitulo="Quem mais acerta no acervo que vocês estudam juntos."
        right={
          trilhas.length > 1 && trilhaId ? (
            <FilterSelect
              label=""
              value={trilhaId}
              onChange={(v) => setTrilhaId(String(v))}
              options={trilhas.map((t) => ({ value: t.id, label: t.nome }))}
              className="w-44"
            />
          ) : undefined
        }
      />

      {!dados ? (
        <div className="space-y-6">
          <Skeleton className="h-20" />
          <Skeleton className="h-44" />
          <Skeleton className="h-64" />
        </div>
      ) : (
        <>
          <CabecalhoTrilha dados={dados} />

          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <Segmentado
              valor={criterio}
              onChange={setCriterio}
              opcoes={[
                { valor: "acertos", rotulo: "Mais acertos", icone: Trophy },
                { valor: "taxa", rotulo: "Maior taxa", icone: Target },
              ]}
            />
            <p className="text-xs text-faint">
              {criterio === "acertos"
                ? "Questões acertadas na trilha, somando estudo, revisão e simulado."
                : `Acertos sobre respondidas, a partir de ${dados.volumeMinimoTaxa} questões.`}
            </p>
          </div>

          {linhas.length === 0 ? (
            <VazioRanking criterio={criterio} minimo={dados.volumeMinimoTaxa} />
          ) : (
            <div className="space-y-6">
              <Podio linhas={linhas.slice(0, 3)} criterio={criterio} voceId={dados.voceId} onAbrir={setAberto} />

              {linhas.length > 3 && (
                <ol className="space-y-2">
                  {linhas.slice(3).map((l, i) => (
                    <LinhaPlacar
                      key={l.userId}
                      linha={l}
                      criterio={criterio}
                      proporcao={lider ? valorDe(l) / lider : 0}
                      cheia={montado}
                      voce={l.userId === dados.voceId}
                      atraso={i * 45}
                      onAbrir={() => setAberto(l)}
                    />
                  ))}
                </ol>
              )}

              {foraDoCriterio > 0 && (
                <p className="text-center text-xs text-faint">
                  {foraDoCriterio === 1
                    ? "1 pessoa ainda não tem questões suficientes para o ranking por taxa."
                    : `${foraDoCriterio} pessoas ainda não têm questões suficientes para o ranking por taxa.`}
                </p>
              )}
            </div>
          )}

          <SeuLugar voce={voce} naLista={voceNaLista} criterio={criterio} minimo={dados.volumeMinimoTaxa} />
          <p className="mt-4 text-center text-xs text-faint">Toque em alguém do placar para ver o perfil e o time Pokémon.</p>
          {aberto && trilhaId && <PerfilJogador trilhaId={trilhaId} linha={aberto} onFechar={() => setAberto(null)} />}
        </>
      )}
    </div>
  );
}

// Faixa de identidade da trilha: quem está competindo, em que acervo.
function CabecalhoTrilha({ dados }: { dados: RankingTrilha }) {
  const total = dados.linhas.reduce((s, l) => s + l.acertos, 0);
  const respondidas = dados.linhas.reduce((s, l) => s + l.respondidas, 0);

  return (
    <Card className="mb-6 overflow-hidden">
      <div className="h-1.5 w-full" style={{ background: "var(--accentBd)" }} />
      <div className="flex flex-wrap items-center gap-x-8 gap-y-5 p-6">
        <div className="flex items-center gap-4">
          <span
            className="grid h-14 w-14 flex-shrink-0 place-items-center rounded-2xl border font-brand text-base font-bold"
            style={{ background: "var(--accentBg)", borderColor: "var(--accentBd)", color: "var(--accentText)" }}
          >
            {dados.trilha.iniciais}
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-xl font-bold leading-tight text-brand-ink">
              {dados.trilha.nome}: {dados.trilha.cargo}
            </h2>
            <p className="mt-0.5 text-xs text-faint">
              {dados.trilha.banca} · {dados.trilha.orgao}
            </p>
          </div>
        </div>

        <dl className="flex flex-wrap gap-x-7 gap-y-3 sm:ml-auto">
          <Resumo icone={Users} valor={num(dados.seguidores)} rotulo="na trilha" />
          <Resumo icone={Trophy} valor={num(total)} rotulo="acertos somados" />
          <Resumo icone={Flame} valor={num(respondidas)} rotulo="questões respondidas" />
        </dl>
      </div>
    </Card>
  );
}

function Resumo({ icone: Icone, valor, rotulo }: { icone: typeof Users; valor: string; rotulo: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <Icone size={17} strokeWidth={1.8} className="text-faint" />
      <div className="leading-tight">
        <dd className="font-display text-lg font-bold tabular-nums text-brand-ink">{valor}</dd>
        <dt className="text-[10px] uppercase tracking-[.12em] text-faint">{rotulo}</dt>
      </div>
    </div>
  );
}

// Pódio: os três primeiros saem da lista e viram cartões, com o primeiro colocado
// levantado meio degrau no desktop. É o único lugar da tela com cor de medalha.
function Podio({
  linhas,
  criterio,
  voceId,
  onAbrir,
}: {
  linhas: LinhaRanking[];
  criterio: Criterio;
  voceId: string;
  onAbrir: (l: LinhaRanking) => void;
}) {
  // Ordem visual clássica: 2º, 1º, 3º. No celular vira coluna na ordem real.
  const ordem = linhas.length >= 3 ? [1, 0, 2] : linhas.map((_, i) => i);

  return (
    <div className="grid gap-4 sm:grid-cols-3 sm:items-end">
      {ordem.map((idx, visual) => {
        const l = linhas[idx];
        if (!l) return null;
        const metal = METAL[idx] ?? METAL[2];
        return (
          <article
            key={l.userId}
            {...clicavel(() => onAbrir(l))}
            aria-label={`Ver perfil de ${l.userId === voceId ? "você" : l.nome}`}
            className={`card fadeup relative cursor-pointer overflow-hidden p-5 text-center transition hover:-translate-y-0.5 ${idx === 0 ? "sm:pb-7" : ""}`}
            style={{
              animationDelay: `${visual * 90}ms`,
              borderColor: l.userId === voceId ? "var(--accent)" : metal.anel,
              boxShadow: `inset 0 0 40px -28px ${metal.anel}, var(--cardGlow)`,
            }}
          >
            {/* Halo do metal atrás do avatar: dá o brilho de medalha sem pintar o cartão. */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-24"
              style={{ background: `radial-gradient(60% 100% at 50% 0%, ${metal.brilho}, transparent 70%)` }}
            />

            <div className="relative">
              <span className="mx-auto block w-fit">
                <Avatar linha={l} tamanho={idx === 0 ? 68 : 56} cor={metal.anel} />
              </span>
              {idx === 0 && (
                <Crown
                  size={20}
                  strokeWidth={2}
                  className="absolute left-1/2 top-[-12px] -translate-x-1/2"
                  style={{ color: metal.anel }}
                  aria-hidden
                />
              )}

              <p className="mt-3 truncate font-display text-base font-bold text-brand-ink">
                {l.userId === voceId ? "Você" : l.nome}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-[.14em]" style={{ color: metal.anel }}>
                {l.posicao}º · {metal.rotulo}
              </p>

              <p
                className="mt-4 font-display font-bold leading-none tabular-nums text-brand-ink"
                style={{ fontSize: idx === 0 ? 40 : 34 }}
              >
                {criterio === "acertos" ? num(l.acertos) : `${pct(l.taxa)}%`}
              </p>
              <p className="mt-1.5 text-xs text-muted">
                {criterio === "acertos"
                  ? `${pct(l.taxa)}% de acerto · ${num(l.respondidas)} questões`
                  : `${num(l.acertos)} acertos em ${num(l.respondidas)}`}
              </p>
              <p className="mt-2 text-[10px] uppercase tracking-[.12em] text-faint">
                {desdeUltima(l.ultimaResposta)}
              </p>
            </div>
          </article>
        );
      })}
    </div>
  );
}

// Do 4º em diante: linha de livro-caixa. A barra é o fundo da própria linha — o placar
// se lê de relance pelo comprimento, sem precisar comparar números.
function LinhaPlacar({
  linha,
  criterio,
  proporcao,
  cheia,
  voce,
  atraso,
  onAbrir,
}: {
  linha: LinhaRanking;
  criterio: Criterio;
  proporcao: number;
  cheia: boolean;
  voce: boolean;
  atraso: number;
  onAbrir: () => void;
}) {
  return (
    <li
      {...clicavel(onAbrir)}
      aria-label={`Ver perfil de ${voce ? "você" : linha.nome}`}
      className="card fadeup relative cursor-pointer overflow-hidden transition hover:brightness-110"
      style={{
        animationDelay: `${180 + atraso}ms`,
        borderColor: voce ? "var(--accent)" : undefined,
      }}
    >
      <div
        aria-hidden
        className="absolute inset-y-0 left-0 transition-[width] duration-700 ease-out"
        style={{
          width: cheia ? `${Math.max(3, proporcao * 100)}%` : "0%",
          background: voce ? "var(--accentBg)" : "rgb(var(--hair) / .5)",
        }}
      />

      <div className="relative flex items-center gap-4 px-4 py-3 sm:px-5">
        <span className="w-8 flex-shrink-0 font-display text-lg font-bold tabular-nums text-faint">
          {linha.posicao}
        </span>

        <Avatar linha={linha} tamanho={40} cor={voce ? "var(--accent)" : "rgb(var(--hair))"} />

        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-brand-ink">
            {voce ? "Você" : linha.nome}
            {voce && (
              <span
                className="ml-2 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[.1em]"
                style={{ borderColor: "var(--accentBd)", color: "var(--accentText)" }}
              >
                sua conta
              </span>
            )}
          </p>
          <p className="mt-0.5 text-xs text-faint">
            {num(linha.respondidas)} questões · {desdeUltima(linha.ultimaResposta)}
          </p>
        </div>

        <div className="flex-shrink-0 text-right">
          <p className="font-display text-xl font-bold leading-none tabular-nums text-brand-ink">
            {criterio === "acertos" ? num(linha.acertos) : `${pct(linha.taxa)}%`}
          </p>
          <p className="mt-1 text-[10px] uppercase tracking-[.12em] text-faint">
            {criterio === "acertos" ? `${pct(linha.taxa)}% de acerto` : `${num(linha.acertos)} acertos`}
          </p>
        </div>
      </div>
    </li>
  );
}

// Rodapé pessoal: no placar de todo mundo, a primeira coisa que se procura é a si mesmo.
function SeuLugar({
  voce,
  naLista,
  criterio,
  minimo,
}: {
  voce: LinhaRanking | null;
  naLista: boolean;
  criterio: Criterio;
  minimo: number;
}) {
  if (voce && naLista) return null;

  return (
    <Card className="mt-6 flex flex-wrap items-center gap-4 p-5">
      <span
        className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-full border"
        style={{ borderColor: "var(--accentBd)", background: "var(--accentBg)", color: "var(--accentText)" }}
      >
        <Target size={18} strokeWidth={1.9} />
      </span>
      <div className="min-w-0 flex-1">
        {voce ? (
          <>
            <p className="font-display font-bold text-brand-ink">
              Faltam {num(Math.max(0, minimo - voce.respondidas))} questões para você entrar neste ranking
            </p>
            <p className="mt-0.5 text-sm text-faint">
              O ranking por taxa começa em {minimo} questões respondidas. Você tem {num(voce.respondidas)}.
            </p>
          </>
        ) : (
          <>
            <p className="font-display font-bold text-brand-ink">Você ainda não aparece no placar</p>
            <p className="mt-0.5 text-sm text-faint">
              {criterio === "acertos"
                ? "Responda a primeira questão da trilha para entrar na lista."
                : `Responda ${minimo} questões para disputar o ranking por taxa.`}
            </p>
          </>
        )}
      </div>
      <Link to="/estudar" className="btn-primary text-base">
        Estudar agora
      </Link>
    </Card>
  );
}

function VazioRanking({ criterio, minimo }: { criterio: Criterio; minimo: number }) {
  return (
    <Card className="p-10 text-center">
      <Trophy size={26} strokeWidth={1.6} className="mx-auto text-faint" aria-hidden />
      <p className="mt-3 font-display text-lg font-bold text-brand-ink">Placar ainda vazio</p>
      <p className="mt-1 text-sm text-faint">
        {criterio === "acertos"
          ? "Ninguém desta trilha respondeu questões até agora. Seja o primeiro nome daqui."
          : `Ninguém chegou a ${minimo} questões respondidas ainda.`}
      </p>
    </Card>
  );
}

// Alternador de critério. É um botão de rádio de dois estados, não um <select>: a troca
// muda a lista inteira e precisa estar visível sem abrir nada.
function Segmentado({
  valor,
  onChange,
  opcoes,
}: {
  valor: Criterio;
  onChange: (v: Criterio) => void;
  opcoes: { valor: Criterio; rotulo: string; icone: typeof Trophy }[];
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Critério do ranking"
      className="inline-flex rounded-2xl border border-hair p-1"
      style={{ background: "var(--surface2)" }}
    >
      {opcoes.map((o) => {
        const ativo = o.valor === valor;
        const Icone = o.icone;
        return (
          <button
            key={o.valor}
            role="radio"
            aria-checked={ativo}
            onClick={() => onChange(o.valor)}
            className="tap inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition"
            style={{
              background: ativo ? "var(--accentBg)" : "transparent",
              color: ativo ? "var(--accentText)" : "rgb(var(--muted))",
              boxShadow: ativo ? "inset 0 0 0 1px var(--accentBd)" : undefined,
            }}
          >
            <Icone size={16} strokeWidth={2} />
            {o.rotulo}
          </button>
        );
      })}
    </div>
  );
}

// Perfil de quem está no placar: estudo na trilha e o time da Batalha Pokémon.
function PerfilJogador({ trilhaId, linha, onFechar }: { trilhaId: string; linha: LinhaRanking; onFechar: () => void }) {
  const [perfil, setPerfil] = useState<PerfilRanking | null>(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    let vivo = true;
    carregarPerfilRanking(trilhaId, linha.userId)
      .then((p) => vivo && setPerfil(p))
      .catch(() => vivo && setErro(true));
    const esc = (e: globalThis.KeyboardEvent) => e.key === "Escape" && onFechar();
    window.addEventListener("keydown", esc);
    return () => {
      vivo = false;
      window.removeEventListener("keydown", esc);
    };
  }, [trilhaId, linha.userId, onFechar]);

  const poke = perfil?.poke;
  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/55 p-0 sm:items-center sm:p-6" onClick={onFechar}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Perfil de ${linha.nome}`}
        onClick={(e) => e.stopPropagation()}
        className="fadeup max-h-[92vh] w-full max-w-[560px] overflow-y-auto rounded-t-3xl border border-hair bg-surface p-5 shadow-2xl sm:rounded-3xl sm:p-6"
      >
        <div className="flex items-start gap-4">
          <Avatar linha={linha} tamanho={64} cor="var(--accent)" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-xl font-bold text-brand-ink">{perfil?.voce ? "Você" : linha.nome}</p>
            <p className="text-xs text-faint">
              {linha.posicao}º no placar
              {perfil?.desde && ` · estuda desde ${new Date(perfil.desde).toLocaleDateString("pt-BR", { month: "short", year: "numeric" })}`}
            </p>
          </div>
          <button onClick={onFechar} aria-label="Fechar" className="rounded-full p-1.5 text-faint transition hover:text-brand-ink">
            <X size={18} />
          </button>
        </div>

        {erro ? (
          <p className="mt-6 text-sm text-danger-from">Não foi possível carregar o perfil.</p>
        ) : !perfil ? (
          <div className="mt-6 space-y-3">
            <Skeleton className="h-16" />
            <Skeleton className="h-28" />
          </div>
        ) : (
          <>
            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Numero icone={Trophy} valor={num(perfil.acertos)} rotulo="acertos" />
              <Numero icone={Target} valor={`${pct(perfil.taxa)}%`} rotulo="de acerto" />
              <Numero icone={Swords} valor={num(perfil.batalha.acertos)} rotulo="acertos em batalha" />
              <Numero icone={CalendarDays} valor={num(perfil.diasEstudados)} rotulo="dias de estudo" />
            </div>
            <p className="mt-2 text-xs text-faint">
              {num(perfil.respondidas)} questões respondidas na trilha
              {perfil.batalha.respondidas > 0 && `, ${num(perfil.batalha.respondidas)} delas em batalha`} · última {desdeUltima(perfil.ultimaResposta)}.
            </p>

            {perfil.materias.length > 0 && (
              <div className="mt-5">
                <p className="mb-2 text-xs font-bold uppercase tracking-[.16em] text-faint">Pontos fortes</p>
                <ul className="space-y-1.5">
                  {perfil.materias.map((m) => (
                    <li key={m.materia} className="relative overflow-hidden rounded-xl border border-hair px-3 py-2 text-sm">
                      <div aria-hidden className="absolute inset-y-0 left-0" style={{ width: `${pct(m.taxa)}%`, background: "var(--accentBg)" }} />
                      <div className="relative flex items-center justify-between gap-3">
                        <span className="truncate text-brand-ink">{m.materia}</span>
                        <span className="flex-shrink-0 tabular-nums text-muted">
                          {num(m.acertos)} · {pct(m.taxa)}%
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-5">
              <p className="mb-2 text-xs font-bold uppercase tracking-[.16em] text-faint">Batalha Pokémon</p>
              {!poke ? (
                <p className="rounded-xl border border-dashed border-hair p-4 text-sm text-muted">
                  {perfil.voce ? "Abra a Batalha Pokémon para seu time aparecer aqui." : "Ainda não começou a jornada Pokémon."}
                </p>
              ) : (
                <div className="rounded-2xl border border-hair p-4">
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                    {poke.time.map((m, i) => (
                      <div key={i} className="flex flex-col items-center rounded-xl px-1 pb-1.5 pt-2" style={{ background: "var(--surface2)" }}>
                        <img src={spritePokemon(m.id)} alt={`Pokémon nº ${m.id}`} loading="lazy" className="h-14 w-14 object-contain [image-rendering:pixelated]" />
                        <span className="text-[11px] font-bold tabular-nums text-muted">Nv{m.nivel}</span>
                      </div>
                    ))}
                  </div>
                  <dl className="mt-4 grid grid-cols-3 gap-x-3 gap-y-2 text-center">
                    <MiniNumero valor={REGIAO[poke.regiao] ?? "Kanto"} rotulo="região" />
                    <MiniNumero valor={num(poke.insignias)} rotulo="insígnias" />
                    <MiniNumero valor={num(poke.campeao)} rotulo={poke.campeao === 1 ? "título de campeão" : "títulos de campeão"} />
                    <MiniNumero valor={num(poke.vitorias)} rotulo={`vitórias em ${num(poke.partidas)}`} />
                    <MiniNumero valor={num(poke.capturados)} rotulo="capturados" />
                    <MiniNumero valor={num(poke.vistos)} rotulo="na Pokédex" />
                  </dl>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}

function Numero({ icone: Icone, valor, rotulo }: { icone: typeof Users; valor: string; rotulo: string }) {
  return (
    <div className="rounded-xl border border-hair p-3">
      <Icone size={15} strokeWidth={1.9} className="text-faint" />
      <p className="mt-1.5 font-display text-xl font-bold leading-none tabular-nums text-brand-ink">{valor}</p>
      <p className="mt-1 text-[10px] uppercase tracking-[.12em] text-faint">{rotulo}</p>
    </div>
  );
}

function MiniNumero({ valor, rotulo }: { valor: string; rotulo: string }) {
  return (
    <div>
      <dd className="font-display text-base font-bold tabular-nums text-brand-ink">{valor}</dd>
      <dt className="text-[10px] uppercase tracking-[.1em] text-faint">{rotulo}</dt>
    </div>
  );
}

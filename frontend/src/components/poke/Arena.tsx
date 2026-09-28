// Arena da Batalha Pokémon, no molde de Black/White: o inimigo no alto à direita, o seu
// Pokémon de costas embaixo à esquerda, as caixas de HP e a faixa de mensagem. É só
// apresentação: a página (pages/BatalhaPokemon.tsx) decide o que cada lado está fazendo
// (`anim`) e reinicia a animação trocando a `chave`.
import { useState, type CSSProperties, type ReactNode } from "react";
import { COR_TIPO, spriteCostas, spriteEstatico, spriteFrente, spriteItem, spriteTreinador } from "../../lib/poke/dex";
import type { Status } from "../../lib/poke/motor";

export type AnimLado = "" | "entra" | "ataca" | "dano" | "desmaia" | "some" | "bola" | "foge" | "status";

export interface LadoVis {
  id: number;
  nome: string;
  nivel: number;
  hp: number;
  hpMax: number;
  status: Status;
  anim: AnimLado;
  chave: number; // muda para reiniciar a animação
  xp?: number; // 0–1, só o seu
  selvagem?: boolean;
  capturavel?: boolean; // selo de "já te derrubou"
}

export interface FxVis {
  n: number;
  de: "meu" | "inimigo";
  cor: string;
  forte?: boolean;
}

export interface TextoVis {
  n: number;
  lado: "meu" | "inimigo";
  texto: string;
  cor: string;
}

export interface BolaVis {
  n: number;
  bola: string;
  balancos: number;
  sucesso: boolean;
}

export const SIGLA_STATUS: Record<Exclude<Status, "">, [string, string]> = {
  poison: ["VEN", "#A33EA1"],
  burn: ["QUE", "#EE8130"],
  paralysis: ["PAR", "#C9A800"],
  sleep: ["DOR", "#8D99AE"],
  freeze: ["CON", "#5BC0DE"],
};

function corHp(f: number) {
  return f > 0.5 ? "#3BC46B" : f > 0.2 ? "#F2C33A" : "#E8474C";
}

function Caixa({ lado, meu }: { lado: LadoVis; meu: boolean }) {
  const f = lado.hpMax ? Math.max(0, lado.hp) / lado.hpMax : 0;
  const st = lado.status ? SIGLA_STATUS[lado.status] : null;
  return (
    <div className={`pk-caixa ${meu ? "pk-caixa--meu" : "pk-caixa--inimigo"}`}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="truncate font-bold">
          {lado.nome}
          {lado.capturavel && <span className="pk-selo" title="Questão que já te derrubou: dá para capturar">●</span>}
        </span>
        <span className="shrink-0 text-[0.8em] font-bold">Nv{lado.nivel}</span>
      </div>
      <div className="mt-0.5 flex items-center gap-1.5">
        {st ? (
          <span className="pk-status" style={{ background: st[1] }}>
            {st[0]}
          </span>
        ) : (
          <span className="pk-hp-rotulo">HP</span>
        )}
        <div className="pk-hp">
          <div className="pk-hp__barra" style={{ width: `${f * 100}%`, background: corHp(f) }} />
        </div>
      </div>
      {meu && (
        <>
          <p className="text-right text-[0.8em] font-bold tabular-nums">
            {Math.max(0, lado.hp)}/{lado.hpMax}
          </p>
          <div className="pk-xp">
            <div className="pk-xp__barra" style={{ width: `${(lado.xp ?? 0) * 100}%` }} />
          </div>
        </>
      )}
    </div>
  );
}

// Largura natural de cada GIF: o sprite remonta a cada animação e não pode piscar.
const larguras = new Map<string, number>();

function Sprite({ lado, meu }: { lado: LadoVis; meu: boolean }) {
  const [falhou, setFalhou] = useState(false);
  const src = falhou ? spriteEstatico(lado.id) : meu ? spriteCostas(lado.id) : spriteFrente(lado.id);
  const [largura, setLargura] = useState<number | null>(larguras.get(src) ?? null);
  return (
    <div key={`${lado.id}-${lado.chave}`} className={`pk-sprite ${meu ? "pk-sprite--meu" : "pk-sprite--inimigo"} ${lado.anim ? `pk-anim-${lado.anim}` : ""}`}>
      <img
        src={src}
        alt={lado.nome}
        draggable={false}
        onLoad={(e) => {
          larguras.set(src, e.currentTarget.naturalWidth);
          setLargura(e.currentTarget.naturalWidth);
        }}
        onError={() => setFalhou(true)}
        style={{ "--nw": largura ?? (falhou ? 96 : 64), visibility: largura ? "visible" : "hidden" } as CSSProperties}
      />
    </div>
  );
}

export function Arena({
  inimigo,
  meu,
  treinador,
  mensagem,
  fx,
  textos,
  bola,
  cor,
  topo,
  aguardando,
}: {
  inimigo: LadoVis | null;
  meu: LadoVis | null;
  treinador: { sprite: string; chave: number; sai: boolean } | null;
  mensagem: string;
  fx: FxVis | null;
  textos: TextoVis[];
  bola: BolaVis | null;
  cor: string; // cor do "bioma" (tipo da matéria)
  topo?: ReactNode;
  aguardando?: boolean;
}) {
  return (
    <div className="pk-arena" style={{ "--bioma": cor } as CSSProperties}>
      <div className="pk-ceu" />
      <div className="pk-plataforma pk-plataforma--inimigo" />
      <div className="pk-plataforma pk-plataforma--meu" />

      {treinador && (
        <img
          key={treinador.chave}
          className={`pk-treinador ${treinador.sai ? "pk-treinador--sai" : ""}`}
          src={spriteTreinador(treinador.sprite)}
          alt=""
          draggable={false}
        />
      )}
      {inimigo && <Sprite lado={inimigo} meu={false} />}
      {meu && <Sprite lado={meu} meu />}

      {bola && (
        <div key={bola.n} className={`pk-bola ${bola.sucesso ? "pk-bola--pegou" : "pk-bola--escapou"}`} style={{ "--balancos": bola.balancos } as CSSProperties}>
          <img src={spriteItem(bola.bola)} alt="" draggable={false} />
        </div>
      )}

      {fx && <div key={fx.n} className={`pk-fx pk-fx--${fx.de} ${fx.forte ? "pk-fx--forte" : ""}`} style={{ "--cor": fx.cor } as CSSProperties} />}

      {textos.map((t) => (
        <span key={t.n} className={`pk-texto pk-texto--${t.lado}`} style={{ color: t.cor }}>
          {t.texto}
        </span>
      ))}

      {inimigo && inimigo.anim !== "some" && <Caixa lado={inimigo} meu={false} />}
      {meu && meu.anim !== "some" && <Caixa lado={meu} meu />}

      {topo && <div className="pk-topo">{topo}</div>}
      <div className="pk-mensagem" aria-live="polite">
        <span>{mensagem}</span>
        {aguardando && <span className="pk-mensagem__seta">▼</span>}
      </div>
    </div>
  );
}

export function TipoChip({ tipo, nome }: { tipo: number; nome: string }) {
  return (
    <span className="pk-tipo" style={{ background: COR_TIPO[tipo] }}>
      {nome}
    </span>
  );
}

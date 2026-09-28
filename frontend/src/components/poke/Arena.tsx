// Arena da Batalha Pokémon, no molde de Black/White: o inimigo no alto à direita, o seu
// Pokémon de costas embaixo à esquerda, as caixas de HP e a faixa de mensagem. É só
// apresentação: a página (pages/BatalhaPokemon.tsx) decide o que cada lado está fazendo
// (`anim`) e reinicia a animação trocando a `chave`.
import { useState, type CSSProperties, type ReactNode } from "react";
import { COR_TIPO, spriteCostas, spriteEstatico, spriteFrente, spriteItem, spriteTreinador } from "../../lib/poke/dex";
import type { Status } from "../../lib/poke/motor";
import { fxSprite, type EfeitoGolpe } from "./fx";

// entra: surge com brilho; saiBola: o mesmo, depois da bola abrir; surge: selvagem chegando
export type AnimLado = "" | "entra" | "saiBola" | "surge" | "ataca" | "dano" | "desmaia" | "some" | "bola" | "foge" | "status";

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
  semente?: boolean; // Leech Seed
}

export interface FxVis {
  n: number;
  de: "meu" | "inimigo";
  alvo: "meu" | "inimigo";
  efeito: EfeitoGolpe;
  forte?: boolean;
}

// Pokébola lançada para mandar um Pokémon a campo
export interface LancaVis {
  n: number;
  lado: "meu" | "inimigo";
  bola: string;
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
        {lado.semente && (
          <span className="pk-status" style={{ background: "#4E9A2F" }} title="Leech Seed: perde HP a cada turno">
            SEM
          </span>
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

// Centro de cada lado, em % da arena (o golpe sai de um e chega no outro).
const CENTRO = { meu: ["24%", "68%"], inimigo: ["71%", "29%"] } as const;

function GolpeFx({ fx }: { fx: FxVis }) {
  const { estilo, sprites, cor } = fx.efeito;
  const [x0, y0] = CENTRO[fx.de];
  const [x1, y1] = CENTRO[fx.alvo];
  const vars = { "--x0": x0, "--y0": y0, "--x1": x1, "--y1": y1, "--cor": cor } as CSSProperties;
  const img = (i: number) => fxSprite(sprites[i % sprites.length]);
  const pecas: ReactNode[] = [];
  const impacto = (atraso: number, sprite?: string) =>
    pecas.push(
      <span key="impacto" className="fx-impacto" style={{ animationDelay: `${atraso}ms` }}>
        {sprite ? <img src={fxSprite(sprite)} alt="" /> : null}
      </span>
    );
  if (estilo === "contato") impacto(120, sprites[0]);
  else if (estilo === "mordida") {
    pecas.push(
      <span key="d1" className="fx-dente fx-dente--cima">
        <img src={img(0)} alt="" />
      </span>,
      <span key="d2" className="fx-dente fx-dente--baixo">
        <img src={img(0)} alt="" />
      </span>
    );
    impacto(300);
  } else if (estilo === "projetil") {
    pecas.push(
      <span key="p" className="fx-voo fx-voo--grande">
        <img src={img(0)} alt="" />
      </span>
    );
    impacto(420);
  } else if (estilo === "raio" || estilo === "rajada") {
    const n = estilo === "raio" ? 8 : 6;
    for (let i = 0; i < n; i++)
      pecas.push(
        <span
          key={i}
          className={`fx-voo ${estilo === "raio" ? "fx-voo--raio" : "fx-voo--rajada"}`}
          style={{ animationDelay: `${i * (estilo === "raio" ? 45 : 70)}ms`, "--dy": `${((i * 37) % 7) - 3}cqw`, "--giro": `${i % 2 ? 360 : -360}deg` } as CSSProperties}
        >
          <img src={img(i)} alt="" />
        </span>
      );
    impacto(estilo === "raio" ? 450 : 560);
  } else if (estilo === "chuva") {
    for (let i = 0; i < 5; i++)
      pecas.push(
        <span key={i} className="fx-cai" style={{ animationDelay: `${i * 90}ms`, "--dx": `${((i * 53) % 13) - 6}cqw` } as CSSProperties}>
          <img src={img(i)} alt="" />
        </span>
      );
    impacto(560);
  } else if (estilo === "trovao") {
    pecas.push(
      <span key="t" className="fx-trovao">
        <img src={img(0)} alt="" />
      </span>,
      <span key="c" className="fx-clarao" />
    );
    impacto(300);
  } else if (estilo === "aura" || estilo === "cura" || estilo === "tique") {
    const n = estilo === "tique" ? 3 : 6;
    for (let i = 0; i < n; i++)
      pecas.push(
        <span
          key={i}
          className={estilo === "aura" ? "fx-orbita" : "fx-sobe"}
          style={{ animationDelay: `${i * 80}ms`, "--ang": `${(360 / n) * i}deg`, "--dx": `${((i * 29) % 9) - 4}cqw` } as CSSProperties}
        >
          <img src={img(i)} alt="" />
        </span>
      );
    pecas.push(<span key="anel" className="fx-anel" />);
  }
  if (fx.forte && estilo !== "trovao") pecas.push(<span key="c" className="fx-clarao fx-clarao--leve" />);
  return (
    <div key={fx.n} className={`fx fx--${estilo} ${fx.forte ? "fx--forte" : ""}`} style={vars} aria-hidden>
      {pecas}
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
  lancamentos = [],
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
  lancamentos?: LancaVis[];
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

      {lancamentos.map((l) => (
        <div key={l.n} className={`pk-lanca pk-lanca--${l.lado}`} aria-hidden>
          <img src={spriteItem(l.bola)} alt="" draggable={false} />
          <span className="pk-lanca__abre" />
        </div>
      ))}

      {bola && (
        <div key={bola.n} className={`pk-bola ${bola.sucesso ? "pk-bola--pegou" : "pk-bola--escapou"}`} style={{ "--balancos": bola.balancos } as CSSProperties} aria-hidden>
          <span className="pk-bola__flash" />
          <div className="pk-bola__corpo">
            <img src={spriteItem(bola.bola)} alt="" draggable={false} />
          </div>
          {bola.sucesso ? (
            <span className="pk-bola__estrelas">
              <i>★</i>
              <i>★</i>
              <i>★</i>
            </span>
          ) : (
            <span className="pk-bola__estouro" />
          )}
        </div>
      )}

      {fx && <GolpeFx key={fx.n} fx={fx} />}

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

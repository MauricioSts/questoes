// Arena da Batalha Pokémon, no molde de Black/White: o inimigo no alto à direita, o seu
// Pokémon de costas embaixo à esquerda, as caixas de HP e a faixa de mensagem. É só
// apresentação: a página (pages/BatalhaPokemon.tsx) decide o que cada lado está fazendo
// (`anim`) e reinicia a animação trocando a `chave`.
// Na batalha dupla cada lado tem dois slots (0 na frente, 1 atrás); as posições saem de
// `pk-arena--dupla` + `pk-s0`/`pk-s1` no CSS e de CENTRO aqui (golpes, textos, bolas).
import { useState, type CSSProperties, type ReactNode } from "react";
import { COR_TIPO, spriteCostas, spriteEstatico, spriteFrente, spriteItem, spriteTreinador } from "../../lib/poke/dex";
import type { Status } from "../../lib/poke/motor";
import { fxSprite, type EfeitoGolpe } from "./fx";

// entra: surge com brilho; saiBola: o mesmo, depois da bola abrir; surge: selvagem chegando
export type AnimLado = "" | "entra" | "saiBola" | "surge" | "lenda" | "ataca" | "dano" | "desmaia" | "some" | "bola" | "foge" | "status";
export type Slot = 0 | 1;

// De onde o selvagem saiu: as partículas em volta dele (folhas, bolhas, brasas...).
export type Habitat = "mato" | "agua" | "fogo" | "eletrico" | "pedra" | "gelo" | "espirito" | "vento" | "veneno" | "fada";
const HABITAT_DO_TIPO: Habitat[] = ["mato", "fogo", "agua", "eletrico", "mato", "gelo", "pedra", "veneno", "pedra", "vento", "espirito", "mato", "pedra", "espirito", "vento", "espirito", "eletrico", "fada"];
export const habitatDoTipo = (t: number | undefined): Habitat => HABITAT_DO_TIPO[t ?? 0] ?? "mato";
export const TEXTO_HABITAT: Record<Habitat, string> = {
  mato: "O mato alto está balançando...",
  agua: "Bolhas sobem da água...",
  fogo: "Brasas estalam no caminho...",
  eletrico: "Faíscas estalam no ar...",
  pedra: "Pedrinhas rolam e a poeira sobe...",
  gelo: "Flocos de neve rodopiam...",
  espirito: "Uma névoa estranha paira no ar...",
  vento: "Uma rajada de vento passa...",
  veneno: "Bolhas roxas borbulham no pântano...",
  fada: "Brilhos cor-de-rosa piscam no ar...",
};

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
  habitat?: Habitat; // selvagem: partículas do lugar de onde saiu
  capturavel?: boolean; // selo de "já te derrubou"
  lendario?: boolean; // a lenda do Rastro Lendário: aura e faixa dourada
  cor?: string; // cor da aura (tipo da lenda)
  semente?: boolean; // Leech Seed
  enc?: number; // inimigo: chave do encontro que este desenho mostra
  uid?: string; // meu: o Pokémon que este desenho mostra
}

export interface FxVis {
  n: number;
  de: "meu" | "inimigo";
  alvo: "meu" | "inimigo";
  efeito: EfeitoGolpe;
  forte?: boolean;
  deSlot?: Slot;
  alvoSlot?: Slot;
}

// Pokébola lançada para mandar um Pokémon a campo
export interface LancaVis {
  n: number;
  lado: "meu" | "inimigo";
  bola: string;
  mao?: boolean; // sai da mão do jogador
  slot?: Slot;
}

export interface TextoVis {
  n: number;
  lado: "meu" | "inimigo";
  texto: string;
  cor: string;
  slot?: Slot;
}

export interface BolaVis {
  n: number;
  bola: string;
  balancos: number;
  sucesso: boolean;
  mao?: boolean; // sai da mão do jogador
}

// Pokébolas do time (como nos jogos): de pé, com status, desmaiado ou vaga vazia.
export type EstadoBola = "ok" | "status" | "ko" | "vazio";

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

export function Pokebolas({ bolas, className = "" }: { bolas: EstadoBola[]; className?: string }) {
  return (
    <span className={`pk-party ${className}`} aria-label={`${bolas.filter((b) => b === "ok" || b === "status").length} de ${bolas.filter((b) => b !== "vazio").length} Pokémon de pé`}>
      {bolas.map((b, i) => (
        <i key={i} className={`pk-party__b pk-party__b--${b}`} />
      ))}
    </span>
  );
}

function Caixa({ lado, meu, slot, dupla, bolas }: { lado: LadoVis; meu: boolean; slot: Slot; dupla: boolean; bolas?: EstadoBola[] }) {
  const f = lado.hpMax ? Math.max(0, lado.hp) / lado.hpMax : 0;
  const st = lado.status ? SIGLA_STATUS[lado.status] : null;
  return (
    <div className={`pk-caixa ${meu ? "pk-caixa--meu" : "pk-caixa--inimigo"} ${dupla ? `pk-caixa--dupla pk-s${slot}` : ""} ${lado.selvagem ? "pk-caixa--selvagem" : ""}`}>
      {bolas && <Pokebolas bolas={bolas} className="pk-caixa__party" />}
      <div className="flex items-baseline justify-between gap-2">
        <span className="truncate font-bold">
          {lado.nome}
          {lado.capturavel && <span className="pk-selo" title="Questão que já te derrubou: dá para capturar">●</span>}
        </span>
        <span className="shrink-0 text-[0.8em] font-bold">Nv{lado.nivel}</span>
      </div>
      {lado.lendario ? <span className="pk-selvagem pk-selvagem--lenda">Lendário</span> : lado.selvagem && <span className="pk-selvagem">Selvagem</span>}
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
          {!dupla && (
            <div className="pk-xp">
              <div className="pk-xp__barra" style={{ width: `${(lado.xp ?? 0) * 100}%` }} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Largura natural de cada GIF: o sprite remonta a cada animação e não pode piscar.
const larguras = new Map<string, number>();

function Sprite({ lado, meu, slot, dupla }: { lado: LadoVis; meu: boolean; slot: Slot; dupla: boolean }) {
  const [falhou, setFalhou] = useState(false);
  const src = falhou ? spriteEstatico(lado.id) : meu ? spriteCostas(lado.id) : spriteFrente(lado.id);
  const [largura, setLargura] = useState<number | null>(larguras.get(src) ?? null);
  return (
    <div key={`${lado.id}-${lado.chave}`} className={`pk-sprite ${meu ? "pk-sprite--meu" : "pk-sprite--inimigo"} ${dupla ? `pk-s${slot}` : ""} ${lado.anim ? `pk-anim-${lado.anim}` : ""} ${lado.lendario && !lado.anim ? "pk-lendario" : ""}`}>
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

// Folhas, bolhas, brasas... em volta do selvagem: uma explosão quando ele surge (o mato abre,
// a água espirra) e partículas que continuam enquanto ele estiver em campo. `so` = só o
// ambiente, sem Pokémon (a prévia do mato balançando na parada).
function HabitatFx({ habitat, chave, so }: { habitat: Habitat; chave: number; so?: boolean }) {
  return (
    <div className={`pk-hab pk-hab--${habitat} ${so ? "pk-hab--so" : ""}`} aria-hidden>
      {!so && (
        <div key={chave} className="pk-hab__burst">
          {Array.from({ length: 16 }, (_, i) => (
            <i key={i} style={{ "--a": `${-80 + ((i * 160) / 15)}deg`, "--d": `${(i % 4) * 45}ms`, "--r": `${9 + ((i * 53) % 9)}cqw`, "--g": `${(i * 137) % 360}deg` } as CSSProperties} />
          ))}
        </div>
      )}
      <div className="pk-hab__amb">
        {Array.from({ length: 9 }, (_, i) => (
          <i key={i} style={{ "--x": `${8 + ((i * 41) % 86)}%`, "--d": `${-(i * 0.63).toFixed(2)}s`, "--t": `${2.4 + (i % 3) * 0.8}s`, "--s": 0.75 + (i % 3) * 0.25, "--g": `${(i * 97) % 360}deg` } as CSSProperties} />
        ))}
      </div>
      <div key={`c${chave}`} className="pk-hab__chao">
        {habitat === "mato" && (
          <svg viewBox="0 0 120 30" preserveAspectRatio="none">
            {Array.from({ length: 13 }, (_, i) => {
              const x = 4 + i * 9.2;
              const h = 14 + ((i * 7) % 12);
              const torto = ((i * 5) % 9) - 4;
              return <path key={i} d={`M${x - 4} 30 Q${x + torto / 2} ${30 - h / 2} ${x + torto} ${30 - h} Q${x + 1} ${30 - h / 2} ${x + 4} 30Z`} fill={i % 2 ? "#3E8E2F" : "#5DB83F"} />;
            })}
          </svg>
        )}
      </div>
    </div>
  );
}

// Centro de cada lado, em % da arena (o golpe sai de um e chega no outro).
function centro(lado: "meu" | "inimigo", slot: Slot | undefined, dupla: boolean): [string, string] {
  if (!dupla) return lado === "meu" ? ["24%", "68%"] : ["71%", "29%"];
  if (lado === "meu") return slot === 1 ? ["39%", "66%"] : ["17%", "70%"];
  return slot === 1 ? ["84%", "26%"] : ["61%", "30%"];
}

function GolpeFx({ fx, dupla }: { fx: FxVis; dupla: boolean }) {
  const { estilo, sprites, cor } = fx.efeito;
  const [x0, y0] = centro(fx.de, fx.deSlot, dupla);
  const [x1, y1] = centro(fx.alvo, fx.alvoSlot, dupla);
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

export interface ItemVis {
  n: number;
  item: string;
  grande?: boolean;
  slot?: Slot;
  lado?: "meu" | "inimigo"; // item usado pelo treinador inimigo (poção): aparece sobre o Pokémon dele
}

// O que espera depois da parada: o próximo treinador lá no fundo, ou o mato balançando.
export type PreviaVis = { tipo: "treinador"; sprite: string; n: number } | { tipo: "mato"; habitat: Habitat; n: number };

export function Arena({
  inimigos,
  meus,
  dupla = false,
  treinador,
  jogador,
  mensagem,
  fx,
  textos,
  bola,
  lancamentos = [],
  cor,
  topo,
  aguardando,
  fundo,
  item,
  bolasInimigo,
  bolasMeu,
  previa,
  centroCura,
  transicao,
  insignia,
  aparicao,
}: {
  inimigos: (LadoVis | null)[]; // [slot 0, slot 1]
  meus: (LadoVis | null)[];
  dupla?: boolean;
  treinador: { sprite: string; chave: number; sai: boolean; lider?: boolean } | null;
  jogador?: { sprite: string; chave: number } | null; // o jogador aparece para lançar a bola
  mensagem: string;
  fx: FxVis | null;
  textos: TextoVis[];
  bola: BolaVis | null;
  lancamentos?: LancaVis[];
  cor: string; // cor do "bioma" (tipo da matéria)
  fundo?: string; // imagem do cenário; sem ela, céu e chão desenhados
  topo?: ReactNode;
  aguardando?: boolean;
  item?: ItemVis | null; // item segurado agindo (pequeno, sobre o meu Pokémon) ou prêmio (grande, no centro)
  bolasInimigo?: EstadoBola[] | null; // time do treinador inimigo (selvagem não tem)
  bolasMeu?: EstadoBola[] | null;
  previa?: PreviaVis | null;
  centroCura?: number | null; // Centro Pokémon curando o time (chave da animação)
  transicao?: number | null; // chegada de líder: a tela vira blocos de pixel (chave da animação)
  insignia?: { src: string; nome: string; n: number } | null; // insígnia ganha, no meio da arena
  aparicao?: { n: number; cor: string } | null; // a lenda chegando: a terra treme e o céu escurece
}) {
  const [fundoOk, setFundoOk] = useState<string | null>(null);
  const comFundo = !!fundo && fundoOk === fundo;
  const slots = (xs: (LadoVis | null)[]) => (dupla ? xs.slice(0, 2) : xs.slice(0, 1)).map((v, k) => [v, k as Slot] as const);
  const primeiroIni = slots(inimigos).find(([v]) => v && v.anim !== "some")?.[1] ?? 0;
  const primeiroMeu = slots(meus).find(([v]) => v && v.anim !== "some")?.[1] ?? 0;
  const lenda = !dupla && inimigos[0]?.lendario && !["some", "bola", "foge", "desmaia"].includes(inimigos[0].anim) ? inimigos[0] : null;
  return (
    <div
      className={`pk-arena ${comFundo ? "pk-arena--fundo" : ""} ${dupla ? "pk-arena--dupla" : ""} ${aparicao ? "pk-arena--treme" : ""}`}
      style={{ "--bioma": cor, ...(aparicao || lenda ? { "--aura": aparicao?.cor ?? lenda?.cor ?? "#FFD54A" } : {}) } as CSSProperties}
    >
      <div className="pk-ceu" />
      {fundo && <img key={fundo} className="pk-fundo" src={fundo} alt="" draggable={false} onLoad={() => setFundoOk(fundo)} onError={() => setFundoOk(null)} />}
      <div className="pk-plataforma pk-plataforma--inimigo" />
      <div className="pk-plataforma pk-plataforma--meu" />

      {previa?.tipo === "treinador" && <img key={previa.n} className="pk-previa-treinador" src={spriteTreinador(previa.sprite)} alt="" draggable={false} />}
      {previa?.tipo === "mato" && <HabitatFx key={previa.n} habitat={previa.habitat} chave={previa.n} so />}

      {treinador && (
        <img
          key={treinador.chave}
          className={`pk-treinador ${treinador.sai ? "pk-treinador--sai" : treinador.lider ? "pk-treinador--lider" : ""}`}
          src={spriteTreinador(treinador.sprite)}
          alt=""
          draggable={false}
        />
      )}
      {jogador && <img key={jogador.chave} className="pk-jogador" src={spriteTreinador(jogador.sprite)} alt="" draggable={false} />}
      {aparicao && (
        <div key={aparicao.n} className="pk-aparicao" aria-hidden>
          <i className="pk-aparicao__veu" />
          {Array.from({ length: 14 }, (_, i) => (
            <b key={i} style={{ "--x": `${(i * 53) % 100}%`, "--d": `${(i * 0.11).toFixed(2)}s`, "--t": `${1.1 + (i % 4) * 0.25}s` } as CSSProperties} />
          ))}
        </div>
      )}
      {lenda && (
        <div key={`aura${lenda.enc}`} className="pk-aura" aria-hidden>
          <i />
          <i />
          {Array.from({ length: 10 }, (_, i) => (
            <b key={i} style={{ "--a": `${i * 36}deg`, "--d": `${-(i * 0.37).toFixed(2)}s` } as CSSProperties} />
          ))}
        </div>
      )}
      {slots(inimigos).map(([v, k]) => v && <Sprite key={`i${k}`} lado={v} meu={false} slot={k} dupla={dupla} />)}
      {!dupla && inimigos[0]?.selvagem && inimigos[0].habitat && inimigos[0].anim !== "some" && inimigos[0].anim !== "bola" && inimigos[0].anim !== "foge" && inimigos[0].anim !== "desmaia" && (
        <HabitatFx habitat={inimigos[0].habitat} chave={inimigos[0].enc ?? 0} />
      )}
      {slots(meus).map(([v, k]) => v && <Sprite key={`m${k}`} lado={v} meu slot={k} dupla={dupla} />)}

      {transicao != null && <TransicaoPixel key={transicao} />}
      {insignia && (
        <div key={insignia.n} className="pk-insignia-ganha" aria-hidden>
          <div className="pk-insignia-ganha__raios" />
          <img src={insignia.src} alt="" draggable={false} />
          {Array.from({ length: 8 }, (_, i) => (
            <i key={i} style={{ "--a": `${i * 45}deg`, "--d": `${700 + (i % 2) * 120}ms` } as CSSProperties} />
          ))}
          <p>{insignia.nome}</p>
        </div>
      )}

      {centroCura != null && (
        <div key={centroCura} className="pk-centro" aria-hidden>
          {Array.from({ length: 10 }, (_, i) => (
            <i key={i} style={{ "--x": `${8 + ((i * 37) % 40)}%`, "--d": `${i * 90}ms` } as CSSProperties}>
              ✚
            </i>
          ))}
        </div>
      )}

      {lancamentos.map((l) => {
        const [tx, ty] = centro(l.lado, l.slot, dupla);
        return (
          <div key={l.n} className={`pk-lanca pk-lanca--${l.lado} ${l.mao ? "pk-lanca--mao" : ""}`} style={{ "--tx": tx, "--ty": `calc(${ty} + 2%)` } as CSSProperties} aria-hidden>
            <img src={spriteItem(l.bola)} alt="" draggable={false} />
            <span className="pk-lanca__abre" />
          </div>
        );
      })}

      {bola && (
        <div key={bola.n} className={`pk-bola ${bola.sucesso ? "pk-bola--pegou" : "pk-bola--escapou"} ${bola.mao ? "pk-bola--mao" : ""}`} style={{ "--balancos": bola.balancos } as CSSProperties} aria-hidden>
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

      {fx && <GolpeFx key={fx.n} fx={fx} dupla={dupla} />}

      {item && (
        <div
          key={item.n}
          className={`pk-itempop ${item.grande ? "pk-itempop--grande" : ""}`}
          style={
            item.grande
              ? undefined
              : item.lado === "inimigo"
                ? ({ left: centro("inimigo", item.slot, dupla)[0], top: "24%" } as CSSProperties)
                : dupla
                  ? ({ left: centro("meu", item.slot, true)[0] } as CSSProperties)
                  : undefined
          }
          aria-hidden
        >
          <span className="pk-itempop__raios" />
          <img src={spriteItem(item.item)} alt="" draggable={false} />
          {item.grande && (
            <span className="pk-itempop__faiscas">
              {Array.from({ length: 8 }, (_, i) => (
                <i key={i} style={{ "--ang": `${i * 45}deg` } as CSSProperties} />
              ))}
            </span>
          )}
        </div>
      )}

      {textos.map((t) => (
        <span key={t.n} className={`pk-texto pk-texto--${t.lado}`} style={{ color: t.cor, ...(dupla ? { left: centro(t.lado, t.slot, true)[0] } : {}) }}>
          {t.texto}
        </span>
      ))}

      {slots(inimigos).map(([v, k]) => v && v.anim !== "some" && <Caixa key={`ci${k}`} lado={v} meu={false} slot={k} dupla={dupla} bolas={k === primeiroIni ? (bolasInimigo ?? undefined) : undefined} />)}
      {slots(meus).map(([v, k]) => v && v.anim !== "some" && <Caixa key={`cm${k}`} lado={v} meu slot={k} dupla={dupla} bolas={k === primeiroMeu ? (bolasMeu ?? undefined) : undefined} />)}
      {/* sem Pokémon meu em campo (troca, parada sem ninguém de pé): o time continua visível */}
      {!slots(meus).some(([v]) => v && v.anim !== "some") && bolasMeu && <Pokebolas bolas={bolasMeu} className="pk-party--solta" />}

      {topo && <div className="pk-topo">{topo}</div>}
      <div className="pk-mensagem" aria-live="polite">
        <span>{mensagem}</span>
        {aguardando && <span className="pk-mensagem__seta">▼</span>}
      </div>
    </div>
  );
}

// Chegada de líder, como nos jogos: dois clarões e a tela se fecha em blocos de pixel
// (do centro para fora), que depois se abrem revelando o líder.
const COLS = 16;
const LINS = 9;
function TransicaoPixel() {
  const blocos = [];
  for (let y = 0; y < LINS; y++)
    for (let x = 0; x < COLS; x++) {
      const d = Math.hypot((x + 0.5 - COLS / 2) / COLS, (y + 0.5 - LINS / 2) / LINS);
      blocos.push(<i key={`${x}-${y}`} style={{ "--d": `${Math.round(d * 700)}ms` } as CSSProperties} />);
    }
  return (
    <div className="pk-pixelada" style={{ "--cols": COLS, "--lins": LINS } as CSSProperties} aria-hidden>
      {blocos}
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

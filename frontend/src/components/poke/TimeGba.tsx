// Lista do time com a cara do menu POKéMON do GBA (FireRed/LeafGreen em Kanto e Johto,
// Emerald nas outras regiões). As peças vêm de public/fx/menu/<tema>/ (tools/prepare-menus.mjs,
// assets da Nintendo fora do git): sem elas, `useTemaGba` devolve null e a batalha usa a
// lista normal do app.
//
// Cada cartão é a peça original com o texto por cima, posicionado nas coordenadas da peça
// (px do GBA convertidos em %), e a barra de HP preenchida dentro do trilho de 48 px dela.
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import "../../menu-gba.css";

export type TemaGba = "frlg" | "emerald";

const BASE: string = `${(import.meta.env?.VITE_FX_BASE as string | undefined) ?? `${import.meta.env?.BASE_URL ?? "/"}fx/`}menu/`;

// Peças: tamanho natural e onde ficam ícone, nome, nível, trilho do HP e números (px do GBA).
interface Layout {
  w: number;
  h: number;
  selH: number; // a peça selecionada tem a borda laranja por fora
  icone: [number, number, number]; // x, y, lado
  nome: [number, number];
  nivel: [number, number];
  lvPronto: boolean; // a peça já traz o "Lv" desenhado
  trilho: [number, number, number, number];
  hp: { x: number; y: number; alinha: "fim" | "barra" }; // "barra": a peça já traz a "/"
  status: [number, number];
}

const LAYOUT: Record<TemaGba, { lider: Layout; barra: Layout; campo: boolean }> = {
  frlg: {
    campo: false,
    lider: { w: 84, h: 55, selH: 57, icone: [0, 0, 20], nome: [21, 9], nivel: [46, 27], lvPronto: true, trilho: [30, 40, 48, 2], hp: { x: 60, y: 44, alinha: "barra" }, status: [8, 28] },
    barra: { w: 150, h: 22, selH: 24, icone: [0, 0, 20], nome: [21, 1], nivel: [49, 13], lvPronto: true, trilho: [96, 9, 48, 2], hp: { x: 125, y: 13, alinha: "barra" }, status: [19, 13] },
  },
  emerald: {
    campo: true,
    lider: { w: 78, h: 49, selH: 49, icone: [3, 3, 24], nome: [28, 6], nivel: [28, 16], lvPronto: false, trilho: [24, 34, 48, 2], hp: { x: 74, y: 38, alinha: "fim" }, status: [56, 16] },
    barra: { w: 142, h: 22, selH: 22, icone: [2, 0, 22], nome: [26, 2], nivel: [26, 12], lvPronto: false, trilho: [88, 9, 48, 2], hp: { x: 136, y: 12, alinha: "fim" }, status: [52, 12] },
  },
};

const SELO: Record<string, string> = { poison: "psn", burn: "brn", paralysis: "par", sleep: "slp", freeze: "frz" };

// Tema da região (0 Kanto, 1 Johto → FRLG; resto → Emerald), se as peças existirem.
export function useTemaGba(regiao: number): TemaGba | null {
  const tema: TemaGba = regiao <= 1 ? "frlg" : "emerald";
  const [ok, setOk] = useState<Record<string, boolean>>({});
  useEffect(() => {
    if (ok[tema] !== undefined || typeof Image === "undefined") return;
    const img = new Image();
    img.onload = () => setOk((o) => ({ ...o, [tema]: true }));
    img.onerror = () => setOk((o) => ({ ...o, [tema]: false }));
    img.src = `${BASE}${tema}/fundo.png`;
  }, [tema, ok]);
  return ok[tema] ? tema : null;
}

export interface LinhaGba {
  chave: string;
  nome: string;
  nivel: number;
  hp: number;
  max: number;
  status?: string;
  sprite: string;
  emCampo: boolean;
  desabilitado: boolean;
  onClick: () => void;
  extra?: ReactNode;
}

const pct = (v: number, total: number) => `${(v / total) * 100}%`;

export function TimeGba({ tema, linhas }: { tema: TemaGba; linhas: LinhaGba[] }) {
  return (
    <div className="gba-time" style={{ "--gba-fundo": `url(${BASE}${tema}/fundo.png)` } as CSSProperties}>
      {linhas.map((l, i) => (
        <div key={l.chave} className={`gba-time__linha ${i === 0 ? "gba-time__linha--lider" : ""}`}>
          <Cartao tema={tema} lider={i === 0} l={l} />
          {l.extra}
        </div>
      ))}
    </div>
  );
}

function Cartao({ tema, lider, l }: { tema: TemaGba; lider: boolean; l: LinhaGba }) {
  const lay = LAYOUT[tema][lider ? "lider" : "barra"];
  const peca = `${lider ? "lider" : "barra"}${LAYOUT[tema].campo && l.emCampo ? "Campo" : ""}`;
  const f = l.max > 0 ? Math.max(0, Math.min(1, l.hp / l.max)) : 0;
  const [tx, ty, tw, th] = lay.trilho;
  const W = lay.w;
  const H = lay.h;
  const px = 100 / W; // 1 px do GBA em cqw
  const desmaiado = l.hp <= 0;
  const selo = desmaiado ? "fnt" : l.status ? SELO[l.status] : undefined;
  return (
    <button
      type="button"
      disabled={l.desabilitado}
      onClick={l.onClick}
      className={`gba-cartao ${desmaiado ? "gba-cartao--fora" : ""}`}
      style={
        {
          aspectRatio: `${W} / ${H}`,
          "--px": `${px}cqw`,
          "--peca": `url(${BASE}${tema}/${peca}.png)`,
          "--peca-sel": `url(${BASE}${tema}/${peca}Sel.png)`,
          "--sel-h": `${(lay.selH / H) * 100}%`,
        } as CSSProperties
      }
      aria-label={`${l.nome}, nível ${l.nivel}, ${l.hp} de ${l.max} HP${desmaiado ? ", desmaiado" : ""}${l.emCampo ? ", em campo" : ""}`}
    >
      <img className="gba-cartao__icone" src={l.sprite} alt="" draggable={false} style={{ left: pct(lay.icone[0], W), top: pct(lay.icone[1], H), width: pct(lay.icone[2], W) }} />
      <span className="gba-cartao__txt" style={{ left: pct(lay.nome[0], W), top: pct(lay.nome[1], H), maxWidth: pct(lider ? W - lay.nome[0] - 3 : tx - lay.nome[0] - 4, W) }}>
        {l.nome}
      </span>
      <span className="gba-cartao__txt" style={{ left: pct(lay.nivel[0], W), top: pct(lay.nivel[1], H) }}>
        {lay.lvPronto ? l.nivel : `Nv${l.nivel}`}
      </span>
      {selo && <i className={`gba-cartao__selo gba-selo--${selo}`} style={{ left: pct(lay.status[0], W), top: pct(lay.status[1], H), backgroundImage: `url(${BASE}emerald/${selo}.png)` }} />}
      <span
        className="gba-cartao__hp"
        style={{ left: pct(tx, W), top: pct(ty, H), width: pct(tw * f, W), height: pct(th, H), background: f > 0.5 ? "#70F8A8" : f > 0.2 ? "#F8E038" : "#F85838" }}
      />
      {lay.hp.alinha === "barra" ? (
        <>
          <span className="gba-cartao__txt gba-cartao__txt--dir" style={{ right: pct(W - lay.hp.x + 2, W), top: pct(lay.hp.y, H) }}>
            {l.hp}
          </span>
          <span className="gba-cartao__txt" style={{ left: pct(lay.hp.x + 4, W), top: pct(lay.hp.y, H) }}>
            {l.max}
          </span>
        </>
      ) : (
        <span className="gba-cartao__txt gba-cartao__txt--dir" style={{ right: pct(W - lay.hp.x, W), top: pct(lay.hp.y, H) }}>
          {l.hp}/{l.max}
        </span>
      )}
    </button>
  );
}

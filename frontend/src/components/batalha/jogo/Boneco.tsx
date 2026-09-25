// Um personagem articulado no palco. O React desenha as partes UMA vez; a cada quadro o
// palco chama `atualizar(t)` e o boneco só troca o atributo transform de cada parte
// (matriz da cinemática direta). Nada de re-render por quadro.
//
// Rastro (dash / Sandevistan): cópias do boneco em silhueta colorida que repetem as poses
// dos últimos instantes, cada vez mais transparentes.
import { forwardRef, useId, useImperativeHandle, useMemo, useRef } from "react";
import { amostrar, fk, matStr, misturar, SUAVE, aplicar, type Clip, type Mat, type Pose, type Suavizacao } from "../../../lib/rig";
import { CLIPES, ORDEM, OSSOS, type NomeClipe } from "./esqueleto";
import type { Skin } from "./skins";

export interface BonecoApi {
  tocar(clipe: NomeClipe | Clip, opts?: { mistura?: number; vel?: number }): Promise<void>;
  mover(x: number, y: number, dur: number, s?: Suavizacao): Promise<void>; // deslocamento absoluto a partir de casa
  pos(): { x: number; y: number }; // onde os pés estão agora (palco)
  ponto(osso: string, lx?: number, ly?: number): { x: number; y: number };
  rastro(ligado: boolean): void;
  virar(esquerda: boolean): void;
  sumir(ms: number): Promise<void>;
  aparecer(): void;
  atualizar(t: number): void;
}

interface Props {
  skin: Skin;
  x: number; // casa
  y: number;
  vira?: boolean; // olhando para a esquerda
  fantasmas?: number;
  inicio?: { x: number; y: number }; // deslocamento inicial (entrar de fora do palco)
  clipeInicial?: NomeClipe;
  escala?: number; // multiplica o tamanho da pele (o palco desenha todos maiores)
}

const esperaPromessa = () => {
  let resolve!: () => void;
  const p = new Promise<void>((r) => (resolve = r));
  return { p, resolve };
};

export const Boneco = forwardRef<BonecoApi, Props>(function Boneco(
  { skin, x, y, vira = false, fantasmas = 5, inicio, clipeInicial = "guarda", escala = 1 },
  ref
) {
  const filtro = `sil${useId().replace(/:/g, "")}`;
  // Esqueleto com as juntas que a pele reposiciona (o golem tem ombros nas bordas da folha)
  const ossos = useMemo(() => OSSOS.map((o) => ({ ...o, ...(skin.ossos?.[o.nome] ?? {}) })), [skin.ossos]);
  const raiz = useRef<SVGGElement>(null);
  const partes = useRef<Map<string, SVGGElement>[]>([]);
  const fantasmasG = useRef<SVGGElement[]>([]);

  const st = useRef({
    clip: CLIPES[clipeInicial] as Clip,
    t0: 0,
    vel: 1,
    de: null as Pose | null,
    deT0: 0,
    deDur: 0,
    fim: null as null | (() => void),
    pose: {} as Pose,
    agora: 0,
    off: { ...(inicio ?? { x: 0, y: 0 }) },
    tween: null as null | { de: { x: number; y: number }; para: { x: number; y: number }; t0: number; dur: number; s: Suavizacao; fim: () => void },
    rastro: false,
    hist: [] as Record<string, Mat>[],
    ultRastro: 0,
    mats: {} as Record<string, Mat>,
    vira,
    alfa: 1,
    fade: null as null | { t0: number; dur: number; fim: () => void },
  });

  function coletar(el: SVGGElement | null, i: number) {
    if (!el) return;
    const m = new Map<string, SVGGElement>();
    el.querySelectorAll<SVGGElement>("[data-o]").forEach((g) => m.set(g.dataset.o!, g));
    partes.current[i] = m;
  }

  useImperativeHandle(ref, () => ({
    tocar(clipe, opts) {
      const s = st.current;
      s.fim?.();
      const c = typeof clipe === "string" ? (CLIPES[clipe] as Clip) : clipe;
      s.de = s.pose;
      s.deT0 = s.agora;
      s.deDur = opts?.mistura ?? 110;
      s.clip = c;
      s.t0 = s.agora;
      s.vel = opts?.vel ?? 1;
      if (c.loop) {
        s.fim = null;
        return Promise.resolve();
      }
      const { p, resolve } = esperaPromessa();
      s.fim = () => {
        s.fim = null;
        resolve();
      };
      return p;
    },
    mover(nx, ny, dur, suav = "entraSai") {
      const s = st.current;
      s.tween?.fim();
      const { p, resolve } = esperaPromessa();
      if (dur <= 0) {
        s.off = { x: nx, y: ny };
        s.tween = null;
        resolve();
        return p;
      }
      s.tween = {
        de: { ...s.off },
        para: { x: nx, y: ny },
        t0: s.agora,
        dur,
        s: suav,
        fim: () => {
          s.tween = null;
          resolve();
        },
      };
      return p;
    },
    pos() {
      return { x: x + st.current.off.x, y: y + st.current.off.y };
    },
    ponto(osso, lx = 0, ly = 0) {
      const m = st.current.mats[osso];
      return m ? aplicar(m, lx, ly) : { x, y: y - 100 };
    },
    rastro(ligado) {
      st.current.rastro = ligado;
      if (!ligado) st.current.hist = [];
    },
    virar(esq) {
      st.current.vira = esq;
    },
    sumir(ms) {
      const { p, resolve } = esperaPromessa();
      st.current.fade = { t0: st.current.agora, dur: ms, fim: resolve };
      return p;
    },
    aparecer() {
      st.current.fade = null;
      st.current.alfa = 1;
      if (raiz.current) raiz.current.style.opacity = "1";
    },
    atualizar(t) {
      const s = st.current;
      s.agora = t;
      const local = (t - s.t0) * s.vel;
      let pose = amostrar(s.clip, local);
      if (s.de && s.deDur > 0 && t - s.deT0 < s.deDur) pose = misturar(s.de, pose, SUAVE.entraSai(Math.max(0, (t - s.deT0) / s.deDur)));
      if (!s.clip.loop && local >= s.clip.dur) s.fim?.();
      if (skin.onda) pose = { ...pose, capa: (pose.capa ?? 0) + Math.sin(t / 240) * skin.onda };
      s.pose = pose;

      if (s.tween) {
        const k = Math.min(1, (t - s.tween.t0) / s.tween.dur);
        const e = SUAVE[s.tween.s](k);
        s.off = { x: s.tween.de.x + (s.tween.para.x - s.tween.de.x) * e, y: s.tween.de.y + (s.tween.para.y - s.tween.de.y) * e };
        if (k >= 1) s.tween.fim();
      }
      if (s.fade) {
        const k = Math.min(1, (t - s.fade.t0) / s.fade.dur);
        s.alfa = 1 - k;
        if (raiz.current) raiz.current.style.opacity = String(s.alfa);
        if (k >= 1) {
          const f = s.fade.fim;
          s.fade = null;
          f();
        }
      }

      const mats = fk(ossos, pose, { x: x + s.off.x, y: y + s.off.y, esc: skin.esc * escala, vira: s.vira });
      s.mats = mats;
      const principal = partes.current[0];
      if (principal) for (const [nome, g] of principal) g.setAttribute("transform", matStr(mats[nome]));

      // rastro
      if (s.rastro && t - s.ultRastro > 34) {
        s.ultRastro = t;
        s.hist.unshift(mats);
        s.hist.length = Math.min(s.hist.length, fantasmas);
      }
      for (let i = 0; i < fantasmas; i++) {
        const g = fantasmasG.current[i];
        const mapa = partes.current[i + 1];
        const h = s.hist[i];
        if (!g || !mapa) continue;
        if (!h) {
          g.style.opacity = "0";
          continue;
        }
        g.style.opacity = String(0.55 * (1 - i / fantasmas));
        for (const [nome, el] of mapa) el.setAttribute("transform", matStr(h[nome]));
      }
    },
  }));

  const desenho = (
    <>
      {ORDEM.map((p) => (
        <g key={p} data-o={p}>
          {skin.partes[p]}
        </g>
      ))}
    </>
  );

  return (
    <g ref={raiz}>
      <defs>
        {skin.defs}
        <filter id={filtro} x="-50%" y="-50%" width="200%" height="200%">
          <feFlood floodColor={skin.rastro ?? "#fff"} />
          <feComposite in2="SourceAlpha" operator="in" />
        </filter>
      </defs>
      {Array.from({ length: fantasmas }, (_, i) => (
        <g
          key={i}
          ref={(el) => {
            if (el) fantasmasG.current[i] = el;
            coletar(el, i + 1);
          }}
          filter={`url(#${filtro})`}
          style={{ opacity: 0 }}
        >
          {desenho}
        </g>
      ))}
      <g ref={(el) => coletar(el, 0)}>{desenho}</g>
    </g>
  );
});

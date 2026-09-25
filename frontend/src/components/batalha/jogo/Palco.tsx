// Palco da Batalha: cenário do tema, herói e vilão articulados, camada de efeitos e o HUD
// no estilo dos jogos de monstrinho (caixas de nome com HP e a caixa de texto).
//
// Tem relógio de jogo próprio: congelar (hitstop no impacto) e câmera lenta afetam os
// bonecos e as esperas das coreografias (coreografias.ts), não o resto da página.
import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { Tema } from "../../../store/theme";
import type { TipoQuestao } from "../tipos";
import { Boneco, type BonecoApi } from "./Boneco";
import { Fx } from "./fx";
import { skinHeroi, skinVilao } from "./skins";

export const CASA_HEROI = { x: 300, y: 440 };
export const CASA_VILAO = { x: 700, y: 440 };
const ESCALA = 1.22; // bonecos do palco maiores que no lobby

type P = { x: number; y: number };

export interface PalcoApi {
  heroi(): BonecoApi | null;
  vilao(): BonecoApi | null;
  fx(): Fx | null;
  esperar(ms: number): Promise<void>;
  congelar(ms: number): void;
  lento(fator: number, ms: number): void;
  tremer(forca?: number): void;
  zoom(p: P, k: number, ms: number): void;
  flash(cor: string): void;
  banner(texto: string, sub?: string, cor?: string): void;
}

export interface VilaoInfo {
  chave: string; // muda = outro vilão (remonta o boneco)
  nome: string;
  nivel: number | null;
  tipo: TipoQuestao;
  chefe: boolean;
  retorno: boolean;
  hp: number;
  entrada?: { x: number; y: number };
}

interface Props {
  tema: Tema;
  estagio: number;
  heroi: { nome: string; nivel: number; hp: number; hpMax: number; xp: number; xpProx: number; entrada?: { x: number; y: number } };
  vilao: VilaoInfo | null;
  mensagem: string;
  aguardando?: boolean;
  topo?: ReactNode; // chips/botões por cima do palco
}

// Número que corre até o valor novo (HP caindo ou subindo)
function useContador(valor: number) {
  const [mostrado, setMostrado] = useState(valor);
  const atual = useRef(valor);
  useEffect(() => {
    const de = atual.current;
    if (de === valor) return;
    const ini = performance.now();
    let raf = 0;
    const passo = (t: number) => {
      const k = Math.min(1, (t - ini) / 650);
      const v = Math.round(de + (valor - de) * k);
      atual.current = v;
      setMostrado(v);
      if (k < 1) raf = requestAnimationFrame(passo);
    };
    raf = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(raf);
  }, [valor]);
  return mostrado;
}

function BarraHp({ valor, max }: { valor: number; max: number }) {
  const pct = Math.max(0, Math.min(100, (valor / max) * 100));
  const cor = pct > 50 ? "#3BC46B" : pct > 20 ? "#F2B92E" : "#E8474C";
  return (
    <div className="bt-hp">
      <span className="bt-hp__rotulo">HP</span>
      <div className="bt-hp__trilho">
        <div className="bt-hp__rastro" style={{ width: `${pct}%` }} />
        <div className={`bt-hp__barra ${pct <= 20 ? "bt-hp__barra--critico" : ""}`} style={{ width: `${pct}%`, background: cor }} />
      </div>
    </div>
  );
}

export const Palco = forwardRef<PalcoApi, Props>(function Palco({ tema, estagio, heroi, vilao, mensagem, aguardando, topo }, ref) {
  const heroiRef = useRef<BonecoApi>(null);
  const vilaoRef = useRef<BonecoApi>(null);
  const camadaFx = useRef<SVGGElement>(null);
  const fxRef = useRef<Fx | null>(null);
  const camZoom = useRef<SVGGElement>(null);
  const camTremor = useRef<SVGGElement>(null);
  const [flash, setFlash] = useState<{ n: number; cor: string } | null>(null);
  const [banner, setBanner] = useState<{ n: number; texto: string; sub?: string; cor: string } | null>(null);
  const hp = useContador(heroi.hp);

  const rel = useRef({ t: 0, ultimo: 0, congeladoAte: 0, lentoAte: 0, lentoFator: 1, timers: [] as { ate: number; r: () => void }[] });

  useEffect(() => {
    if (camadaFx.current) fxRef.current = new Fx(camadaFx.current);
  }, []);

  // Laço de jogo
  useEffect(() => {
    let raf = 0;
    rel.current.ultimo = performance.now();
    const passo = (agora: number) => {
      const r = rel.current;
      let dt = Math.max(0, Math.min(50, agora - r.ultimo));
      r.ultimo = agora;
      if (agora < r.congeladoAte) dt = 0;
      else if (agora < r.lentoAte) dt *= r.lentoFator;
      r.t += dt;
      heroiRef.current?.atualizar(r.t);
      vilaoRef.current?.atualizar(r.t);
      if (r.timers.length) {
        const prontos = r.timers.filter((x) => x.ate <= r.t);
        r.timers = r.timers.filter((x) => x.ate > r.t);
        prontos.forEach((x) => x.r());
      }
      raf = requestAnimationFrame(passo);
    };
    raf = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(raf);
  }, []);

  useImperativeHandle(ref, () => ({
    heroi: () => heroiRef.current,
    vilao: () => vilaoRef.current,
    fx: () => fxRef.current,
    esperar(ms) {
      return new Promise((r) => rel.current.timers.push({ ate: rel.current.t + ms, r }));
    },
    congelar(ms) {
      rel.current.congeladoAte = performance.now() + ms;
    },
    lento(fator, ms) {
      rel.current.lentoFator = fator;
      rel.current.lentoAte = performance.now() + ms;
    },
    tremer(forca = 1) {
      const f = 9 * forca;
      camTremor.current?.animate(
        [
          { transform: "translate(0,0)" },
          { transform: `translate(${-f}px,${f * 0.5}px)` },
          { transform: `translate(${f * 0.8}px,${-f * 0.6}px)` },
          { transform: `translate(${-f * 0.5}px,${f * 0.3}px)` },
          { transform: `translate(${f * 0.2}px,${-f * 0.1}px)` },
          { transform: "translate(0,0)" },
        ],
        { duration: 360, easing: "ease-out" }
      );
    },
    zoom(p, k, ms) {
      const el = camZoom.current;
      if (!el) return;
      el.style.transformOrigin = `${p.x}px ${p.y}px`;
      el.animate([{ transform: "scale(1)" }, { transform: `scale(${k})`, offset: 0.25 }, { transform: `scale(${k})`, offset: 0.7 }, { transform: "scale(1)" }], { duration: ms, easing: "cubic-bezier(.3,0,.2,1)" });
    },
    flash(cor) {
      setFlash((f) => ({ n: (f?.n ?? 0) + 1, cor }));
    },
    banner(texto, sub, cor = "#141018") {
      setBanner((b) => ({ n: (b?.n ?? 0) + 1, texto, sub, cor }));
    },
  }));

  const skinH = skinHeroi(tema, estagio);

  return (
    <div className="jg-palco" data-arena={tema}>
      <svg className="jg-palco__svg" viewBox="0 0 1000 520" preserveAspectRatio="xMidYMid slice">
        <g ref={camZoom} style={{ transformBox: "view-box" }}>
          <g ref={camTremor}>
            <Cenario tema={tema} />
            <ellipse cx={CASA_HEROI.x} cy={CASA_HEROI.y + 6} rx="92" ry="16" className="jg-plataforma" />
            <ellipse cx={CASA_VILAO.x} cy={CASA_VILAO.y + 6} rx="92" ry="16" className="jg-plataforma" />
            {vilao && (
              <Boneco
                key={`${vilao.chave}-${vilao.chefe}`}
                ref={vilaoRef}
                skin={skinVilao(vilao.tipo, { chefe: vilao.chefe, nivel: vilao.nivel ?? 0 })}
                x={CASA_VILAO.x}
                y={CASA_VILAO.y}
                vira
                fantasmas={3}
                clipeInicial="solto"
                inicio={vilao.entrada}
                escala={ESCALA}
              />
            )}
            <Boneco key={`h-${tema}-${estagio}`} ref={heroiRef} skin={skinH} x={CASA_HEROI.x} y={CASA_HEROI.y} inicio={heroi.entrada} escala={ESCALA} />
            <g ref={camadaFx} />
          </g>
        </g>
      </svg>

      {flash && <div key={`f${flash.n}`} className="jg-flash" style={{ background: flash.cor }} />}
      {banner && (
        <div key={`b${banner.n}`} className="bt-fx-banner jg-banner" style={{ "--cor": banner.cor } as CSSProperties}>
          <span className="bt-fx-banner__texto">{banner.texto}</span>
          {banner.sub && <span className="bt-fx-banner__sub">{banner.sub}</span>}
        </div>
      )}

      {topo && <div className="jg-topo">{topo}</div>}

      {vilao && (
        <div className="bt-info jg-info--vilao" key={`i-${vilao.chave}-${vilao.retorno}`}>
          <div className="flex items-baseline justify-between gap-2">
            <span className="truncate font-bold">{vilao.nome}</span>
            <span className="shrink-0 text-[11px] font-bold">{vilao.nivel === null ? "NOVA" : `Nv.${vilao.nivel}`}</span>
          </div>
          <div className="mt-0.5 flex items-center gap-1.5">
            <span className="bt-tipo" style={{ background: vilao.tipo.cor }}>
              {vilao.tipo.nome}
            </span>
            {vilao.chefe && <span className="bt-tipo bt-tipo--chefe">CHEFE</span>}
            {vilao.retorno && <span className="bt-tipo" style={{ background: "#6B7280" }}>VOLTOU</span>}
          </div>
          <BarraHp valor={vilao.hp} max={100} />
        </div>
      )}

      <div className="bt-info jg-info--heroi">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate font-bold">{heroi.nome}</span>
          <span key={heroi.nivel} className="bt-nivel shrink-0 text-[11px] font-bold">
            Nv.{heroi.nivel}
          </span>
        </div>
        <BarraHp valor={heroi.hp} max={heroi.hpMax} />
        <div className="flex items-center justify-between text-[10px] font-bold tabular-nums">
          <div className="bt-xp">
            <div style={{ width: `${Math.min(100, (heroi.xp / heroi.xpProx) * 100)}%` }} />
          </div>
          <span>
            {hp}/{heroi.hpMax}
          </span>
        </div>
      </div>

      <div className="bt-texto jg-texto" aria-live="polite">
        <span key={mensagem} className="bt-texto__msg">
          {mensagem}
        </span>
        {aguardando && <span className="bt-texto__seta">▼</span>}
      </div>
    </div>
  );
});

// ---------- cenários ----------

function Cenario({ tema }: { tema: Tema }) {
  switch (tema) {
    case "aranha":
      return <CenarioCidade />;
    case "venom":
      return <CenarioBeco />;
    case "cyberpunk":
      return <CenarioNeon />;
    case "fantasy":
      return <CenarioAtlas />;
    case "rose":
      return <CenarioCeu />;
  }
}

function CenarioCidade() {
  return (
    <g>
      <defs>
        <linearGradient id="cc-ceu" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFD89A" />
          <stop offset="1" stopColor="#FF9B7A" />
        </linearGradient>
        <pattern id="cc-ret" width="10" height="10" patternUnits="userSpaceOnUse">
          <circle cx="5" cy="5" r="1.6" fill="rgba(212,25,44,.25)" />
        </pattern>
      </defs>
      <rect width="1000" height="520" fill="url(#cc-ceu)" />
      <rect width="1000" height="520" fill="url(#cc-ret)" />
      <circle cx="820" cy="120" r="60" fill="#FFF3C4" opacity=".85" />
      <g className="jg-nuvem" fill="#FFF6E3" opacity=".9">
        <ellipse cx="180" cy="90" rx="70" ry="18" />
        <ellipse cx="230" cy="78" rx="40" ry="16" />
      </g>
      <g className="jg-nuvem jg-nuvem--lenta" fill="#FFF6E3" opacity=".7">
        <ellipse cx="620" cy="60" rx="80" ry="14" />
      </g>
      {/* prédios ao fundo */}
      <g fill="#1446A0" opacity=".55">
        <path d="M0 330 V220 H60 V180 H120 V250 H170 V160 H240 V300 H290 V200 H350 V330Z" />
        <path d="M650 330 V210 H700 V150 H770 V240 H820 V190 H880 V260 H930 V170 H1000 V330Z" />
      </g>
      <g fill="#D4192C" opacity=".75">
        <path d="M330 330 V240 H380 V190 H440 V270 H500 V230 H560 V330Z" />
        <rect x="560" y="200" width="70" height="130" />
      </g>
      <g fill="#FFF3C4" opacity=".8">
        {Array.from({ length: 24 }, (_, i) => (
          <rect key={i} x={20 + ((i * 41) % 960)} y={230 + ((i * 23) % 80)} width="8" height="10" className={i % 3 ? undefined : "jg-pisca"} style={{ animationDelay: `${i * 0.3}s` }} />
        ))}
      </g>
      {/* caixa d'água */}
      <g transform="translate(860 300)">
        <rect x="-26" y="-50" width="52" height="46" rx="6" fill="#6B4423" stroke="#141018" strokeWidth="3" />
        <path d="M-30 -50 L0 -72 L30 -50Z" fill="#8B5A2B" stroke="#141018" strokeWidth="3" />
        <path d="M-20 -4 L-24 40 M20 -4 L24 40 M-22 18 H22" stroke="#141018" strokeWidth="3" />
      </g>
      {/* telhado */}
      <path d="M0 360 H1000 V520 H0Z" fill="#3A2F3F" />
      <path d="M0 360 H1000" stroke="#141018" strokeWidth="6" />
      <path d="M0 372 H1000" stroke="#5B4C5F" strokeWidth="3" />
      {/* teia no canto */}
      <g fill="none" stroke="#141018" strokeWidth="1.2" opacity=".5">
        <path d="M0 0 L140 120 M0 0 L60 160 M0 0 L170 40 M0 0 L10 170" />
        <path d="M40 34 Q20 50 18 70 M80 70 Q44 96 36 126 M110 26 Q84 56 80 70 M150 36 Q120 90 116 100" />
      </g>
    </g>
  );
}

function CenarioBeco() {
  return (
    <g>
      <defs>
        <linearGradient id="cb-ceu" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#05060A" />
          <stop offset="1" stopColor="#1A1D2E" />
        </linearGradient>
        <radialGradient id="cb-lua">
          <stop offset="0" stopColor="#DDE3FF" />
          <stop offset=".6" stopColor="#8E9BD6" stopOpacity=".3" />
          <stop offset="1" stopColor="#8E9BD6" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="1000" height="520" fill="url(#cb-ceu)" />
      <circle cx="760" cy="110" r="120" fill="url(#cb-lua)" />
      <circle cx="760" cy="110" r="42" fill="#DDE3FF" />
      {/* paredes de tijolo nas laterais */}
      <path d="M0 0 H150 L190 360 H0Z" fill="#12141F" />
      <path d="M1000 0 H850 L810 360 H1000Z" fill="#12141F" />
      <g stroke="#1E2233" strokeWidth="2">
        {Array.from({ length: 12 }, (_, i) => (
          <path key={i} d={`M0 ${30 + i * 28} H${150 + i * 3.2} M1000 ${30 + i * 28} H${850 - i * 3.2}`} />
        ))}
      </g>
      {/* gosma escorrendo do alto */}
      {[220, 330, 470, 610, 720].map((x, i) => (
        <path key={x} d={`M${x - 14} 0 C${x - 14} 30 ${x - 6} 40 ${x} 60 C${x + 6} 40 ${x + 14} 30 ${x + 14} 0Z`} fill="#07080D" stroke="#3A4270" strokeWidth="1.5" className="jg-goteja" style={{ animationDelay: `${i * 0.7}s` }} />
      ))}
      <g className="jg-nevoa" fill="#3A4270" opacity=".25">
        <ellipse cx="300" cy="380" rx="260" ry="30" />
        <ellipse cx="760" cy="400" rx="220" ry="24" />
      </g>
      <path d="M0 360 H1000 V520 H0Z" fill="#0B0D16" />
      <path d="M0 360 H1000" stroke="#3A4270" strokeWidth="3" />
      <ellipse cx="500" cy="470" rx="220" ry="20" fill="#1F2438" opacity=".7" />
    </g>
  );
}

function CenarioNeon() {
  return (
    <g>
      <defs>
        <linearGradient id="cn-ceu" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#07070D" />
          <stop offset="1" stopColor="#2A1640" />
        </linearGradient>
        <pattern id="cn-chuva" width="40" height="80" patternUnits="userSpaceOnUse">
          <path d="M30 0 L22 30" stroke="rgba(0,240,255,.35)" strokeWidth="1.2" />
          <path d="M10 40 L2 70" stroke="rgba(255,255,255,.2)" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="1000" height="520" fill="url(#cn-ceu)" />
      {/* prédios com janelas */}
      <g fill="#100F1C" stroke="#241F3A" strokeWidth="2">
        <path d="M0 360 V140 H90 V60 H150 V200 H220 V100 H300 V360Z" />
        <path d="M700 360 V120 H760 V40 H830 V180 H900 V90 H1000 V360Z" />
        <path d="M300 360 V230 H380 V180 H460 V360Z" />
        <path d="M560 360 V200 H640 V160 H700 V360Z" />
      </g>
      <g>
        {Array.from({ length: 50 }, (_, i) => {
          const x = [10, 100, 160, 230, 310, 390, 570, 650, 710, 770, 840, 910][i % 12] + ((i * 7) % 40);
          const y = 150 + ((i * 37) % 180);
          return <rect key={i} x={x} y={y} width="10" height="5" fill={i % 3 === 0 ? "#FF2A6D" : i % 3 === 1 ? "#00F0FF" : "#FCEE0A"} opacity=".7" className={i % 4 ? undefined : "jg-pisca"} style={{ animationDelay: `${(i % 7) * 0.4}s` }} />;
        })}
      </g>
      {/* letreiros de neon */}
      <g className="jg-neon" style={{ filter: "drop-shadow(0 0 6px #FF2A6D)" }}>
        <rect x="120" y="90" width="18" height="90" rx="4" fill="none" stroke="#FF2A6D" strokeWidth="4" />
        <path d="M124 104 H134 M124 124 H134 M124 144 H134 M124 164 H134" stroke="#FF2A6D" strokeWidth="3" />
      </g>
      <g className="jg-neon jg-neon--2" style={{ filter: "drop-shadow(0 0 6px #00F0FF)" }}>
        <rect x="780" y="70" width="90" height="26" rx="6" fill="none" stroke="#00F0FF" strokeWidth="4" />
        <path d="M792 83 H858" stroke="#00F0FF" strokeWidth="3" strokeDasharray="10 6" />
      </g>
      <rect width="1000" height="520" fill="url(#cn-chuva)" className="jg-chuva" />
      {/* rua molhada com grade */}
      <path d="M0 360 H1000 V520 H0Z" fill="#0B0A14" />
      <path d="M0 360 H1000" stroke="#00F0FF" strokeWidth="3" style={{ filter: "drop-shadow(0 0 6px #00F0FF)" }} />
      <g stroke="rgba(255,42,109,.35)" strokeWidth="1.5">
        {Array.from({ length: 12 }, (_, i) => (
          <path key={i} d={`M${500 + (i - 6) * 40} 360 L${500 + (i - 6) * 150} 520`} />
        ))}
        <path d="M0 400 H1000 M0 450 H1000" />
      </g>
    </g>
  );
}

function CenarioAtlas() {
  return (
    <g>
      <defs>
        <linearGradient id="ca-ceu" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0B0730" />
          <stop offset="1" stopColor="#2A1C8A" />
        </linearGradient>
      </defs>
      <rect width="1000" height="520" fill="url(#ca-ceu)" />
      {Array.from({ length: 40 }, (_, i) => (
        <circle key={i} cx={(i * 97) % 1000} cy={(i * 53) % 300} r={i % 5 === 0 ? 2.2 : 1.2} fill="#fff" className="jg-pisca" style={{ animationDelay: `${(i % 9) * 0.35}s` }} />
      ))}
      <circle cx="180" cy="110" r="46" fill="#F4F1FF" opacity=".9" />
      <circle cx="198" cy="98" r="46" fill="#1A1060" opacity=".9" />
      {/* montanhas em curvas de nível */}
      <g fill="none" stroke="#C9C2FF" strokeWidth="1.4" opacity=".55">
        <path d="M0 330 C120 240 220 250 330 320 C420 260 520 200 640 290 C760 220 880 250 1000 310" />
        <path d="M0 345 C120 270 220 280 330 335 C420 290 520 240 640 310 C760 260 880 280 1000 330" />
        <path d="M0 358 C140 300 230 310 340 350 C430 320 520 280 640 330 C760 300 880 310 1000 350" />
      </g>
      <path d="M0 360 H1000 V520 H0Z" fill="#150C4A" />
      <g fill="none" stroke="#6B5CFF" strokeWidth="1.2" opacity=".5">
        <ellipse cx="500" cy="450" rx="420" ry="50" />
        <ellipse cx="500" cy="450" rx="300" ry="34" />
        <ellipse cx="500" cy="450" rx="170" ry="18" />
      </g>
    </g>
  );
}

function CenarioCeu() {
  return (
    <g>
      <defs>
        <linearGradient id="cr-ceu" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#A9C4FF" />
          <stop offset="1" stopColor="#EEF4FF" />
        </linearGradient>
      </defs>
      <rect width="1000" height="520" fill="url(#cr-ceu)" />
      <circle cx="840" cy="90" r="70" fill="#fff" opacity=".7" />
      {[
        [120, 80, 90],
        [420, 50, 70],
        [700, 150, 110],
        [260, 200, 60],
      ].map(([x, y, r], i) => (
        <g key={i} className={i % 2 ? "jg-nuvem" : "jg-nuvem jg-nuvem--lenta"} fill="#fff" opacity=".9">
          <ellipse cx={x} cy={y} rx={r} ry={r * 0.28} />
          <ellipse cx={x + r * 0.35} cy={y - r * 0.18} rx={r * 0.5} ry={r * 0.25} />
        </g>
      ))}
      <path d="M0 330 H1000" stroke="#7F9BD0" strokeWidth="2" opacity=".6" />
      <path d="M0 336 H1000 V360 H0Z" fill="#C9D7F4" opacity=".6" />
      {/* ilha flutuante ao fundo */}
      <path d="M560 260 H660 L640 290 L600 300 L580 285Z" fill="#DCE6FA" stroke="#7F9BD0" strokeWidth="2" className="jg-flutua" />
      <path d="M0 360 H1000 V520 H0Z" fill="#E4ECFF" />
      <path d="M0 360 H1000" stroke="#7F9BD0" strokeWidth="4" />
      <g stroke="#9DB4E0" strokeWidth="2" opacity=".6" className="jg-vento-chao">
        <path d="M100 420 H180 M600 470 H700 M820 410 H880" strokeLinecap="round" />
      </g>
    </g>
  );
}

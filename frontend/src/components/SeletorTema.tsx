// Troca de tema num dock, no estilo do macOS: um ícone por tema, com o nome em balão.
// - Desktop: dock flutuante no pé da área de conteúdo; os ícones crescem conforme o
//   mouse passa (magnificação por distância) e o ativo leva um pontinho embaixo.
//   Some durante uma sessão de questões (a mesma pausa do fundo), para não cobrir botões.
// - Celular: um botão no topo abre o mesmo dock logo abaixo dele, sem magnificação.
import { useEffect, useRef, useState, type ComponentType, type MouseEvent } from "react";
import { Bird, Cpu, Mountain } from "lucide-react";
import { TEMAS, nomeDoTema, preCarregarTransicao, useTheme, type Tema } from "../store/theme";
import { useFundoPausado } from "../store/fundo";
import { SimboloAranha, SimboloVenom } from "./SimbolosHeroi";

const ICONES: Record<Tema, ComponentType<{ size?: number | string; strokeWidth?: number | string }>> = {
  fantasy: Mountain,
  rose: Bird,
  cyberpunk: Cpu,
  aranha: SimboloAranha,
  venom: SimboloVenom,
};

// Tamanho do ícone parado, no pico da magnificação, e o alcance do efeito (px).
const BASE = 42;
const PICO = 66;
const ALCANCE = 150;

// Centro do botão clicado: é de lá que a animação de entrada do tema nasce.
function origemDo(e: MouseEvent<HTMLElement>) {
  const r = e.currentTarget.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

export function IconeTema({ tema, size = 16 }: { tema: Tema; size?: number }) {
  const Icone = ICONES[tema];
  return <Icone size={size} strokeWidth={1.8} />;
}

function Dock({ magnificar, aoEscolher }: { magnificar: boolean; aoEscolher?: () => void }) {
  const { tema, definir } = useTheme();
  const [mouseX, setMouseX] = useState<number | null>(null);
  const itens = useRef<(HTMLButtonElement | null)[]>([]);

  function tamanho(i: number) {
    const el = itens.current[i];
    if (!magnificar || mouseX === null || !el) return BASE;
    const r = el.getBoundingClientRect();
    const d = Math.abs(mouseX - (r.left + r.width / 2));
    const t = Math.max(0, 1 - d / ALCANCE);
    // cosseno: cresce suave perto do mouse e cai a zero na borda do alcance
    return BASE + (PICO - BASE) * (0.5 - 0.5 * Math.cos(Math.PI * t));
  }

  return (
    <div
      role="group"
      aria-label="Tema"
      className="dock-temas flex items-end gap-2 rounded-2xl border border-hair bg-surface px-2.5 pb-2 pt-2 shadow-lg"
      onMouseMove={(e) => magnificar && setMouseX(e.clientX)}
      onMouseLeave={() => setMouseX(null)}
    >
      {TEMAS.map((t, i) => {
        const ativo = t.id === tema;
        const lado = tamanho(i);
        return (
          <div key={t.id} className="group relative flex flex-col items-center">
            <span className="dock-temas__balao pointer-events-none absolute -top-9 whitespace-nowrap rounded-md border border-hair bg-surface px-2 py-0.5 text-xs font-semibold text-brand-ink opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
              {t.nome}
            </span>
            <button
              ref={(el) => {
                itens.current[i] = el;
              }}
              onClick={(e) => {
                definir(t.id, origemDo(e));
                aoEscolher?.();
              }}
              onPointerEnter={() => preCarregarTransicao(t.id)}
              onFocus={() => preCarregarTransicao(t.id)}
              aria-pressed={ativo}
              aria-label={`Modo ${t.nome}`}
              className="flex items-center justify-center rounded-xl border border-hair transition-[width,height,transform] duration-100 ease-out active:scale-90"
              style={{
                width: lado,
                height: lado,
                background: ativo ? "var(--accent)" : "var(--surface2)",
                color: ativo ? "var(--onAccent)" : undefined,
              }}
            >
              <IconeTema tema={t.id} size={Math.round(lado * 0.46)} />
            </button>
            <span
              className="mt-1 h-1 w-1 rounded-full transition-opacity"
              style={{ background: "var(--accent)", opacity: ativo ? 1 : 0 }}
              aria-hidden
            />
          </div>
        );
      })}
    </div>
  );
}

/** Desktop: dock flutuante centrado na área de conteúdo (à direita da barra lateral). */
export function DockTemas() {
  const pausado = useFundoPausado();
  if (pausado) return null;
  return (
    <div className="fixed bottom-4 left-[calc(50%+118px)] z-30 hidden -translate-x-1/2 lg:block">
      <Dock magnificar />
    </div>
  );
}

/** Celular: botão no topo que abre o dock logo abaixo. */
export function BotaoTemas({ className = "" }: { className?: string }) {
  const { tema } = useTheme();
  const [aberto, setAberto] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: PointerEvent) => {
      if (!caixa.current?.contains(e.target as Node)) setAberto(false);
    };
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    document.addEventListener("pointerdown", fora);
    window.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("pointerdown", fora);
      window.removeEventListener("keydown", tecla);
    };
  }, [aberto]);

  return (
    <div ref={caixa} className="relative lg:hidden">
      <button
        onClick={() => setAberto((a) => !a)}
        onPointerDown={() => TEMAS.forEach((t) => preCarregarTransicao(t.id))}
        className={className}
        aria-expanded={aberto}
        aria-label={`Tema ${nomeDoTema(tema)}. Escolher tema`}
        title={`Modo ${nomeDoTema(tema)}`}
      >
        <IconeTema tema={tema} size={18} />
      </button>
      {aberto && (
        <div className="absolute right-0 top-full z-40 mt-2">
          <Dock magnificar={false} aoEscolher={() => setAberto(false)} />
        </div>
      )}
    </div>
  );
}

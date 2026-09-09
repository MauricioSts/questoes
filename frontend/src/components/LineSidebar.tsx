import {
  useRef,
  useState,
  useCallback,
  useEffect,
  useLayoutEffect,
  type CSSProperties,
} from "react";
import { Link, useLocation } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import "./LineSidebar.css";

export interface LineSidebarItem {
  to: string;
  label: string;
  icon?: LucideIcon;
  end?: boolean;
}

export interface LineSidebarProps {
  items: LineSidebarItem[];
  accentColor?: string;
  textColor?: string;
  markerColor?: string;
  showIndex?: boolean;
  showMarker?: boolean;
  proximityRadius?: number;
  maxShift?: number;
  falloff?: "linear" | "smooth" | "sharp";
  markerLength?: number;
  markerGap?: number;
  tickScale?: number;
  scaleTick?: boolean;
  itemGap?: number;
  /** Altura mínima do gap quando `fillHeight` está ligado. */
  minItemGap?: number;
  /** Distribui os itens até o último encostar no fim, usando `itemGap` como teto. */
  fillHeight?: boolean;
  /** Número = rem. String = valor CSS cru (ex.: "clamp(.82rem, 1.15vh, 1.05rem)"). */
  fontSize?: number | string;
  smoothing?: number;
  className?: string;
}

const FALLOFF_CURVES = {
  linear: (p: number) => p,
  smooth: (p: number) => p * p * (3 - 2 * p),
  sharp: (p: number) => p * p * p,
};

export function LineSidebar({
  items,
  accentColor = "#e4bc45",
  textColor = "#b0a2cb",
  markerColor = "#3d2f5c",
  showIndex = false,
  showMarker = true,
  proximityRadius = 55,
  maxShift = 60,
  falloff = "smooth",
  markerLength = 32,
  markerGap = 8,
  tickScale = 0.45,
  scaleTick = true,
  itemGap = 48,
  minItemGap = 4,
  fillHeight = false,
  fontSize = "clamp(0.82rem, 1.15vh, 1.05rem)",
  smoothing = 60,
  className = "",
}: LineSidebarProps) {
  const location = useLocation();
  const navRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);
  const targetsRef = useRef<number[]>([]);
  const currentRef = useRef<number[]>([]);
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef(0);
  const smoothingRef = useRef(smoothing);
  const activeRef = useRef<number>(-1);
  const [effectiveGap, setEffectiveGap] = useState(itemGap);

  // Determina o índice ativo com base na rota atual
  const activeIndex = items.findIndex((item) =>
    item.end
      ? location.pathname === item.to
      : location.pathname === item.to || location.pathname.startsWith(item.to + "/")
  );

  activeRef.current = activeIndex;
  smoothingRef.current = smoothing;

  // Loop rAF com suavização exponencial frame-rate independent
  const runFrame = useCallback((now: number) => {
    const dt = Math.min((now - lastRef.current) / 1000, 0.05);
    lastRef.current = now;
    const tau = Math.max(smoothingRef.current, 1) / 1000;
    const k = 1 - Math.exp(-dt / tau);

    let moving = false;
    const itemEls = itemRefs.current;
    for (let i = 0; i < itemEls.length; i++) {
      const el = itemEls[i];
      if (!el) continue;
      const target = Math.max(targetsRef.current[i] || 0, activeRef.current === i ? 1 : 0);
      const cur = currentRef.current[i] || 0;
      const next = cur + (target - cur) * k;
      const settled = Math.abs(target - next) < 0.0015;
      const value = settled ? target : next;
      currentRef.current[i] = value;
      el.style.setProperty("--effect", value.toFixed(4));
      if (!settled) moving = true;
    }

    rafRef.current = moving ? requestAnimationFrame(runFrame) : null;
  }, []);

  const startLoop = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
    }
    lastRef.current = performance.now();
    rafRef.current = requestAnimationFrame(runFrame);
  }, [runFrame]);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const list = listRef.current;
      if (!list) return;
      const rect = list.getBoundingClientRect();
      const pointerY = e.clientY - rect.top;
      const ease = FALLOFF_CURVES[falloff] ?? FALLOFF_CURVES.linear;
      const itemEls = itemRefs.current;
      for (let i = 0; i < itemEls.length; i++) {
        const el = itemEls[i];
        if (!el) continue;
        const midY = el.offsetTop + el.offsetHeight / 2;
        const dist = Math.abs(pointerY - midY);
        targetsRef.current[i] = ease(Math.max(0, 1 - dist / proximityRadius));
      }
      startLoop();
    },
    [falloff, proximityRadius, startLoop]
  );

  const handlePointerLeave = useCallback(() => {
    targetsRef.current = targetsRef.current.map(() => 0);
    startLoop();
  }, [startLoop]);

  useEffect(() => {
    startLoop();
  }, [activeIndex, startLoop]);

  // Gap real: usa itemGap como teto e encolhe até o último item encostar no fim.
  useLayoutEffect(() => {
    if (!fillHeight) {
      setEffectiveGap(itemGap);
      return;
    }
    const nav = navRef.current;
    const list = listRef.current;
    if (!nav || !list) return;

    const measure = () => {
      const els = itemRefs.current.filter(Boolean) as HTMLLIElement[];
      if (els.length < 2) return;
      const cs = getComputedStyle(list);
      const padding = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
      const available = nav.clientHeight - padding;
      const content = els.reduce((sum, el) => sum + el.offsetHeight, 0);
      const gap = (available - content) / (els.length - 1);
      setEffectiveGap(Math.max(minItemGap, Math.min(itemGap, gap)));
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(nav);
    return () => ro.disconnect();
  }, [fillHeight, itemGap, minItemGap, items.length, fontSize]);

  useEffect(() => {
    return () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, []);

  const tickClass = showMarker
    ? `line-sidebar__item ${
        scaleTick ? "line-sidebar--scale-tick" : ""
      }`
    : "line-sidebar__item";

  return (
    <nav
      ref={navRef}
      className={`line-sidebar ${showMarker ? "line-sidebar--markers" : ""} ${
        scaleTick ? "line-sidebar--scale-tick" : ""
      } ${fillHeight ? "line-sidebar--fill" : ""} ${className}`.trim()}
      style={
        {
          "--accent-color": accentColor,
          "--text-color": textColor,
          "--marker-color": markerColor,
          "--marker-length": `${markerLength}px`,
          "--marker-gap": `${markerGap}px`,
          "--tick-scale": tickScale,
          "--max-shift": `${maxShift}px`,
          "--item-gap": `${fillHeight ? effectiveGap : itemGap}px`,
          "--font-size": typeof fontSize === "number" ? `${fontSize}rem` : fontSize,
          "--smoothing": `${smoothing}ms`,
        } as CSSProperties
      }
    >
      <ul
        ref={listRef}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        className="line-sidebar__list"
      >
        {items.map((item, index) => {
          const Icon = item.icon;
          const isActive = activeIndex === index;

          return (
            <li
              key={item.to}
              ref={(el) => {
                itemRefs.current[index] = el;
              }}
              aria-current={isActive ? "page" : undefined}
              className={tickClass}
            >
              {showMarker && (
                <span aria-hidden="true" className="line-sidebar__marker" />
              )}
              <Link to={item.to} className="line-sidebar__link">
                <span className="line-sidebar__label">
                  {showIndex && (
                    <span className="line-sidebar__index">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  )}
                  {Icon && (
                    <Icon
                      size={18}
                      strokeWidth={2}
                      className="mr-2.5 shrink-0 opacity-85"
                    />
                  )}
                  <span className="truncate font-semibold">{item.label}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

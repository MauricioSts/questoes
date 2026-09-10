import { useRef, useState, useLayoutEffect, type CSSProperties } from "react";
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
  markerLength?: number;
  markerGap?: number;
  tickScale?: number;
  itemGap?: number;
  /** Altura mínima do gap quando `fillHeight` está ligado. */
  minItemGap?: number;
  /** Distribui os itens até o último encostar no fim, usando `itemGap` como teto. */
  fillHeight?: boolean;
  /** Número = rem. String = valor CSS cru (ex.: "clamp(.82rem, 1.15vh, 1.05rem)"). */
  fontSize?: number | string;
  className?: string;
}

export function LineSidebar({
  items,
  accentColor = "#e4bc45",
  textColor = "#b0a2cb",
  markerColor = "#3d2f5c",
  showIndex = false,
  showMarker = true,
  markerLength = 32,
  markerGap = 8,
  tickScale = 0.45,
  itemGap = 48,
  minItemGap = 4,
  fillHeight = false,
  fontSize = "clamp(0.82rem, 1.15vh, 1.05rem)",
  className = "",
}: LineSidebarProps) {
  const location = useLocation();
  const navRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);
  const [effectiveGap, setEffectiveGap] = useState(itemGap);

  // Índice ativo com base na rota atual
  const activeIndex = items.findIndex((item) =>
    item.end
      ? location.pathname === item.to
      : location.pathname === item.to || location.pathname.startsWith(item.to + "/")
  );

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
      // Arredonda para inteiro: gap fracionário faz o texto tremer em subpixel.
      setEffectiveGap(Math.round(Math.max(minItemGap, Math.min(itemGap, gap))));
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(nav);
    return () => ro.disconnect();
  }, [fillHeight, itemGap, minItemGap, items.length, fontSize]);

  return (
    <nav
      ref={navRef}
      className={`line-sidebar ${showMarker ? "line-sidebar--markers" : ""} ${
        fillHeight ? "line-sidebar--fill" : ""
      } ${className}`.trim()}
      style={
        {
          "--accent-color": accentColor,
          "--text-color": textColor,
          "--marker-color": markerColor,
          "--marker-length": `${markerLength}px`,
          "--marker-gap": `${markerGap}px`,
          "--tick-scale": tickScale,
          "--item-gap": `${fillHeight ? effectiveGap : itemGap}px`,
          "--font-size": typeof fontSize === "number" ? `${fontSize}rem` : fontSize,
        } as CSSProperties
      }
    >
      <ul ref={listRef} className="line-sidebar__list">
        {items.map((item, index) => {
          const Icon = item.icon;
          const isActive = activeIndex === index;

          return (
            <li
              key={item.to}
              ref={(el) => {
                itemRefs.current[index] = el;
              }}
              className="line-sidebar__item"
            >
              {showMarker && (
                <span aria-hidden="true" className="line-sidebar__marker" />
              )}
              <Link
                to={item.to}
                aria-current={isActive ? "page" : undefined}
                className="line-sidebar__link"
              >
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
                      className="line-sidebar__icon"
                    />
                  )}
                  <span className="line-sidebar__text">{item.label}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

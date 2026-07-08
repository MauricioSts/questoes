// Barra de navegação inferior (mobile-first). Em telas grandes vira uma barra lateral.
import { NavLink } from "react-router-dom";

const tabs = [
  { to: "/", label: "Home", icon: "🎯", end: true },
  { to: "/estudar", label: "Estudar", icon: "📖" },
  { to: "/flash", label: "Flash", icon: "⚡" },
  { to: "/revisar", label: "Revisar", icon: "🔁" },
  { to: "/simulado", label: "Simulado", icon: "📝" },
  { to: "/stats", label: "Stats", icon: "📊" },
];

export function BottomTab() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/90 backdrop-blur
                 dark:border-slate-800 dark:bg-slate-900/90
                 sm:inset-y-0 sm:right-auto sm:w-20 sm:flex-col sm:border-r sm:border-t-0"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="flex items-stretch justify-around sm:h-full sm:flex-col sm:justify-start sm:gap-2 sm:pt-6">
        {tabs.map((t) => (
          <li key={t.to} className="flex-1 sm:flex-none">
            <NavLink
              to={t.to}
              end={t.end}
              className={({ isActive }) =>
                `tap flex flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium transition
                 ${isActive ? "text-brand" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"}`
              }
              aria-label={t.label}
            >
              <span className="text-lg" aria-hidden>
                {t.icon}
              </span>
              {t.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

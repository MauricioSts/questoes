import { NavLink } from "react-router-dom";
import { Home, BookOpen, Zap, RefreshCw, FileText, BarChart3, Shield } from "lucide-react";

const navItems = [
  { to: "/", label: "Home", icon: Home, end: true },
  { to: "/estudar", label: "Estudar", icon: BookOpen },
  { to: "/flash", label: "Flash", icon: Zap },
  { to: "/revisar", label: "Revisar", icon: RefreshCw },
  { to: "/simulado", label: "Simulado", icon: FileText },
  { to: "/stats", label: "Stats", icon: BarChart3 },
];

export function BottomTab() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-hair bg-white/92 backdrop-blur
                 lg:inset-y-0 lg:right-auto lg:w-[92px] lg:flex-col lg:border-r lg:border-t-0"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {/* Logo (desktop) */}
      <div className="hidden lg:flex items-center justify-center py-5">
        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-400 flex items-center justify-center shadow-lg shadow-brand-500/40">
          <Shield size={24} className="text-white" strokeWidth={2} />
        </div>
      </div>

      <ul className="flex items-stretch justify-around lg:flex-col lg:justify-start lg:gap-1 lg:px-2">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <li key={to} className="flex-1 lg:flex-none">
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 py-3 lg:py-3 lg:rounded-2xl transition text-[11px] font-semibold
                 ${
                   isActive
                     ? "text-brand-500 lg:bg-brand-500/10"
                     : "text-faint hover:text-brand-ink"
                 }`
              }
              aria-label={label}
              title={label}
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={22}
                    strokeWidth={isActive ? 2.2 : 1.8}
                    fill={label === "Flash" && isActive ? "currentColor" : "none"}
                  />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../store/auth";

// Bloqueia rotas quando não há sessão. Enquanto verifica, mostra um loader simples.
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { usuario, carregando } = useAuth();
  if (carregando) {
    return <div className="grid h-full place-items-center text-slate-400">Carregando…</div>;
  }
  if (!usuario) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

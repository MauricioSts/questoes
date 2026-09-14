import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../store/auth";
import { Carregando } from "./Spinner";

// Bloqueia rotas quando não há sessão. Enquanto verifica, mostra o spinner.
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { usuario, carregando } = useAuth();
  if (carregando) {
    return <Carregando className="h-full min-h-[50vh]" />;
  }
  if (!usuario) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

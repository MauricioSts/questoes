// Telas de administração do acervo. O servidor já recusa (requireAdmin); isto evita que
// a tela apareça e só falhe na hora de enviar.
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../store/auth";

export function RotaAdmin() {
  const { usuario } = useAuth();
  if (!usuario?.admin) return <Navigate to="/" replace />;
  return <Outlet />;
}

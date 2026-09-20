// Portão de entrada de conta nova: sem nenhuma trilha escolhida, o app não tem questões
// e quase toda tela apareceria vazia. Em vez disso, manda para a escolha da trilha.
// As duas telas do onboarding ficam de fora do desvio, senão o redirecionamento bate nelas
// mesmas e vira laço.
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useConcurso } from "../store/concurso";
import { Carregando } from "./Spinner";

const LIBERADAS = ["/trilhas", "/como-funciona"];

export function ExigeTrilha() {
  const { concursos, loading } = useConcurso();
  const { pathname } = useLocation();

  if (loading) return <Carregando className="h-full min-h-[50vh]" />;
  if (concursos.length === 0 && !LIBERADAS.includes(pathname)) {
    return <Navigate to="/trilhas" replace />;
  }
  return <Outlet />;
}

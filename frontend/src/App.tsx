import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./store/auth";
import { ThemeProvider } from "./store/theme";
import { ConcursoProvider } from "./store/concurso";
import { QuestoesProvider } from "./store/questoes";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AppLayout } from "./components/AppLayout";
import { Login } from "./pages/Login";
import { Home } from "./pages/Home";
import { Estudar } from "./pages/Estudar";
import { Batalha } from "./pages/Batalha";
import { Flash } from "./pages/Flash";
import { Topico } from "./pages/Topico";
import { Simulado } from "./pages/Simulado";
import { Stats } from "./pages/Stats";
import { Ranking } from "./pages/Ranking";
import { Marcadas } from "./pages/Marcadas";
import { Provas } from "./pages/Provas";
import { Anotacoes } from "./pages/Anotacoes";
import { Legislacao } from "./pages/Legislacao";
import { Erros } from "./pages/Erros";
import { Materias } from "./pages/Materias";
import { Revisar } from "./pages/Revisar";
import { Importar } from "./pages/Importar";
import { Caderno } from "./pages/Caderno";
import { ConcursoPicker } from "./pages/ConcursoPicker";
import { Trilhas } from "./pages/Trilhas";
import { ComoFunciona } from "./pages/ComoFunciona";
import { ExigeTrilha } from "./components/ExigeTrilha";
import { RotaAdmin } from "./components/RotaAdmin";
import { FronteiraErro } from "./components/FronteiraErro";

export default function App() {
  return (
    <FronteiraErro>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/registro" element={<Login modo="registro" />} />
              <Route
                element={
                  <ProtectedRoute>
                    <ConcursoProvider>
                      <QuestoesProvider>
                        <AppLayout />
                      </QuestoesProvider>
                    </ConcursoProvider>
                  </ProtectedRoute>
                }
              >
                <Route element={<ExigeTrilha />}>
                  <Route path="/" element={<Home />} />
                  <Route path="/trilhas" element={<Trilhas />} />
                  <Route path="/como-funciona" element={<ComoFunciona />} />
                  <Route path="/concursos" element={<ConcursoPicker />} />
                  <Route path="/estudar" element={<Estudar />} />
                  <Route path="/flash" element={<Flash />} />
                  <Route path="/topico" element={<Topico />} />
                  <Route path="/simulado" element={<Simulado />} />
                  <Route path="/revisar" element={<Revisar />} />
                  <Route path="/batalha" element={<Batalha />} />
                  <Route path="/caderno" element={<Caderno />} />
                  <Route path="/stats" element={<Stats />} />
                  <Route path="/ranking" element={<Ranking />} />
                  <Route path="/marcadas" element={<Marcadas />} />
                  <Route path="/provas" element={<Provas />} />
                  <Route path="/anotacoes" element={<Anotacoes />} />
                  <Route path="/legislacao" element={<Legislacao />} />
                  <Route path="/materias" element={<Materias />} />
                  <Route path="/erros" element={<Erros />} />
                  <Route element={<RotaAdmin />}>
                    <Route path="/importar" element={<Importar />} />
                  </Route>
                </Route>
              </Route>
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </FronteiraErro>
  );
}

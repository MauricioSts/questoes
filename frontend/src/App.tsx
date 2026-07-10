import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./store/auth";
import { ThemeProvider } from "./store/theme";
import { QuestoesProvider } from "./store/questoes";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AppLayout } from "./components/AppLayout";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { Home } from "./pages/Home";
import { Estudar } from "./pages/Estudar";
import { Flash } from "./pages/Flash";
import { Topico } from "./pages/Topico";
import { Simulado } from "./pages/Simulado";
import { Stats } from "./pages/Stats";
import { Marcadas } from "./pages/Marcadas";
import { Anotacoes } from "./pages/Anotacoes";
import { Legislacao } from "./pages/Legislacao";
import { Materias } from "./pages/Materias";
import { Revisar } from "./pages/Revisar";
import { Importar } from "./pages/Importar";

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/registro" element={<Register />} />
            <Route
              element={
                <ProtectedRoute>
                  <QuestoesProvider>
                    <AppLayout />
                  </QuestoesProvider>
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<Home />} />
              <Route path="/estudar" element={<Estudar />} />
              <Route path="/flash" element={<Flash />} />
              <Route path="/topico" element={<Topico />} />
              <Route path="/simulado" element={<Simulado />} />
              <Route path="/revisar" element={<Revisar />} />
              <Route path="/stats" element={<Stats />} />
              <Route path="/marcadas" element={<Marcadas />} />
              <Route path="/anotacoes" element={<Anotacoes />} />
              <Route path="/legislacao" element={<Legislacao />} />
              <Route path="/materias" element={<Materias />} />
              <Route path="/importar" element={<Importar />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

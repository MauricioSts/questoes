import { Outlet } from "react-router-dom";
import { BottomTab } from "./BottomTab";
import { TopBar } from "./TopBar";
import { Atmosfera } from "./Atmosfera";

export function AppLayout() {
  return (
    <div className="app-root min-h-full">
      {/* Camadas de atmosfera (grão, vinheta, vela/varredura) — atrás de tudo */}
      <Atmosfera />

      {/* Navegação: sidebar fixa à esquerda no desktop, barra inferior no mobile */}
      <BottomTab />

      {/* Área de conteúdo: deslocada para não ficar sob a sidebar no desktop */}
      <div className="relative z-10 lg:pl-[218px]">
        <TopBar />
        <main className="mx-auto max-w-[1100px] px-5 pb-28 pt-2 lg:pb-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

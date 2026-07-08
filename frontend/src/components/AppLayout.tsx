import { Outlet } from "react-router-dom";
import { BottomTab } from "./BottomTab";
import { TopBar } from "./TopBar";

export function AppLayout() {
  return (
    <div className="min-h-full">
      {/* Navegação: sidebar fixa à esquerda no desktop, barra inferior no mobile */}
      <BottomTab />

      {/* Área de conteúdo: deslocada para não ficar sob a sidebar no desktop */}
      <div className="lg:pl-[92px]">
        <TopBar />
        <main className="mx-auto max-w-[1100px] px-5 pb-28 pt-2 lg:pb-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

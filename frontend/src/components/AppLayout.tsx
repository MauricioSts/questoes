import { Outlet } from "react-router-dom";
import { BottomTab } from "./BottomTab";
import { TopBar } from "./TopBar";
import { Atmosfera } from "./Atmosfera";
import { ProvedorMovimento, ParalaxeFundo } from "./Movimento";

export function AppLayout() {
  return (
    // O provedor de movimento carrega só o subconjunto `domAnimation` do motion.dev
    // (ver components/Movimento.tsx): animação de opacidade/transform, nada além.
    <ProvedorMovimento>
      <div className="app-root min-h-full">
        {/* Camadas de atmosfera (grão, vinheta, vela/varredura), atrás de tudo.
            O paralaxe desloca só o brilho de fundo: o grão e a vinheta precisam ficar
            colados na viewport, senão aparece borda ao rolar. */}
        <Atmosfera />
        <ParalaxeFundo className="pointer-events-none fixed inset-x-0 top-0 z-0 h-[70vh]" distancia={90}>
          <div className="brilho-topo" />
        </ParalaxeFundo>

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
    </ProvedorMovimento>
  );
}

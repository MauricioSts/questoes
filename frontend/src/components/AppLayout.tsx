import { Outlet } from "react-router-dom";
import { BottomTab } from "./BottomTab";
import { DockTemas } from "./SeletorTema";
import { TopBar } from "./TopBar";
import { Atmosfera } from "./Atmosfera";
import { ProvedorMovimento } from "./Movimento";
import { ComemoracaoMeta } from "./ComemoracaoMeta";
import { MetaProvider, useMeta } from "../store/meta";

// A comemoração vive no layout, e não numa página: a meta costuma cair no meio do
// estudo, e ela tem de aparecer onde o usuário estiver.
function FestaDaMeta() {
  const { festa, fecharFesta } = useMeta();
  if (!festa) return null;
  return <ComemoracaoMeta festa={festa} aoFechar={fecharFesta} />;
}

export function AppLayout() {
  return (
    // O provedor de movimento carrega só o subconjunto `domAnimation` do motion.dev
    // (ver components/Movimento.tsx): animação de opacidade/transform, nada além.
    <ProvedorMovimento>
      <MetaProvider>
        <div className="app-root min-h-full">
          {/* Fundo WebGL Molten Metal com as cores relativas do site */}
          <Atmosfera />

          {/* Navegação: sidebar fixa à esquerda no desktop, barra inferior no mobile */}
          <BottomTab />

          {/* Área de conteúdo: deslocada para não ficar sob a sidebar no desktop */}
          <div className="relative z-10 lg:pl-[236px]">
            <TopBar />
            <main className="mx-auto max-w-[1100px] px-5 pb-28 pt-2">
              <Outlet />
            </main>
          </div>

          {/* Dock de temas (desktop) */}
          <DockTemas />

          <FestaDaMeta />
        </div>
      </MetaProvider>
    </ProvedorMovimento>
  );
}

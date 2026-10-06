// Marca de alternativa eliminada, com a cara de cada tema. Substitui o risco neutro:
// - Cyberpunk: glitch, e um laser corta a linha com "ERR://DESCARTADA".
// - Topography: a pena do cartógrafo traça a rota riscada e marca um X no fim.
// - Lugia:     rajada de vento que deixa uma pena pousada.
//
// A animação toca ao montar (montar = acabou de eliminar) e o estado final é o estilo
// base de cada peça, então com prefers-reduced-motion (animação desligada no CSS) a marca
// aparece pronta. Cobre só o cartão da alternativa: fica dentro do <li> e para antes do
// botão de eliminar (w-11 + gap-2 = 52px).
import type { Tema } from "../store/theme";

export function EfeitoEliminar({ tema }: { tema: Tema }) {
  return (
    <div aria-hidden className={`elim elim--${tema}`}>
      {tema === "cyberpunk" && <Laser />}
      {tema === "fantasy" && <Rota />}
      {tema === "rose" && <Rajada />}
    </div>
  );
}

// ---------- Cyberpunk ----------

function Laser() {
  return (
    <>
      <div className="elim__recorte">
        <span className="elim-cyber__flash" />
        <span className="elim-cyber__fatia" style={{ top: "12%", height: "20%" }} />
        <span className="elim-cyber__fatia elim-cyber__fatia--b" style={{ top: "46%", height: "12%" }} />
        <span className="elim-cyber__fatia" style={{ top: "70%", height: "18%", animationDelay: ".06s" }} />
      </div>
      <span className="elim-cyber__laser" />
      <span className="elim-cyber__tag">ERR://DESCARTADA</span>
    </>
  );
}

// ---------- Topography ----------

function Rota() {
  return (
    <div className="elim__recorte">
      <svg className="elim-fantasy__rota" viewBox="0 0 100 100" preserveAspectRatio="none">
        <path
          d="M3,56 C12,40 22,66 34,52 S54,36 64,52 S84,64 93,50"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <span className="elim-fantasy__curva" />
      <span className="elim-fantasy__curva elim-fantasy__curva--2" />
      <svg className="elim-fantasy__x" viewBox="0 0 20 20">
        <path d="M4,4 L16,16" pathLength={1} />
        <path d="M16,4 L4,16" pathLength={1} />
      </svg>
    </div>
  );
}

// ---------- Lugia ----------

function Rajada() {
  return (
    <>
      <div className="elim__recorte">
        <svg className="elim-rose__vento" viewBox="0 0 100 100" preserveAspectRatio="none">
          <path d="M-5,30 C25,24 55,36 82,28 C92,25 94,16 86,15" vectorEffect="non-scaling-stroke" />
          <path d="M-5,56 C30,50 60,62 90,52" vectorEffect="non-scaling-stroke" />
          <path d="M-5,78 C20,74 48,84 74,76 C84,73 86,64 78,63" vectorEffect="non-scaling-stroke" />
        </svg>
      </div>
      <svg className="elim-rose__pena" viewBox="0 0 24 24">
        <path className="elim-rose__vexilo" d="M20.5 3.5C14 3.2 7.8 7.6 5.6 14.2l-.9 2.8 2.7-1c6.3-2.4 10.9-8.3 13.1-12.5z" />
        <path className="elim-rose__raque" d="M3 21 L17.5 6.5" />
        <path className="elim-rose__raque" d="M9.4 12.6 L13.2 12.9 M12 10 L16 10.1" />
      </svg>
    </>
  );
}

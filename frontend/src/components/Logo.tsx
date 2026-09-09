// Marca do devconcursado.
//
// O símbolo é o prompt `>_` de um terminal: o nome junta "dev" com "concursado", e o
// prompt é a metade que os dois lados reconhecem. Desenhado em SVG (não em fonte) para
// ficar nítido em qualquer tamanho e trocar de cor com o tema — o selo usa o acento
// (ouro no fantasy, magenta no cyberpunk) e o traço usa a cor de contraste do acento.
interface SimboloProps {
  /** Lado do selo em px. */
  tamanho?: number;
  className?: string;
}

export function LogoSimbolo({ tamanho = 32, className = "" }: SimboloProps) {
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id="dc-selo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--accentHi)" />
          <stop offset="100%" stopColor="var(--accent)" />
        </linearGradient>
      </defs>
      <rect x="0.5" y="0.5" width="31" height="31" rx="9" fill="url(#dc-selo)" />
      <rect
        x="0.5"
        y="0.5"
        width="31"
        height="31"
        rx="9"
        fill="none"
        stroke="var(--accentHi)"
        strokeOpacity="0.55"
      />
      {/* prompt  >_ */}
      <path
        d="M10 10.5 L16.5 16 L10 21.5"
        stroke="var(--onAccent)"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M19 21.5 H23" stroke="var(--onAccent)" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

interface LogoProps {
  tamanho?: number;
  /** Só o selo, sem o nome escrito. */
  somenteSimbolo?: boolean;
  /** Corpo do nome, em px. */
  fonte?: number;
  className?: string;
}

export function Logo({ tamanho = 32, somenteSimbolo = false, fonte = 17, className = "" }: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`.trim()}>
      <LogoSimbolo tamanho={tamanho} />
      {!somenteSimbolo && (
        <span
          className="font-brand font-bold leading-none"
          style={{ fontSize: fonte, letterSpacing: "var(--brandTrack)" }}
        >
          <span style={{ color: "var(--accentText)" }}>dev</span>
          <span className="text-brand-ink">concursado</span>
        </span>
      )}
    </span>
  );
}

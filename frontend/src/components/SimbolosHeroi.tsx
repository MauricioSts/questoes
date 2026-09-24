// Símbolos dos temas Aranha e Venom, desenhados à mão em SVG (o lucide não tem aranha):
// o emblema do peito do Homem-Aranha e os olhos do Venom. Pintam com currentColor para
// servir de ícone no seletor de tema e, grandes, nas animações de entrada.

// Olho esquerdo do Venom em 24×24; o direito é o espelho (x → 24 − x).
export const OLHO_VENOM_ESQ = "M11 13.2 C 9.6 9.4, 6.4 7, 1.6 6 C 2.9 9.4, 5 13, 8.5 15.1 C 9.8 15.6, 10.8 14.7, 11 13.2 Z";
export const OLHO_VENOM_DIR = "M13 13.2 C 14.4 9.4, 17.6 7, 22.4 6 C 21.1 9.4, 19 13, 15.5 15.1 C 14.2 15.6, 13.2 14.7, 13 13.2 Z";

interface SimboloProps {
  size?: number | string;
  strokeWidth?: number | string;
  className?: string;
}

export function SimboloAranha({ size = 16, strokeWidth = 1.5, className }: SimboloProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden fill="none">
      <g stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.6 10.8 7.4 7.6 6.6 2.8M13.4 10.8l3.2-3.2.8-4.8" />
        <path d="M10.3 12.3 6.2 10.6 2.8 8.2M13.7 12.3l4.1-1.7 3.4-2.4" />
        <path d="M10.3 14.2 6.1 15.8 3.4 19.4M13.7 14.2l4.2 1.6 2.7 3.6" />
        <path d="M10.9 15.9 8.3 18.9 7.3 22.4M13.1 15.9l2.6 3 1 3.5" />
      </g>
      <circle cx="12" cy="8.7" r="1.55" fill="currentColor" />
      <ellipse cx="12" cy="13.6" rx="2.15" ry="3.7" fill="currentColor" />
    </svg>
  );
}

export function SimboloVenom({ size = 16, className }: SimboloProps) {
  return (
    <svg width={size} height={size} viewBox="1 3 22 16" className={className} aria-hidden>
      <path d={OLHO_VENOM_ESQ} fill="currentColor" />
      <path d={OLHO_VENOM_DIR} fill="currentColor" />
    </svg>
  );
}

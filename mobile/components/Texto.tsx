import { Text, type TextProps } from "react-native";

/**
 * Em RN não existe herança de cor: cada <Text> pinta a sua. Centralizar aqui
 * evita o erro mais comum do porte — texto preto sobre fundo escuro.
 */
export function Txt({ className = "", ...resto }: TextProps & { className?: string }) {
  return <Text className={`text-brand-ink ${className}`} {...resto} />;
}

export function Titulo({ className = "", ...resto }: TextProps & { className?: string }) {
  return <Text className={`text-brand-ink text-[20px] font-bold ${className}`} {...resto} />;
}

export function Fraco({ className = "", ...resto }: TextProps & { className?: string }) {
  return <Text className={`text-muted text-[13px] ${className}`} {...resto} />;
}

export function Rotulo({ className = "", ...resto }: TextProps & { className?: string }) {
  return <Text className={`text-faint text-[10px] uppercase tracking-[1.4px] ${className}`} {...resto} />;
}

import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
}

export function Card({ children, className = "", onClick, hoverable = false }: CardProps) {
  const hoverClass = hoverable ? "card-hover" : "";
  return (
    <div className={`card ${hoverClass} ${className}`} onClick={onClick}>
      {children}
    </div>
  );
}

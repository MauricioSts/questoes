import { ReactNode } from "react";

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  variant?: "primary" | "secondary" | "outline";
  fullWidth?: boolean;
  size?: "sm" | "md" | "lg";
  type?: "button" | "submit" | "reset";
  ariaLabel?: string;
}

export function Button({
  children,
  onClick,
  disabled = false,
  className = "",
  variant = "primary",
  fullWidth = false,
  size = "md",
  type = "button",
  ariaLabel,
}: ButtonProps) {
  const baseClass = "tap rounded-2xl font-display font-extrabold transition hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-50";

  const variantClass = {
    primary: "bg-gradient-to-r from-brand-500 to-[#7C6FF6] text-white shadow-lg shadow-brand-500/40",
    secondary: "border border-hair bg-surface text-brand-500 hover:bg-brand-50",
    outline: "border border-hair text-brand-500",
  }[variant];

  const sizeClass = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-lg",
  }[size];

  const widthClass = fullWidth ? "w-full" : "";

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseClass} ${variantClass} ${sizeClass} ${widthClass} ${className}`}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
}

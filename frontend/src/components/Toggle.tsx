interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  ariaLabel?: string;
}

export function Toggle({ checked, onChange, label, disabled = false, ariaLabel }: ToggleProps) {
  return (
    <div className="flex items-center gap-3">
      {label && <label className="text-sm font-medium text-brand-ink">{label}</label>}
      <button
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        className={`toggle ${checked ? "active" : ""} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel}
      >
        <div className="toggle-circle" />
      </button>
    </div>
  );
}

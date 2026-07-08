interface FilterSelectProps {
  label: string;
  value: string | number;
  onChange: (value: string | number) => void;
  options: Array<{ value: string | number; label: string }>;
  disabled?: boolean;
  className?: string;
}

export function FilterSelect({
  label,
  value,
  onChange,
  options,
  disabled = false,
  className = "",
}: FilterSelectProps) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label className="filter-label">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="filter-select"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

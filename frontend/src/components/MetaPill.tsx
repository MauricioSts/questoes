type MetaType =
  | "modulo"
  | "materia"
  | "dificuldade-facil"
  | "dificuldade-media"
  | "dificuldade-dificil"
  | "origem-oficial"
  | "origem-adaptada"
  | "origem-gerada"
  | "origem-autoral";

interface MetaPillProps {
  type: MetaType;
  label: string;
  title?: string;
}

export function MetaPill({ type, label, title }: MetaPillProps) {
  const classMap: Record<MetaType, string> = {
    modulo: "meta-pill meta-modulo",
    materia: "meta-pill meta-materia",
    "dificuldade-facil": "meta-pill meta-dificuldade-facil",
    "dificuldade-media": "meta-pill meta-dificuldade-media",
    "dificuldade-dificil": "meta-pill meta-dificuldade-dificil",
    "origem-oficial": "meta-pill meta-origem-oficial",
    "origem-adaptada": "meta-pill meta-origem-adaptada",
    "origem-gerada": "meta-pill meta-origem-gerada",
    "origem-autoral": "meta-pill meta-origem-autoral",
  };

  return (
    <span className={classMap[type]} title={title}>
      {label}
    </span>
  );
}

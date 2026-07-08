type MetaType = "modulo" | "materia" | "dificuldade-facil" | "dificuldade-media" | "dificuldade-dificil";

interface MetaPillProps {
  type: MetaType;
  label: string;
}

export function MetaPill({ type, label }: MetaPillProps) {
  const classMap: Record<MetaType, string> = {
    modulo: "meta-pill meta-modulo",
    materia: "meta-pill meta-materia",
    "dificuldade-facil": "meta-pill meta-dificuldade-facil",
    "dificuldade-media": "meta-pill meta-dificuldade-media",
    "dificuldade-dificil": "meta-pill meta-dificuldade-dificil",
  };

  return <span className={classMap[type]}>{label}</span>;
}

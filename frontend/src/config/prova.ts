// CONFIG CENTRAL DA PROVA — ajuste aqui a proporção, os pesos e a nota de corte.
// (Referência: FGV / Dataprev 2026.)

// Proporção do SIMULADO — mantém a proporção da prova real. Total = 70.
// As chaves de Módulo I devem casar com o campo `materia` do questoes.json.
export const PROPORCAO_SIMULADO = {
  // As chaves precisam casar EXATAMENTE com o campo `materia` das questões (com acento).
  moduloI: {
    "Língua Portuguesa": 12,
    "Língua Inglesa": 12,
    "Raciocínio Lógico-Matemático": 5,
    "Atualidades e IA": 6,
    "Legislação (SI e Proteção de Dados)": 5,
  } as Record<string, number>,
  // Módulo II (específicos): total, sem subdividir por matéria (sorteio livre entre elas).
  moduloIITotal: 30,
};

export const TOTAL_SIMULADO = 70;

// Pesos da nota real: Módulo I peso 1, Módulo II peso 2,5 → total 115 pontos.
export const PESOS = { I: 1, II: 2.5 } as const;
export const TOTAL_PONTOS = 115;

// Nota de corte (em pontos, de 0 a TOTAL_PONTOS) para estimar aprovação. Configurável.
export const NOTA_CORTE_PONTOS = 57.5; // ~50%

// Cronômetro do simulado (opcional): duração em minutos.
export const SIMULADO_DURACAO_MIN = 240; // 4h

// Ênfase nas erradas: peso de sorteio de uma questão errada vs. uma acertada.
export const PESO_ERRADA = 3;

// Meta diária default (o backend também guarda por usuário).
export const META_DIARIA_DEFAULT = 70;

// O que cada plano inclui, numa lista só: a tela de assinatura e o perfil mostram a
// mesma comparação. `free` e `premium` são o texto da célula; true = incluso, false = não.
export interface LinhaPlano {
  recurso: string;
  detalhe?: string;
  free: string | boolean;
  premium: string | boolean;
}

export function linhasPlanos(limiteGratisDia: number): LinhaPlano[] {
  return [
    {
      recurso: "Questões por dia",
      detalhe: "Contam Estudar, Flash, Revisão e Batalha. Zera à meia-noite.",
      free: `${limiteGratisDia} por dia`,
      premium: "Sem limite",
    },
    { recurso: "Trilhas, meta diária e data da prova", free: true, premium: true },
    { recurso: "Revisão espaçada e caderno de erros", free: true, premium: true },
    { recurso: "Batalha e ranking", free: true, premium: true },
    {
      recurso: "Caderno de anotações",
      detalhe: "Inclusive aberto ao lado da questão.",
      free: false,
      premium: true,
    },
    { recurso: "Simulado cronometrado", free: false, premium: true },
    { recurso: "Estatísticas por matéria e assunto", free: false, premium: true },
    {
      recurso: "Estudar sem internet",
      detalhe: "No grátis a correção passa pelo servidor.",
      free: false,
      premium: true,
    },
    { recurso: "Importar provas em PDF com IA", free: false, premium: "Em breve" },
  ];
}

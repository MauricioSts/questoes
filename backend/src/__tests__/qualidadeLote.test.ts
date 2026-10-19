// Validador de qualidade dos lotes dev-* (docs/TRILHAS-DEV-PENDENTE.md, 5.1 e 5.2): um lote
// bom passa, e cada regra tem um lote que reprova só por ela.
import { describe, expect, it } from "vitest";
import {
  conferirResultado,
  conferirVerificacao,
  ehTrilhaDev,
  questaoDevSchema,
  validarQualidadeLote,
  type ExecucaoGravada,
  type RelatorioLote,
} from "../lib/qualidadeLote.js";
import { hashCodigo, saidaConfereExata } from "../lib/sandboxCodigo.js";
import { podeEscreverNaTrilha } from "../lib/trilhaComunidade.js";

const LETRAS = ["A", "B", "C", "D", "E"] as const;
const EMENTA = Array.from({ length: 10 }, (_, i) => `Tópico ${i + 1}`);

type Q = Record<string, any>;

// 50 questões: 20 fáceis, 15 médias, 15 difíceis; gabarito 10 por letra; 20 de saída
// (40%); 5 por tópico (10%).
function questao(i: number): Q {
  const gabarito = LETRAS[i % 5]!;
  const dificuldade = i < 20 ? "facil" : i < 35 ? "media" : "dificil";
  const base = {
    id: i + 1,
    modulo: "I",
    materia: EMENTA[i % 10],
    assunto: "Geral",
    dificuldade,
    enunciado: `Enunciado da questão ${i + 1}.`,
    gabarito,
    explicacao: "A lista é mutável e o append altera o mesmo objeto.",
    origem: "autoral",
  };
  if (i % 5 === 0 || i % 5 === 1) {
    // saída de código: a correta é a própria saída
    const alternativas = Object.fromEntries(LETRAS.map((l, k) => [l, l === gabarito ? "3" : ["30", "[3]", "None", "33", "0.3"][k]!]));
    return { ...base, tipo: "saida", codigo: "print(1 + 2)", linguagem: "python", saidaEsperada: "3\n", alternativas };
  }
  const alternativas = Object.fromEntries(
    LETRAS.map((l) => [l, l === gabarito ? "resposta correta" : `resposta incorreta ${l}`])
  );
  return { ...base, tipo: "conceitual", alternativas };
}

function loteBom(): Q[] {
  return Array.from({ length: 50 }, (_, i) => questao(i));
}

function validar(questoes: Q[], trilhaId = "dev-python", ementa: string[] | undefined = EMENTA): RelatorioLote {
  return validarQualidadeLote({ trilhaId, ementa, questoes });
}

function regrasDaQuestao(r: RelatorioLote, id: number): string[] {
  return r.porQuestao.find((q) => q.id === id)?.erros.map((e) => e.regra) ?? [];
}
function regrasDaTrilha(r: RelatorioLote): string[] {
  return r.trilha.map((e) => e.regra);
}

// Muda uma questão do lote bom e confere que só ela reprova, pela regra esperada.
function reprovaSo(mudar: (q: Q) => void, regra: string, idx = 2) {
  const lote = loteBom();
  mudar(lote[idx]!);
  const r = validar(lote);
  expect(r.ok).toBe(false);
  expect(regrasDaQuestao(r, idx + 1)).toContain(regra);
  expect(r.porQuestao).toHaveLength(1);
  return r;
}

describe("lote bom", () => {
  it("passa sem erro e resume a distribuição", () => {
    const r = validar(loteBom());
    expect(r.porQuestao).toEqual([]);
    expect(r.trilha).toEqual([]);
    expect(r.ok).toBe(true);
    expect(r.resumo.dificuldade).toEqual({ facil: 20, media: 15, dificil: 15 });
    expect(r.resumo.gabarito).toEqual({ A: 10, B: 10, C: 10, D: 10, E: 10 });
    expect(r.resumo.tipo).toEqual({ conceitual: 30, saida: 20, erro: 0 });
  });

  it("aceita questão de erro completa e cpp-ubsan com cpp", () => {
    const lote = loteBom();
    lote[2] = { ...lote[2]!, tipo: "erro", codigo: "int main(){}", linguagem: "cpp", linguagemVerificacao: "cpp-ubsan", erroEsperado: { fase: "execucao", contem: "runtime error" } };
    expect(validar(lote).ok).toBe(true);
  });

  it("reconhece trilha dev", () => {
    expect(ehTrilhaDev("dev-python")).toBe(true);
    expect(ehTrilhaDev("dataprev-analista-ti")).toBe(false);
    expect(ehTrilhaDev(null)).toBe(false);
  });
});

describe("regras por questão", () => {
  it("exatamente 5 alternativas A–E", () => {
    reprovaSo((q) => delete q.alternativas.E, "alternativas", 2);
    reprovaSo((q) => (q.alternativas.F = "resposta incorreta F"), "alternativas", 2);
  });

  it("gabarito precisa existir nas alternativas", () => {
    reprovaSo((q) => (q.gabarito = "F"), "gabarito", 2);
  });

  it("correta não pode ser a mais longa", () => {
    reprovaSo((q) => (q.alternativas[q.gabarito] = "resposta correta e bem mais longa que as outras"), "correta_mais_longa");
  });

  it("correta não pode passar de 1,25 × a média dos distratores", () => {
    // distratores 20, 20, 20, 60 (média 30, maior 60): correta de 40 não é a mais longa,
    // mas passa de 37,5.
    reprovaSo((q) => {
      const outras = LETRAS.filter((l) => l !== q.gabarito);
      q.alternativas[outras[0]!] = "x".repeat(60);
      q.alternativas[q.gabarito] = "y".repeat(40);
    }, "correta_mais_longa");
  });

  it("empate de tamanho com o maior distrator também reprova", () => {
    reprovaSo((q) => (q.alternativas[q.gabarito] = "resposta incorreta Z"), "correta_mais_longa");
  });

  it("lista negra de enchimento (sem acento e sem caixa)", () => {
    reprovaSo((q) => {
      const outra = LETRAS.find((l) => l !== q.gabarito)!;
      q.alternativas[outra] = "Resposta, conforme o CENÁRIO apresentado";
    }, "enchimento");
    reprovaSo((q) => {
      const outra = LETRAS.find((l) => l !== q.gabarito)!;
      q.alternativas[outra] = "falsa nesse caso específico";
    }, "enchimento");
  });

  it("explicação não cita a letra", () => {
    reprovaSo((q) => (q.explicacao = "A alternativa C está correta porque sim."), "explicacao_cita_letra");
    reprovaSo((q) => (q.explicacao = "Correta: letra B."), "explicacao_cita_letra");
    reprovaSo((q) => (q.explicacao = "A opção D erra o tipo."), "explicacao_cita_letra");
    reprovaSo((q) => (q.explicacao = "O item E confunde lista com tupla."), "explicacao_cita_letra");
    reprovaSo((q) => (q.explicacao = "Veja: A) erra o tipo."), "explicacao_cita_letra");
  });

  it("explicação em português comum não é confundida com citação de letra", () => {
    const lote = loteBom();
    lote[2]!.explicacao = "A opção e a alternativa a seguir mostram que o item é mutável (como em f(A)).";
    expect(validar(lote).ok).toBe(true);
  });

  it("tipo é obrigatório e de conceitual|saida|erro", () => {
    reprovaSo((q) => delete q.tipo, "formato");
    reprovaSo((q) => (q.tipo = "codigo"), "formato");
  });

  it("saida exige codigo, linguagem e saidaEsperada", () => {
    reprovaSo((q) => delete q.saidaEsperada, "tipo_campos", 0);
    reprovaSo((q) => delete q.codigo, "tipo_campos", 0);
    reprovaSo((q) => delete q.linguagem, "tipo_campos", 0);
  });

  it("erro exige erroEsperado com fase válida e contem", () => {
    reprovaSo((q) => Object.assign(q, { tipo: "erro", codigo: "x", linguagem: "python" }), "tipo_campos");
    reprovaSo((q) => Object.assign(q, { tipo: "erro", codigo: "x", linguagem: "python", erroEsperado: { fase: "rede", contem: "x" } }), "formato");
    reprovaSo((q) => Object.assign(q, { tipo: "erro", codigo: "x", linguagem: "python", erroEsperado: { fase: "execucao", contem: "" } }), "formato");
  });

  it("linguagem de saida/erro precisa rodar no sandbox; cpp-ubsan só com cpp", () => {
    reprovaSo((q) => (q.linguagem = "cobol"), "linguagem", 0);
    reprovaSo((q) => (q.linguagemVerificacao = "cpp-ubsan"), "linguagem", 0);
  });

  it("saidaEsperada precisa bater com a alternativa correta", () => {
    reprovaSo((q) => (q.saidaEsperada = "4\n"), "saida_alternativa", 0);
  });

  it("origem: só autoral, ou adaptada com prova", () => {
    reprovaSo((q) => (q.origem = "gerada"), "formato");
    reprovaSo((q) => delete q.origem, "formato");
    reprovaSo((q) => (q.origem = "adaptada"), "origem");
    const lote = loteBom();
    Object.assign(lote[2]!, { origem: "adaptada", prova: "FGV_X_2024" });
    expect(validar(lote).ok).toBe(true);
  });

  it("explicação vazia reprova", () => {
    reprovaSo((q) => (q.explicacao = "   "), "formato");
  });

  it("id repetido no lote", () => {
    const lote = loteBom();
    lote[2]!.id = 1;
    const r = validar(lote);
    expect(r.ok).toBe(false);
    expect(r.porQuestao).toEqual([{ id: 1, erros: [expect.objectContaining({ regra: "id_duplicado" })] }]);
  });

  it("matéria fora da ementa", () => {
    reprovaSo((q) => (q.materia = "Assunto inventado"), "materia_fora_ementa");
  });
});

describe("regras da trilha", () => {
  it("mínimo de 50 questões", () => {
    const r = validar(loteBom().slice(0, 49));
    expect(regrasDaTrilha(r)).toContain("minimo_questoes");
  });

  it("mínimo por dificuldade (20 fáceis, 15 médias, 15 difíceis)", () => {
    const lote = loteBom();
    lote[0]!.dificuldade = "media"; // 19 fáceis
    const r = validar(lote);
    expect(regrasDaTrilha(r)).toEqual(["minimo_dificuldade"]);
    const lote2 = loteBom();
    lote2[49]!.dificuldade = "facil"; // 14 difíceis
    expect(regrasDaTrilha(validar(lote2))).toEqual(["minimo_dificuldade"]);
  });

  it("gabarito por letra entre 8 e 12 a cada 50", () => {
    const lote = loteBom();
    // passa 3 gabaritos de C para A: A 13, C 7
    let trocados = 0;
    for (const q of lote) {
      if (trocados < 3 && q.gabarito === "C") {
        q.alternativas.A = "resposta correta";
        q.alternativas.C = "resposta incorreta C";
        q.gabarito = "A";
        trocados++;
      }
    }
    const r = validar(lote);
    expect(r.porQuestao).toEqual([]);
    expect(regrasDaTrilha(r)).toEqual(["gabarito_distribuicao", "gabarito_distribuicao"]);
  });

  it("gabarito proporcional: 100 questões aceitam 16 a 24 por letra", () => {
    const lote = [...loteBom(), ...loteBom().map((q) => ({ ...q, id: q.id + 50 }))];
    expect(regrasDaTrilha(validar(lote)).filter((x) => x === "gabarito_distribuicao")).toEqual([]);
  });

  it("trilha de linguagem exige 40% de saída/erro; as outras não", () => {
    const lote = loteBom();
    const saida = lote.find((q) => q.tipo === "saida")!;
    saida.tipo = "conceitual"; // 19 de 50 = 38%
    expect(regrasDaTrilha(validar(lote))).toEqual(["proporcao_codigo"]);
    expect(regrasDaTrilha(validar(lote, "dev-arquitetura"))).toEqual([]);
    for (const t of ["dev-javascript-typescript", "dev-java", "dev-cpp"]) {
      expect(regrasDaTrilha(validar(lote, t))).toEqual(["proporcao_codigo"]);
    }
  });

  it("ementa obrigatória", () => {
    expect(regrasDaTrilha(validarQualidadeLote({ trilhaId: "dev-python", questoes: loteBom() }))).toEqual(["ementa_ausente"]);
    expect(regrasDaTrilha(validar(loteBom(), "dev-python", []))).toEqual(["ementa_ausente"]);
  });

  it("todo tópico da ementa com pelo menos 1 questão", () => {
    const r = validar(loteBom(), "dev-python", [...EMENTA, "Tópico órfão"]);
    expect(regrasDaTrilha(r)).toEqual(["topico_sem_questao"]);
  });

  it("nenhum tópico com mais de 15%", () => {
    const lote = loteBom();
    // 8 de 50 = 16% no Tópico 1 (tira de outros tópicos sem zerar nenhum)
    lote[1]!.materia = "Tópico 1";
    lote[2]!.materia = "Tópico 1";
    lote[3]!.materia = "Tópico 1";
    const r = validar(lote);
    expect(regrasDaTrilha(r)).toEqual(["topico_concentrado"]);
  });

  it("questão com formato inválido aparece com o índice quando não tem id", () => {
    const lote: Q[] = loteBom();
    delete lote[4]!.id;
    const r = validar(lote);
    expect(r.porQuestao.map((q) => q.id)).toEqual(["#5"]);
  });
});

describe("verificação no sandbox", () => {
  const saida = questaoDevSchema.parse(questao(0)); // print(1 + 2) → "3"
  const erro = questaoDevSchema.parse({
    ...questao(2),
    tipo: "erro",
    codigo: "int main(){ int a[1]; return a[5]; }",
    linguagem: "cpp",
    linguagemVerificacao: "cpp-ubsan",
    erroEsperado: { fase: "execucao", contem: "out of bounds" },
  });
  const livreOk = { fase: "execucao", codigo: 0, stdout: "3\n", stderr: "", motivo: "passou" };

  it("saida: stdout confere com saidaEsperada e com a alternativa", () => {
    expect(conferirResultado(saida, livreOk)).toEqual([]);
    expect(conferirResultado(saida, { ...livreOk, stdout: "3   \n\n" })).toEqual([]);
    expect(conferirResultado(saida, { ...livreOk, stdout: "4\n" })).toHaveLength(2);
    expect(conferirResultado(saida, { ...livreOk, codigo: 1, stderr: "Traceback" })).toHaveLength(1);
    expect(conferirResultado(saida, undefined)).toHaveLength(1);
  });

  it("erro: fase certa e mensagem contida em stderr/stdout", () => {
    const livre = { fase: "execucao", codigo: 134, stdout: "", stderr: "runtime error: index 5 out of bounds", motivo: "erro_execucao" };
    expect(conferirResultado(erro, livre)).toEqual([]);
    expect(conferirResultado(erro, { ...livre, fase: "compilacao" })).toHaveLength(1);
    expect(conferirResultado(erro, { ...livre, codigo: 0 })).toHaveLength(1);
    expect(conferirResultado(erro, { ...livre, stderr: "segfault" })).toHaveLength(1);
  });

  const exec = (q: typeof saida, over: Partial<ExecucaoGravada> = {}): ExecucaoGravada => ({
    id: "ex1",
    finalidade: "verificacao",
    status: "concluida",
    hash: hashCodigo(q.linguagemVerificacao ?? q.linguagem!, q.codigo!),
    resultado: { compilacao: null, testes: [], passou: 0, total: 0, tempoMs: 10, livre: { ...livreOk, tempoMs: 5 } },
    ...over,
  });
  const comExec = { ...saida, execucaoId: "ex1" };

  it("importador aceita execução de verificação concluída do mesmo código", () => {
    expect(conferirVerificacao(comExec, exec(saida))).toEqual([]);
  });

  it("importador recusa sem execucaoId, execução inexistente, finalidade, status ou hash errados", () => {
    expect(conferirVerificacao(saida, exec(saida))[0]).toMatch(/exige execucaoId/);
    expect(conferirVerificacao(comExec, null)[0]).toMatch(/não encontrada/);
    expect(conferirVerificacao(comExec, exec(saida, { finalidade: "exercicio" }))[0]).toMatch(/verificação/);
    expect(conferirVerificacao(comExec, exec(saida, { status: "fila" }))[0]).toMatch(/concluída/);
    expect(conferirVerificacao(comExec, exec(saida, { hash: hashCodigo("python", "print(4)") }))[0]).toMatch(/hash/);
  });

  it("importador recusa quando o resultado gravado não confirma mais o gabarito", () => {
    const mudada = { ...comExec, saidaEsperada: "4", alternativas: { ...comExec.alternativas, A: "4" } };
    expect(conferirVerificacao(mudada, exec(saida)).length).toBeGreaterThan(0);
  });

  it("hash usa a linguagem de verificação (cpp-ubsan), não o rótulo", () => {
    const e = { ...erro, execucaoId: "ex2" };
    const livre = { fase: "execucao", codigo: 134, stdout: "", stderr: "index 5 out of bounds", motivo: "erro_execucao", tempoMs: 1 };
    const base = { id: "ex2", finalidade: "verificacao", status: "concluida", resultado: { livre } };
    expect(conferirVerificacao(e, { ...base, hash: hashCodigo("cpp-ubsan", e.codigo!) })).toEqual([]);
    expect(conferirVerificacao(e, { ...base, hash: hashCodigo("cpp", e.codigo!) })[0]).toMatch(/hash/);
  });

  it("conceitual não precisa de execução", () => {
    expect(conferirVerificacao(questaoDevSchema.parse(questao(2)), null)).toEqual([]);
  });

  it("comparação exata igual à do worker", () => {
    expect(saidaConfereExata("a  \nb\n\n", "a\nb")).toBe(true);
    expect(saidaConfereExata(" a", "a")).toBe(false);
  });
});

describe("quem importa numa trilha explícita", () => {
  it("dono da trilha, ou admin só na trilha oficial", () => {
    expect(podeEscreverNaTrilha({ donoId: "u1" }, "u1", false)).toBe(true);
    expect(podeEscreverNaTrilha({ donoId: null }, "adm", true)).toBe(true);
    expect(podeEscreverNaTrilha({ donoId: null }, "u1", false)).toBe(false);
    expect(podeEscreverNaTrilha({ donoId: "u2" }, "u1", false)).toBe(false);
    expect(podeEscreverNaTrilha({ donoId: "u2" }, "adm", true)).toBe(false);
  });
});

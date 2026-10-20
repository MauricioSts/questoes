// Perfil da trilha como ementa: vínculo só vale com disciplina e tópico do perfil, a folha
// da discursiva tem limite de linhas e a troca do conteúdo provisório pelo oficial não
// apaga vínculo nenhum. Usa o perfil real do TJPB (docs/perfis/tjpb-2026-dev.json).
import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import {
  atualizarConteudo,
  conferirVinculos,
  contarLinhas,
  formatoDoPerfil,
  lerArgsAtualizarConteudo,
  lerConteudoOficial,
  lerPerfil,
  listarDisciplinas,
  regraDiscursiva,
  validarTextoDiscursiva,
  validarVinculo,
} from "../lib/perfilTrilha.js";
import { casarMaterias, materiaDoDia, rodizioDoConcurso } from "../lib/metaMateria.js";

const arquivo = () => JSON.parse(readFileSync(new URL("../../../docs/perfis/tjpb-2026-dev.json", import.meta.url), "utf8"));

describe("validarVinculo", () => {
  const perfil = lerPerfil(arquivo());

  it("aceita disciplina e número de tópico do perfil", () => {
    expect(validarVinculo(perfil, "Língua Portuguesa", "4.1")).toBeNull();
    expect(validarVinculo(perfil, "Banco de dados", "6")).toBeNull();
  });

  it("recusa disciplina que não existe", () => {
    expect(validarVinculo(perfil, "Direito Penal", "1")).toMatch(/disciplina "Direito Penal" não existe/);
  });

  it("recusa tópico que não existe na disciplina (mesmo existindo em outra)", () => {
    expect(validarVinculo(perfil, "Raciocínio Lógico-Matemático", "4.1")).toMatch(/tópico "4.1" não existe/);
    expect(validarVinculo(perfil, "Língua Portuguesa", "Ortografia oficial.")).not.toBeNull();
  });

  it("conferirVinculos lista todos os inválidos e ignora trilha sem perfil", () => {
    const erros = conferirVinculos(
      [
        { questaoId: 1, trilhaId: "tjpb-2026-dev", materia: "Língua Portuguesa", topico: "3" },
        { questaoId: 2, trilhaId: "tjpb-2026-dev", materia: "APIs REST", topico: "APIs REST" },
        { questaoId: 3, trilhaId: "tjpb-2026-dev", materia: "Programação", topico: "9" },
        { questaoId: 4, trilhaId: "dev-arquitetura", materia: "APIs REST", topico: "APIs REST" },
      ],
      new Map([["tjpb-2026-dev", perfil]])
    );
    expect(erros).toHaveLength(2);
    expect(erros[0]).toMatch(/^questão 2 /);
    expect(erros[1]).toMatch(/^questão 3 /);
  });

  it("recusa JSON que não é perfil", () => {
    expect(() => lerPerfil({ perfil: "x" })).toThrow();
  });
});

describe("discursiva: limite de linhas", () => {
  const regra = regraDiscursiva(lerPerfil(arquivo()))!;

  it("lê a regra do perfil", () => {
    expect(regra).toEqual({ maxLinhas: 30, caracteresPorLinha: 70, valor: 40 });
  });

  it("conta ceil(tamanho/caracteres) por pedaço entre \\n, sem respeitar palavra", () => {
    expect(contarLinhas("a".repeat(70), 70)).toBe(1);
    expect(contarLinhas("a".repeat(71), 70)).toBe(2);
    expect(contarLinhas("palavra ".repeat(20), 70)).toBe(3); // 160 caracteres
    expect(contarLinhas("um\ndois", 70)).toBe(2);
    expect(contarLinhas("um\r\ndois", 70)).toBe(2);
  });

  it("linha em branco conta como 1", () => {
    expect(contarLinhas("um\n\ndois", 70)).toBe(3);
    expect(contarLinhas("", 70)).toBe(1);
    // Só UMA quebra final é ignorada.
    expect(contarLinhas("abc\n", 70)).toBe(1);
    expect(contarLinhas("abc\n\n", 70)).toBe(2);
  });

  it("aceita até maxLinhas e recusa uma a mais", () => {
    const linha = "x".repeat(70);
    expect(validarTextoDiscursiva(Array(30).fill(linha).join("\n"), regra)).toBeNull();
    expect(validarTextoDiscursiva(Array(31).fill(linha).join("\n"), regra)).toMatch(/31 linhas.*limite é 30/);
    // 30 linhas cheias + 1 caractere = 31 sem nenhum \n
    expect(validarTextoDiscursiva("x".repeat(70 * 30 + 1), regra)).toMatch(/31 linhas/);
  });

  it("recusa resposta vazia", () => {
    expect(validarTextoDiscursiva("  \n ", regra)).toBe("Escreva a resposta.");
  });
});

describe("atualizarConteudo", () => {
  const novas = lerConteudoOficial({
    disciplinas: [
      {
        nome: "Engenharia de Software",
        itens: 8,
        topicos: [
          { numero: "1", texto: "Processos de software." },
          { numero: "1.1", texto: "Scrum." },
        ],
      },
      { nome: "Banco de dados", itens: null, topicos: [{ numero: "2", texto: "SQL." }] },
    ],
  });

  const vinculos = [
    { questaoId: 10, materia: "Língua Portuguesa", topico: "3" }, // CG: continua válido
    { questaoId: 11, materia: "Engenharia de Software", topico: "1" }, // mesmo par: continua
    { questaoId: 12, materia: "Programação", topico: "3" }, // disciplina sumiu, sem mapa
    { questaoId: 13, materia: "Banco de dados", topico: "6" }, // tópico sumiu, com mapa
    { questaoId: 14, materia: "Metodologias ágeis e DevOps", topico: "2" }, // sem mapa
  ];
  const mapa = { "Banco de dados|6": { materia: "Banco de dados", topico: "2" } };

  it("troca as provisórias pelas oficiais, tira o aviso e mantém o resto do perfil", () => {
    const original = arquivo();
    const r = atualizarConteudo(lerPerfil(original), novas, vinculos, mapa);
    expect(r.grupo).toBe("CE");
    expect(r.removidas).toHaveLength(8);
    expect(r.perfil.aviso_conteudo_provisorio).toBeUndefined();
    const ce = listarDisciplinas(r.perfil).filter((d) => d.grupo === "CE");
    expect(ce.map((d) => d.nome)).toEqual(["Engenharia de Software", "Banco de dados"]);
    expect(ce.every((d) => d.oficial)).toBe(true);
    expect(r.perfil.grupos[1].disciplinas[0].topicos!.every((t) => t.conteudo_oficial === true)).toBe(true);
    // CG e as regras ficam intactas, e o original não é alterado.
    expect(r.perfil.grupos[0]).toEqual(original.grupos[0]);
    expect((r.perfil as Record<string, unknown>).nota_minima_objetiva_pct).toBe(60);
    expect(original.aviso_conteudo_provisorio).toBeTruthy();
  });

  it("mantém os válidos, aplica o mapa e só LISTA os órfãos", () => {
    const r = atualizarConteudo(lerPerfil(arquivo()), novas, vinculos, mapa);
    expect(r.mantidos).toBe(2);
    expect(r.remapeados).toEqual([{ questaoId: 13, de: "Banco de dados|6", para: { materia: "Banco de dados", topico: "2" } }]);
    expect(r.orfaos.map((o) => o.questaoId)).toEqual([12, 14]);
  });

  it("é idempotente: a segunda rodada chega ao mesmo perfil", () => {
    const um = atualizarConteudo(lerPerfil(arquivo()), novas, []).perfil;
    const dois = atualizarConteudo(lerPerfil(structuredClone(um)), novas, []).perfil;
    expect(dois).toEqual(um);
    expect(JSON.stringify(Object.keys(dois))).toBe(JSON.stringify(Object.keys(um)));
  });

  it("recusa mapa com destino fora do perfil novo", () => {
    expect(() =>
      atualizarConteudo(lerPerfil(arquivo()), novas, [], { "Programação|3": { materia: "Programação", topico: "3" } })
    ).toThrow(/mapa "Programação\|3"/);
  });

  it("aceita a lista plana e recusa tópico repetido", () => {
    const plana = lerConteudoOficial([
      { disciplina: "Programação", numero: "1", texto: "Java." },
      { disciplina: "Programação", numero: "2", texto: "Python." },
      { disciplina: "Segurança", numero: "1", texto: "OWASP." },
    ]);
    expect(plana).toEqual([
      { nome: "Programação", itens: null, topicos: [{ numero: "1", texto: "Java." }, { numero: "2", texto: "Python." }] },
      { nome: "Segurança", itens: null, topicos: [{ numero: "1", texto: "OWASP." }] },
    ]);
    expect(() => lerConteudoOficial([{ disciplina: "A", numero: "1", texto: "x" }, { disciplina: "A", numero: "1", texto: "y" }])).toThrow(/repetido/);
  });

  it("recusa disciplina nova com nome de disciplina de outro grupo", () => {
    const comPortugues = lerConteudoOficial([{ disciplina: "Língua Portuguesa", numero: "1", texto: "x" }]);
    expect(() => atualizarConteudo(lerPerfil(arquivo()), comPortugues, [])).toThrow(/grupo CG/);
  });
});

// Trilha oficial cujo acervo vem só de vínculos com as disciplinas do perfil: o rodízio da
// meta do dia sai das matérias do vínculo (rodízio automático), sem cair no da Dataprev.
describe("meta do dia numa trilha só de vínculos", () => {
  it("monta o rodízio com as disciplinas do perfil e casa cada uma só consigo", () => {
    const materias = [
      { materia: "Língua Portuguesa", total: 40 },
      { materia: "Banco de dados", total: 30 },
      { materia: "Engenharia de Software", total: 25 },
      { materia: "Raciocínio Lógico-Matemático", total: 20 },
      { materia: "Programação", total: 10 },
      { materia: "Segurança no desenvolvimento", total: 5 },
    ];
    const rodizio = rodizioDoConcurso("tjpb-2026-dev", materias);
    expect(rodizio.map((r) => r.rotulo)).toEqual([
      "Língua Portuguesa",
      "Banco de dados",
      "Engenharia de Software",
      "Raciocínio Lógico-Matemático",
      "Programação",
    ]);
    const nomes = materias.map((m) => m.materia);
    for (let dia = 0; dia < 5; dia++) {
      const doDia = materiaDoDia(dia, 0, rodizio);
      expect(casarMaterias(nomes, doDia.termos)).toEqual([doDia.rotulo]);
    }
  });
});

describe("formatoDoPerfil", () => {
  it("lê o formato e cai no C/E sem ele", () => {
    expect(formatoDoPerfil(lerPerfil(arquivo()))).toBe("MULTIPLA_ESCOLHA");
    const { formato: _, ...semFormato } = arquivo();
    expect(formatoDoPerfil(semFormato)).toBe("CERTO_ERRADO");
  });

  it("perfil fora do schema ainda respeita o campo formato", () => {
    expect(formatoDoPerfil({ formato: "MULTIPLA_ESCOLHA" })).toBe("MULTIPLA_ESCOLHA");
    expect(formatoDoPerfil({ grupos: 1 })).toBe("CERTO_ERRADO");
    expect(formatoDoPerfil(null)).toBe("CERTO_ERRADO");
  });
});

describe("argumentos do atualizarConteudoTjpb", () => {
  it("--perfil-arquivo com espaço pega o caminho sem confundir com o conteúdo", () => {
    expect(lerArgsAtualizarConteudo(["c.json", "--perfil-arquivo", "saida.json", "--seco"])).toEqual({
      conteudo: "c.json", mapa: null, seco: true, trilha: "tjpb-2026-dev", perfilArquivo: "saida.json",
    });
    expect(lerArgsAtualizarConteudo(["--perfil-arquivo", "saida.json", "c.json"]).conteudo).toBe("c.json");
  });

  it("--perfil-arquivo=caminho e sem caminho (padrão)", () => {
    expect(lerArgsAtualizarConteudo(["c.json", "--perfil-arquivo=x.json"]).perfilArquivo).toBe("x.json");
    expect(lerArgsAtualizarConteudo(["c.json", "--perfil-arquivo"]).perfilArquivo).toBe("");
    expect(lerArgsAtualizarConteudo(["c.json", "--perfil-arquivo", "--seco"]).perfilArquivo).toBe("");
    expect(lerArgsAtualizarConteudo(["c.json"]).perfilArquivo).toBeNull();
  });

  it("--mapa e --trilha", () => {
    const a = lerArgsAtualizarConteudo(["--mapa", "m.json", "c.json", "--trilha", "outra"]);
    expect(a).toMatchObject({ conteudo: "c.json", mapa: "m.json", trilha: "outra" });
  });

  it("recusa com mensagem clara quando o conteúdo some ou sobra", () => {
    // O token depois de --perfil-arquivo é dele: aqui não sobra arquivo de conteúdo.
    expect(() => lerArgsAtualizarConteudo(["--perfil-arquivo", "c.json"])).toThrow(/falta o arquivo de conteúdo/);
    expect(() => lerArgsAtualizarConteudo(["a.json", "b.json"])).toThrow(/mais de um arquivo de conteúdo/);
    expect(() => lerArgsAtualizarConteudo(["c.json", "--mapa"])).toThrow(/--mapa precisa de um valor/);
    expect(() => lerArgsAtualizarConteudo(["c.json", "--perfil"])).toThrow(/flag desconhecida/);
  });
});

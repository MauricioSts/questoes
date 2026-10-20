-- Dados do teste de ponta a ponta do sandbox (banco descartável, nunca o de produção).
-- Um exercício por linguagem, cada um com 1 teste visível e 2 ocultos, e um usuário por
-- linguagem (o limite de 10 execuções/min é por usuário).

-- Role do worker com as mesmas permissões descritas no README: só lê Exercicio e
-- TesteExercicio e só enxerga/atualiza as colunas de Execucao que usa.
CREATE ROLE questoes_sandbox_e2e LOGIN PASSWORD 'e2e';
GRANT USAGE ON SCHEMA public TO questoes_sandbox_e2e;
GRANT SELECT ON "Exercicio", "TesteExercicio" TO questoes_sandbox_e2e;
GRANT SELECT (id, "exercicioId", finalidade, linguagem, codigo, status, "createdAt") ON "Execucao" TO questoes_sandbox_e2e;
GRANT UPDATE (status, resultado, "iniciadoEm", "concluidoEm") ON "Execucao" TO questoes_sandbox_e2e;

INSERT INTO "User" (id, email, "passwordHash", nome)
SELECT 'e2e-' || l, 'e2e-' || l || '@sandbox.local', 'x', 'E2E ' || l
  FROM unnest(ARRAY['python','javascript','typescript','java','cpp','sql','shell','testes']) AS l;

-- io: soma dos inteiros da linha. O 2º teste oculto tem negativo: a solução "errada"
-- (soma dos módulos) passa no visível e cai nele.
INSERT INTO "Exercicio" (id, "trilhaId", titulo, enunciado, linguagem, modo, dificuldade, topico)
SELECT 'e2e-' || l, 'dev-python', 'Soma (' || l || ')', 'Some os inteiros da linha.', l, 'io', 'facil', 'e2e'
  FROM unnest(ARRAY['python','javascript','typescript','java','cpp']) AS l;

INSERT INTO "TesteExercicio" (id, "exercicioId", ordem, oculto, nome, entrada, "saidaEsperada")
SELECT 'e2e-' || l || '-' || t.ordem, 'e2e-' || l, t.ordem, t.oculto, t.nome, t.entrada, t.saida
  FROM unnest(ARRAY['python','javascript','typescript','java','cpp']) AS l,
       (VALUES (0, false, 'visível', E'1 2 3\n', '6'),
               (1, true, 'oculto positivo', E'40 2\n', '42'),
               (2, true, 'oculto negativo', E'10 -5 7\n', '12')) AS t(ordem, oculto, nome, entrada, saida);

-- sql: nomes com nota >= 7. Os ocultos inserem linhas novas (dados que o aluno não vê).
INSERT INTO "Exercicio" (id, "trilhaId", titulo, enunciado, linguagem, modo, "seedSql", dificuldade, topico)
VALUES ('e2e-sql', 'dev-python', 'Aprovados (sql)', 'Nomes com nota >= 7.', 'sql', 'sql',
        E'CREATE TABLE aluno (nome TEXT, nota INT);\nINSERT INTO aluno VALUES (''Ana'', 9), (''Bia'', 5), (''Caio'', 8);\n',
        'facil', 'e2e');
INSERT INTO "TesteExercicio" (id, "exercicioId", ordem, oculto, nome, entrada, "saidaEsperada", comparacao) VALUES
  ('e2e-sql-0', 'e2e-sql', 0, false, 'visível', '', E'Ana\nCaio', 'conjunto'),
  ('e2e-sql-1', 'e2e-sql', 1, true, 'oculto nota 7', E'INSERT INTO aluno VALUES (''Duda'', 7);', E'Ana\nCaio\nDuda', 'conjunto'),
  ('e2e-sql-2', 'e2e-sql', 2, true, 'oculto vazio', 'DELETE FROM aluno;', '', 'conjunto');

-- shell: criar a branch feature com um commit de b.txt. A entrada de cada teste é o
-- script de conferência, rodado depois do script do aluno.
INSERT INTO "Exercicio" (id, "trilhaId", titulo, enunciado, linguagem, modo, "seedSql", dificuldade, topico)
VALUES ('e2e-shell', 'dev-python', 'Branch (shell)', 'Crie a branch feature com b.txt.', 'shell', 'shell',
        E'git init -q -b main . && echo a > a.txt && git add a.txt && git commit -qm inicial\n',
        'facil', 'e2e');
INSERT INTO "TesteExercicio" (id, "exercicioId", ordem, oculto, nome, entrada, "saidaEsperada") VALUES
  ('e2e-shell-0', 'e2e-shell', 0, false, 'visível', E'git branch --list feature | wc -l\n', '1'),
  ('e2e-shell-1', 'e2e-shell', 1, true, 'oculto conteúdo', E'git show feature:b.txt\n', 'b'),
  ('e2e-shell-2', 'e2e-shell', 2, true, 'oculto main intacta', E'git log --oneline main | wc -l\n', '1');

-- testes: o aluno escreve testes que passam na implementação certa e pegam o mutante.
INSERT INTO "Exercicio" (id, "trilhaId", titulo, enunciado, linguagem, modo, dificuldade, topico)
VALUES ('e2e-testes', 'dev-python', 'Testes de dobro', 'Teste alvo.dobro.', 'python', 'testes', 'facil', 'e2e');
INSERT INTO "TesteExercicio" (id, "exercicioId", ordem, oculto, nome, entrada, "saidaEsperada") VALUES
  ('e2e-testes-0', 'e2e-testes', 0, false, 'implementação certa', E'def dobro(x):\n    return 2 * x\n', 'PASSOU'),
  ('e2e-testes-1', 'e2e-testes', 1, true, 'mutante soma', E'def dobro(x):\n    return x + 2\n', 'FALHOU'),
  ('e2e-testes-2', 'e2e-testes', 2, true, 'mutante quadrado', E'def dobro(x):\n    return x * x\n', 'FALHOU');

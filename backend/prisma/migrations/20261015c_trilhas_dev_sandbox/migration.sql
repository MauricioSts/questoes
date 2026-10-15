-- Trilhas oficiais de desenvolvimento + sandbox de código: vínculo N:N questão↔trilha,
-- tipo da questão (conceitual|saida|erro), exercícios práticos com testes (ocultos só no
-- backend) e a fila de execuções do sandbox.

-- AlterTable
ALTER TABLE "Questao" ADD COLUMN     "execucaoId" TEXT,
ADD COLUMN     "tipo" TEXT NOT NULL DEFAULT 'conceitual';

-- CreateTable
CREATE TABLE "QuestaoTrilha" (
    "questaoId" INTEGER NOT NULL,
    "trilhaId" TEXT NOT NULL,
    "materia" TEXT,
    "topico" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestaoTrilha_pkey" PRIMARY KEY ("questaoId","trilhaId")
);

-- CreateTable
CREATE TABLE "Exercicio" (
    "id" TEXT NOT NULL,
    "trilhaId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "enunciado" TEXT NOT NULL,
    "linguagem" TEXT NOT NULL,
    "modo" TEXT NOT NULL DEFAULT 'io',
    "codigoInicial" TEXT NOT NULL DEFAULT '',
    "seedSql" TEXT,
    "dificuldade" TEXT NOT NULL,
    "topico" TEXT NOT NULL,
    "origem" TEXT NOT NULL DEFAULT 'autoral',
    "publicado" BOOLEAN NOT NULL DEFAULT true,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Exercicio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TesteExercicio" (
    "id" TEXT NOT NULL,
    "exercicioId" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "oculto" BOOLEAN NOT NULL DEFAULT false,
    "nome" TEXT NOT NULL DEFAULT '',
    "entrada" TEXT NOT NULL DEFAULT '',
    "saidaEsperada" TEXT NOT NULL,
    "comparacao" TEXT NOT NULL DEFAULT 'exata',

    CONSTRAINT "TesteExercicio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Execucao" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "exercicioId" TEXT,
    "finalidade" TEXT NOT NULL,
    "linguagem" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'fila',
    "resultado" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "iniciadoEm" TIMESTAMP(3),
    "concluidoEm" TIMESTAMP(3),

    CONSTRAINT "Execucao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuestaoTrilha_trilhaId_idx" ON "QuestaoTrilha"("trilhaId");

-- CreateIndex
CREATE INDEX "Exercicio_trilhaId_ordem_idx" ON "Exercicio"("trilhaId", "ordem");

-- CreateIndex
CREATE INDEX "TesteExercicio_exercicioId_ordem_idx" ON "TesteExercicio"("exercicioId", "ordem");

-- CreateIndex
CREATE INDEX "Execucao_status_createdAt_idx" ON "Execucao"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Execucao_userId_createdAt_idx" ON "Execucao"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Execucao_hash_idx" ON "Execucao"("hash");

-- AddForeignKey
ALTER TABLE "Questao" ADD CONSTRAINT "Questao_execucaoId_fkey" FOREIGN KEY ("execucaoId") REFERENCES "Execucao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestaoTrilha" ADD CONSTRAINT "QuestaoTrilha_questaoId_fkey" FOREIGN KEY ("questaoId") REFERENCES "Questao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestaoTrilha" ADD CONSTRAINT "QuestaoTrilha_trilhaId_fkey" FOREIGN KEY ("trilhaId") REFERENCES "Trilha"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exercicio" ADD CONSTRAINT "Exercicio_trilhaId_fkey" FOREIGN KEY ("trilhaId") REFERENCES "Trilha"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TesteExercicio" ADD CONSTRAINT "TesteExercicio_exercicioId_fkey" FOREIGN KEY ("exercicioId") REFERENCES "Exercicio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Execucao" ADD CONSTRAINT "Execucao_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Execucao" ADD CONSTRAINT "Execucao_exercicioId_fkey" FOREIGN KEY ("exercicioId") REFERENCES "Exercicio"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- As 9 trilhas nascem fora da lista (publicada = false) até terem as 50 questões.
INSERT INTO "Trilha" ("id","nome","cargo","iniciais","banca","orgao","ano","descricao","publicada","ordem","tipo") VALUES
('dev-python','Python','Desenvolvimento de Software','PY','devconcursado','Trilha oficial',2026,'Tipos, coleções, funções, orientação a objetos, exceções, geradores e as pegadinhas da linguagem, com questões de saída de código e exercícios práticos.',false,110,'outro'),
('dev-javascript-typescript','JavaScript / TypeScript','Desenvolvimento de Software','JS','devconcursado','Trilha oficial',2026,'Coerção, escopo, closures, this, event loop, Promises e o sistema de tipos do TypeScript, com questões de saída de código e exercícios práticos.',false,120,'outro'),
('dev-java','Java','Desenvolvimento de Software','JV','devconcursado','Trilha oficial',2026,'Wrappers, Strings, orientação a objetos, exceções, coleções, generics, streams e records, com questões de saída de código e exercícios práticos.',false,130,'outro'),
('dev-cpp','C++','Desenvolvimento de Software','C++','devconcursado','Trilha oficial',2026,'Ponteiros, referências, RAII, cópia e movimento, STL, templates, polimorfismo e comportamento indefinido, com questões de saída de código e exercícios práticos.',false,140,'outro'),
('dev-banco-de-dados','Banco de Dados','Desenvolvimento de Software','BD','devconcursado','Trilha oficial',2026,'SQL, modelagem, normalização, índices, transações e ACID, isolamento e NoSQL, com consultas SQL corrigidas automaticamente.',false,150,'outro'),
('dev-arquitetura','Arquitetura de Software','Desenvolvimento de Software','ARQ','devconcursado','Trilha oficial',2026,'SOLID, padrões de projeto, camadas, arquitetura hexagonal, microsserviços, DDD básico e APIs REST.',false,160,'outro'),
('dev-testes','Testes','Desenvolvimento de Software','TST','devconcursado','Trilha oficial',2026,'Testes unitários, de integração e e2e, TDD, dublês de teste, cobertura e pirâmide de testes, com exercícios em que os seus testes precisam pegar bugs.',false,170,'outro'),
('dev-git-devops','Git e DevOps','Desenvolvimento de Software','GIT','devconcursado','Trilha oficial',2026,'Git por dentro, merge e rebase, CI/CD, containers e Docker, com exercícios num repositório de verdade.',false,180,'outro'),
('dev-seguranca','Segurança no Desenvolvimento','Desenvolvimento de Software','SEC','devconcursado','Trilha oficial',2026,'OWASP Top 10, injeção de SQL, XSS, CSRF, autenticação e JWT, hashing de senhas, com exercícios de corrigir código vulnerável.',false,190,'outro');

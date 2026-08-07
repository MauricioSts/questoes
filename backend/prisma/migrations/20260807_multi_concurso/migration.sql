-- Multi-concurso: novos modelos Concurso, PaginaCaderno, PostIt + coluna concursoId
-- nas tabelas de conteúdo/progresso, com backfill para um concurso padrão por usuário.

-- 1. Novas tabelas -----------------------------------------------------------
CREATE TABLE "Concurso" (
    "id"         TEXT NOT NULL,
    "userId"     TEXT NOT NULL,
    "nome"       TEXT NOT NULL,
    "iniciais"   TEXT NOT NULL,
    "banca"      TEXT NOT NULL,
    "ano"        INTEGER NOT NULL,
    "cargo"      TEXT NOT NULL,
    "dataProva"  TIMESTAMP(3) NOT NULL,
    "metaDiaria" INTEGER NOT NULL DEFAULT 30,
    "arquivado"  BOOLEAN NOT NULL DEFAULT false,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Concurso_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Concurso_userId_idx" ON "Concurso"("userId");

CREATE TABLE "PaginaCaderno" (
    "id"         TEXT NOT NULL,
    "userId"     TEXT NOT NULL,
    "concursoId" TEXT NOT NULL,
    "materia"    TEXT NOT NULL,
    "titulo"     TEXT NOT NULL DEFAULT '',
    "conteudo"   TEXT NOT NULL DEFAULT '',
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"  TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PaginaCaderno_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PaginaCaderno_userId_concursoId_idx" ON "PaginaCaderno"("userId", "concursoId");

CREATE TABLE "PostIt" (
    "id"         TEXT NOT NULL,
    "userId"     TEXT NOT NULL,
    "concursoId" TEXT NOT NULL,
    "x"          DOUBLE PRECISION NOT NULL DEFAULT 0,
    "y"          DOUBLE PRECISION NOT NULL DEFAULT 0,
    "texto"      TEXT NOT NULL DEFAULT '',
    "cor"        TEXT NOT NULL DEFAULT 'amber',
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"  TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PostIt_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PostIt_userId_concursoId_idx" ON "PostIt"("userId", "concursoId");

-- 2. Colunas concursoId (nullable) -------------------------------------------
ALTER TABLE "Questao" ADD COLUMN "concursoId" TEXT;
ALTER TABLE "Answer"  ADD COLUMN "concursoId" TEXT;
ALTER TABLE "Nota"    ADD COLUMN "concursoId" TEXT;
ALTER TABLE "Marcada" ADD COLUMN "concursoId" TEXT;

CREATE INDEX "Questao_concursoId_idx" ON "Questao"("concursoId");

-- 3. Backfill: um concurso padrão "Dataprev" por usuário ---------------------
INSERT INTO "Concurso" ("id", "userId", "nome", "iniciais", "banca", "ano", "cargo", "dataProva", "metaDiaria", "arquivado", "createdAt")
SELECT
    'seed_' || u."id",
    u."id",
    'Dataprev — Analista de TI',
    'TI',
    'FGV',
    2026,
    'Analista de TI',
    COALESCE(u."dataProva", CURRENT_TIMESTAMP + INTERVAL '120 days'),
    COALESCE(u."metaDiaria", 70),
    false,
    CURRENT_TIMESTAMP
FROM "User" u;

-- Respostas/notas/marcações: cada uma vai para o concurso padrão do seu usuário.
UPDATE "Answer"  SET "concursoId" = 'seed_' || "userId" WHERE "concursoId" IS NULL;
UPDATE "Nota"    SET "concursoId" = 'seed_' || "userId" WHERE "concursoId" IS NULL;
UPDATE "Marcada" SET "concursoId" = 'seed_' || "userId" WHERE "concursoId" IS NULL;

-- Questões são conteúdo compartilhado (sem userId): vão para o concurso padrão do
-- usuário mais antigo (o dono do banco atual, single-user na prática).
UPDATE "Questao"
SET "concursoId" = (SELECT 'seed_' || "id" FROM "User" ORDER BY "createdAt" ASC LIMIT 1)
WHERE "concursoId" IS NULL
  AND EXISTS (SELECT 1 FROM "User");

-- 4. Foreign keys ------------------------------------------------------------
ALTER TABLE "Concurso" ADD CONSTRAINT "Concurso_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaginaCaderno" ADD CONSTRAINT "PaginaCaderno_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaginaCaderno" ADD CONSTRAINT "PaginaCaderno_concursoId_fkey"
    FOREIGN KEY ("concursoId") REFERENCES "Concurso"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PostIt" ADD CONSTRAINT "PostIt_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PostIt" ADD CONSTRAINT "PostIt_concursoId_fkey"
    FOREIGN KEY ("concursoId") REFERENCES "Concurso"("id") ON DELETE CASCADE ON UPDATE CASCADE;

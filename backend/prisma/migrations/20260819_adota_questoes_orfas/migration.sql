-- Conserta os lotes importados depois do multi-concurso: o frontend não mandava o
-- concursoId, então as questões nasciam com concursoId NULL e GET /questoes (que filtra
-- pelo concurso ativo) nunca as devolvia. Elas estavam no banco, mas sumiam do app.
-- Mesma regra do backfill original: vão para o concurso mais antigo do usuário mais
-- antigo (single-user na prática).
UPDATE "Questao"
SET "concursoId" = (
    SELECT c."id" FROM "Concurso" c
    JOIN "User" u ON u."id" = c."userId"
    ORDER BY u."createdAt" ASC, c."createdAt" ASC
    LIMIT 1
)
WHERE "concursoId" IS NULL
  AND EXISTS (SELECT 1 FROM "Concurso");

-- Tira o travessão do nome de concurso criado pelo backfill ("Dataprev — Analista de
-- TI"), que aparece no seletor de concurso do app.
UPDATE "Concurso" SET "nome" = replace("nome", ' — ', ': ') WHERE "nome" LIKE '% — %';

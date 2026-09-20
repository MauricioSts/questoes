-- Trilhas: dono compartilhado do banco de questões. Antes, Questao.concursoId apontava
-- para o Concurso de um único usuário, então qualquer outra conta começava com o banco
-- vazio. A trilha passa a ser o que o usuário escolhe ao entrar, e o Concurso continua
-- sendo a cópia pessoal (progresso, meta, caderno) de quem a segue.
CREATE TABLE "Trilha" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cargo" TEXT NOT NULL,
    "iniciais" TEXT NOT NULL,
    "banca" TEXT NOT NULL,
    "orgao" TEXT NOT NULL,
    "ano" INTEGER NOT NULL,
    "descricao" TEXT NOT NULL,
    "dataProva" TIMESTAMP(3),
    "publicada" BOOLEAN NOT NULL DEFAULT true,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Trilha_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Trilha_publicada_ordem_idx" ON "Trilha"("publicada", "ordem");

ALTER TABLE "Questao" ADD COLUMN "trilhaId" TEXT;
ALTER TABLE "Concurso" ADD COLUMN "trilhaId" TEXT;

CREATE INDEX "Questao_trilhaId_idx" ON "Questao"("trilhaId");
CREATE INDEX "Concurso_trilhaId_idx" ON "Concurso"("trilhaId");

ALTER TABLE "Questao" ADD CONSTRAINT "Questao_trilhaId_fkey"
    FOREIGN KEY ("trilhaId") REFERENCES "Trilha"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Concurso" ADD CONSTRAINT "Concurso_trilhaId_fkey"
    FOREIGN KEY ("trilhaId") REFERENCES "Trilha"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: o acervo existente vira a primeira trilha. A data da prova e a meta saem do
-- concurso semente, para quem entrar agora começar com os mesmos parâmetros.
INSERT INTO "Trilha" ("id", "nome", "cargo", "iniciais", "banca", "orgao", "ano", "descricao", "dataProva", "publicada", "ordem")
SELECT
    'dataprev-analista-ti',
    'Dataprev',
    'Analista de TI',
    'DTPV',
    c."banca",
    'Dataprev',
    c."ano",
    'Questões de TI no padrão FGV: desenvolvimento de software, banco de dados, arquitetura, segurança e gestão, além das disciplinas gerais. O acervo vem de provas oficiais da banca, de adaptações delas e de questões escritas para reforçar os pontos que mais derrubam.',
    c."dataProva",
    true,
    0
FROM "Concurso" c
WHERE c."id" = 'seed_cmrc6ch2y0000zgjkb43cy31g';

-- Todo o acervo do concurso semente passa a pertencer à trilha (o concursoId original
-- fica intacto: quem importou continua vendo tudo pelo caminho antigo também).
UPDATE "Questao" SET "trilhaId" = 'dataprev-analista-ti'
WHERE "concursoId" = 'seed_cmrc6ch2y0000zgjkb43cy31g';

UPDATE "Concurso" SET "trilhaId" = 'dataprev-analista-ti'
WHERE "id" = 'seed_cmrc6ch2y0000zgjkb43cy31g';

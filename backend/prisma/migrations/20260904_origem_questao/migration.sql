-- Procedência da questão (de que prova veio, se é adaptada, se foi gerada como reforço).

CREATE TABLE "Prova" (
    "chave" TEXT NOT NULL,
    "banca" TEXT NOT NULL,
    "orgao" TEXT NOT NULL,
    "ano" INTEGER NOT NULL,
    "cargo" TEXT,
    "tipo" TEXT,
    "url" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Prova_pkey" PRIMARY KEY ("chave")
);

CREATE INDEX "Prova_banca_ano_idx" ON "Prova"("banca", "ano");

ALTER TABLE "Questao" ADD COLUMN "origem" TEXT NOT NULL DEFAULT 'autoral';
ALTER TABLE "Questao" ADD COLUMN "provaChave" TEXT;
ALTER TABLE "Questao" ADD COLUMN "numeroOriginal" INTEGER;
ALTER TABLE "Questao" ADD COLUMN "geradaDe" JSONB;

CREATE INDEX "Questao_origem_idx" ON "Questao"("origem");
CREATE INDEX "Questao_provaChave_idx" ON "Questao"("provaChave");

ALTER TABLE "Questao" ADD CONSTRAINT "Questao_provaChave_fkey"
    FOREIGN KEY ("provaChave") REFERENCES "Prova"("chave") ON DELETE SET NULL ON UPDATE CASCADE;

-- Snapshot da origem na resposta: permite estatística por prova/origem sem reler a questão.
ALTER TABLE "Answer" ADD COLUMN "origemSnapshot" TEXT;
ALTER TABLE "Answer" ADD COLUMN "provaSnapshot" TEXT;

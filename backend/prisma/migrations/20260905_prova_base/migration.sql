-- Prova-base do lote: de que prova o lote foi montado, valendo para TODAS as questões
-- dele, inclusive as autorais escritas junto. Diferente de "provaChave", que é uma
-- afirmação sobre o texto da questão ("saiu desta prova") e só vale em oficial/adaptada.
-- Sem esta coluna, a única forma de atribuir uma autoral ao seu lote de origem seria
-- poluir provaChave, o que faria a estatística por prova contar questão que nunca caiu nela.
ALTER TABLE "Questao" ADD COLUMN "provaBaseChave" TEXT;

CREATE INDEX "Questao_provaBaseChave_idx" ON "Questao"("provaBaseChave");

ALTER TABLE "Questao" ADD CONSTRAINT "Questao_provaBaseChave_fkey"
    FOREIGN KEY ("provaBaseChave") REFERENCES "Prova"("chave") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill dos lotes já existentes: a prova-base é a mesma que as adaptadas já apontam.
UPDATE "Questao" SET "provaBaseChave" = 'FGV_DPE-RS_2023_ANALISTA-TI-DESENVOLVIMENTO'   WHERE id BETWEEN 191 AND 260;
UPDATE "Questao" SET "provaBaseChave" = 'FGV_CM-FORTALEZA_2024_ANALISTA-INFORMATICA'    WHERE id BETWEEN 261 AND 330;
UPDATE "Questao" SET "provaBaseChave" = 'FGV_MPU_2025_ANALISTA-DESENVOLVIMENTO'         WHERE id BETWEEN 331 AND 400;
UPDATE "Questao" SET "provaBaseChave" = 'FGV_AMAZUL_2026_ANALISTA-DESENVOLVIMENTO'      WHERE id BETWEEN 431 AND 500;
UPDATE "Questao" SET "provaBaseChave" = 'FGV_DATAPREV_2024_ATI-DESENVOLVIMENTO'         WHERE id BETWEEN 1 AND 70;

-- Rastreio de lote: rótulo (nome do arquivo) e índice por createdAt (chave do lote).
ALTER TABLE "Questao" ADD COLUMN "loteNome" TEXT;
CREATE INDEX "Questao_createdAt_idx" ON "Questao"("createdAt");

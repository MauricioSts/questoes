-- Idempotência de respostas: id opcional gerado no cliente para deduplicar
-- reenvios da fila offline. NULL permitido (respostas antigas não têm).
ALTER TABLE "Answer" ADD COLUMN "clientId" TEXT;
CREATE UNIQUE INDEX "Answer_clientId_key" ON "Answer"("clientId");

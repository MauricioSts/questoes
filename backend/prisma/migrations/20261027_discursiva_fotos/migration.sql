-- Discursiva semanal: título, data de liberação (terça), padrão de resposta opcional,
-- origem da tentativa (treino ou simulado) e fotos da folha escrita à mão.

ALTER TABLE "Discursiva" ADD COLUMN "titulo" TEXT;
ALTER TABLE "Discursiva" ADD COLUMN "liberaEm" TIMESTAMP(3);
ALTER TABLE "Discursiva" ALTER COLUMN "padraoResposta" DROP NOT NULL;

ALTER TABLE "TentativaDiscursiva" ADD COLUMN "origem" TEXT NOT NULL DEFAULT 'TREINO';

CREATE TABLE "FotoDiscursiva" (
    "id" TEXT NOT NULL,
    "tentativaId" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "dados" BYTEA NOT NULL,
    "bytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FotoDiscursiva_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FotoDiscursiva_tentativaId_idx" ON "FotoDiscursiva"("tentativaId");

ALTER TABLE "FotoDiscursiva" ADD CONSTRAINT "FotoDiscursiva_tentativaId_fkey" FOREIGN KEY ("tentativaId") REFERENCES "TentativaDiscursiva"("id") ON DELETE CASCADE ON UPDATE CASCADE;

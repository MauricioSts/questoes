-- Leituras de PDF por IA (saldo de páginas por mês).
CREATE TABLE "ImportacaoPdf" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "trilhaId" TEXT,
    "paginas" INTEGER NOT NULL,
    "questoes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ImportacaoPdf_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ImportacaoPdf_userId_createdAt_idx" ON "ImportacaoPdf"("userId", "createdAt");
ALTER TABLE "ImportacaoPdf" ADD CONSTRAINT "ImportacaoPdf_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Resultado do simulado certo/errado (nota por grupo, brancos), ver ResultadoProva.
-- CreateTable
CREATE TABLE "ResultadoProva" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "concursoId" TEXT NOT NULL,
    "perfilProvaId" TEXT NOT NULL,
    "dados" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResultadoProva_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ResultadoProva_userId_concursoId_createdAt_idx" ON "ResultadoProva"("userId", "concursoId", "createdAt");

-- AddForeignKey
ALTER TABLE "ResultadoProva" ADD CONSTRAINT "ResultadoProva_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AlterTable
ALTER TABLE "User" ADD COLUMN     "dataProva" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "SessaoAtiva" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contexto" "Contexto" NOT NULL DEFAULT 'ESTUDO',
    "questaoIds" INTEGER[],
    "cursor" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SessaoAtiva_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SessaoAtiva_userId_key" ON "SessaoAtiva"("userId");

-- AddForeignKey
ALTER TABLE "SessaoAtiva" ADD CONSTRAINT "SessaoAtiva_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

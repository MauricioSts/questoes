-- Batalha: jornada compartilhada entre trilhas ou separada (do zero) por trilha.
-- AlterTable
ALTER TABLE "PokeSave" ADD COLUMN     "ultimaTrilhaId" TEXT;

-- CreateTable
CREATE TABLE "PokeSaveTrilha" (
    "userId" TEXT NOT NULL,
    "trilhaId" TEXT NOT NULL,
    "separada" BOOLEAN NOT NULL DEFAULT false,
    "perfil" JSONB,
    "partida" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PokeSaveTrilha_pkey" PRIMARY KEY ("userId","trilhaId")
);

-- AddForeignKey
ALTER TABLE "PokeSaveTrilha" ADD CONSTRAINT "PokeSaveTrilha_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


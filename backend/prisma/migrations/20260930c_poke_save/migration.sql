-- CreateTable
CREATE TABLE "PokeSave" (
    "userId" TEXT NOT NULL,
    "perfil" JSONB,
    "partida" JSONB,
    "jogador" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PokeSave_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "PokeSave" ADD CONSTRAINT "PokeSave_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

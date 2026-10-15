-- Verificação em duas etapas por código no e-mail.
ALTER TABLE "User" ADD COLUMN "doisFatores" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "CodigoEmail" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "finalidade" TEXT NOT NULL,
    "desafioHash" TEXT NOT NULL,
    "codigoHash" TEXT NOT NULL,
    "tentativas" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CodigoEmail_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CodigoEmail_desafioHash_key" ON "CodigoEmail"("desafioHash");
CREATE INDEX "CodigoEmail_userId_idx" ON "CodigoEmail"("userId");
ALTER TABLE "CodigoEmail" ADD CONSTRAINT "CodigoEmail_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

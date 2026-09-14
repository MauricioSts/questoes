-- Aprovação de conta pelo admin: contas existentes continuam liberadas (default true).
ALTER TABLE "User" ADD COLUMN "aprovado" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN "aprovacaoTokenHash" TEXT;

CREATE UNIQUE INDEX "User_aprovacaoTokenHash_key" ON "User"("aprovacaoTokenHash");

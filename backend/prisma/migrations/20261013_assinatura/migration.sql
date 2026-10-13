ALTER TABLE "User" ADD COLUMN "cortesia" BOOLEAN NOT NULL DEFAULT false;

-- Quem já tinha conta liberada antes da assinatura existir continua com acesso completo.
UPDATE "User" SET "cortesia" = true WHERE "aprovado" = true;

CREATE TABLE "Assinatura" (
    "userId" TEXT NOT NULL,
    "plano" TEXT NOT NULL,
    "mpPreapprovalId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "proximaCobranca" TIMESTAMP(3),
    "validoAte" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Assinatura_pkey" PRIMARY KEY ("userId")
);

CREATE UNIQUE INDEX "Assinatura_mpPreapprovalId_key" ON "Assinatura"("mpPreapprovalId");

ALTER TABLE "Assinatura" ADD CONSTRAINT "Assinatura_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- E-mail confirmado por código. Quem já ligou as duas etapas passou pelo código.
ALTER TABLE "User" ADD COLUMN "emailVerificado" BOOLEAN NOT NULL DEFAULT false;
UPDATE "User" SET "emailVerificado" = true WHERE "doisFatores" = true;

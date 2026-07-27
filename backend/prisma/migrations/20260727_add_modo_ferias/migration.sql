-- Modo férias: dias marcados não quebram a ofensiva.
ALTER TABLE "User" ADD COLUMN "feriasAtivo" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "feriasDesde" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "feriasAte" TIMESTAMP(3);

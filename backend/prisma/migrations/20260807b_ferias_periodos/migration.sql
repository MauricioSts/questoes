-- Histórico de períodos de modo férias (antes era uma única janela no User, que era
-- sobrescrita a cada toggle → a ofensiva quebrava retroativamente).

CREATE TABLE "FeriasPeriodo" (
    "id"        TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "inicio"    TIMESTAMP(3) NOT NULL,
    "fim"       TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FeriasPeriodo_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "FeriasPeriodo_userId_idx" ON "FeriasPeriodo"("userId");
ALTER TABLE "FeriasPeriodo" ADD CONSTRAINT "FeriasPeriodo_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migra a janela única existente (se durar mais de 1 minuto — descarta toggles de teste).
INSERT INTO "FeriasPeriodo" ("id", "userId", "inicio", "fim", "createdAt")
SELECT 'migr_' || u."id", u."id", u."feriasDesde", u."feriasAte", CURRENT_TIMESTAMP
FROM "User" u
WHERE u."feriasDesde" IS NOT NULL
  AND (u."feriasAte" IS NULL OR u."feriasAte" - u."feriasDesde" > INTERVAL '1 minute');

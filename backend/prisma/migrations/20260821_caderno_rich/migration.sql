-- Caderno rico: distingue páginas antigas (texto puro) das novas (HTML do editor).
-- As linhas já existentes nasceram como texto puro, então entram como 'texto'; o
-- default da coluna vira 'html' em seguida, que é o formato de tudo daqui pra frente.
ALTER TABLE "PaginaCaderno" ADD COLUMN "formato" TEXT NOT NULL DEFAULT 'texto';
ALTER TABLE "PaginaCaderno" ALTER COLUMN "formato" SET DEFAULT 'html';

CREATE TABLE "PokeVitrine" (
    "userId" TEXT NOT NULL,
    "dados" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PokeVitrine_pkey" PRIMARY KEY ("userId")
);
ALTER TABLE "PokeVitrine" ADD CONSTRAINT "PokeVitrine_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

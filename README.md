# Banco de Questões — Concurso Dataprev 2026 (FGV)

App de estudo por questões, mobile-first e PWA. Frontend estático (Vercel) + backend
Node/Express/Postgres (servidor próprio).

## Arquitetura

- **Conteúdo estático:** as questões vivem em `frontend/src/data/questoes.json` e são
  empacotadas no bundle. O backend **nunca** armazena enunciado/alternativas/gabarito — só
  conhece a questão pelo `id` (inteiro). A correção acontece no frontend e só o resultado
  (acertou, alternativa, tempo, snapshots) é persistido.
- **Quem decide o quê:** montagem de sessão que depende de proporção/sorteio (simulado, flash,
  tópico) roda no **frontend** (`src/lib/sessionBuilder.ts`), que tem o JSON. O **backend** só
  devolve *IDs* priorizados (`/answers/wrong`, `/answers/week`) e agregados de estatística.

## Estrutura

```
backend/   Express + Prisma + Postgres (JWT auth, answers, notes, goals, stats)
frontend/  Vite + React + TS + Tailwind + PWA (Recharts)
```

## Como rodar (dev)

### Backend
```bash
cd backend
cp .env.example .env        # ajuste DATABASE_URL e os segredos JWT
npm install
npx prisma migrate dev      # cria as tabelas
npm run seed                # cria o usuário inicial
npm run dev                 # http://localhost:3333
```

### Frontend
```bash
cd frontend
cp .env.example .env        # VITE_API_URL=http://localhost:3333
npm install
npm run dev                 # http://localhost:5173
```

## Deploy
- **Frontend → Vercel:** ver [frontend/README.md](frontend/README.md).
- **Backend → servidor próprio:** ver [backend/README.md](backend/README.md).

## Ordem de implementação
auth → registro de respostas → modo estudo → stats → flash → tópico → simulado → PWA/polish.

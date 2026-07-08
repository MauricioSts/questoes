# Backend — API de Questões

Express + TypeScript + Prisma + PostgreSQL. JWT (access + refresh), bcrypt.

## Rotas

| Método | Rota | Descrição |
|---|---|---|
| POST | `/auth/register` | cria usuário, devolve access+refresh |
| POST | `/auth/login` | autentica, devolve access+refresh |
| POST | `/auth/refresh` | rotaciona refresh token |
| POST | `/auth/logout` | revoga refresh token |
| GET | `/auth/me` | usuário logado |
| POST | `/answers` | registra 1 resposta (com snapshots) |
| POST | `/answers/batch` | registra lote (simulado) |
| GET | `/answers/stats?period=7d\|30d\|all` | agregados p/ dashboard |
| GET | `/answers/wrong?modulo=II&limit=10` | IDs errados priorizados (Flash) |
| GET | `/answers/week` | questões da semana + flag de erro (Simulado) |
| GET | `/goals/today` | respondidas hoje vs meta + streak |
| GET/PUT | `/notes/:questaoId` | ler/salvar anotação |
| GET | `/notes` | todas as anotações |
| GET/PUT/DELETE | `/marcadas[/:questaoId]` | "revisar depois" |

Todas as rotas (exceto `/auth/*` e `/health`) exigem `Authorization: Bearer <accessToken>`.

## Rodar em dev
```bash
cp .env.example .env
npm install
npx prisma migrate dev     # cria tabelas + client
npm run seed               # usuário inicial (SEED_EMAIL/SEED_PASSWORD do .env)
npm run dev
```

## Deploy no servidor próprio (Node + Postgres)

1. **Postgres**: crie o banco e um usuário, ajuste `DATABASE_URL` no `.env` do servidor.
2. **Build**:
   ```bash
   npm ci
   npx prisma generate
   npm run build            # gera dist/
   npx prisma migrate deploy   # aplica migrations em produção
   npm run seed             # (só na 1ª vez)
   ```
3. **Rodar**: `NODE_ENV=production node dist/server.js` — recomendado sob **pm2** ou
   **systemd**, atrás de um reverse proxy (nginx) com HTTPS.
4. **CORS**: em produção defina `CORS_ORIGIN=https://mauriciosts.com` (aceita lista separada
   por vírgula).
5. **Segredos**: gere `JWT_ACCESS_SECRET` e `JWT_REFRESH_SECRET` fortes
   (`openssl rand -hex 32`). Nunca comite `.env`.

### Exemplo pm2
```bash
pm2 start dist/server.js --name questoes-api
pm2 save && pm2 startup
```

## Testes
```bash
npm test        # vitest (regras de agregação de estatística etc.)
```

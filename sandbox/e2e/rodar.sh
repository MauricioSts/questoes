#!/usr/bin/env bash
# Teste de ponta a ponta do sandbox com o worker de verdade, sem tocar em produção:
#   1. Postgres descartável num container (porta própria, dados em tmpfs);
#   2. migrações do Prisma + seed.sql (exercícios, testes ocultos, role do worker);
#   3. API local (backend deste checkout) e worker deste checkout apontados para ele;
#   4. casos.ts manda as execuções pela API e confere o veredito.
# Tudo o que sobe é derrubado no fim (por PID / nome de container), passe ou falhe.
# Uso (na VM, com sudo para o docker):  sandbox/e2e/rodar.sh  [filtro, ex.: python ou cpp:fork]
# Precisa de node_modules em backend/ e em sandbox/worker/.
set -euo pipefail

RAIZ="$(cd "$(dirname "$0")/../.." && pwd)"
PORTA_PG="${PORTA_PG:-55432}"
PORTA_API="${PORTA_API:-3397}"
PG_NOME="questoes-e2e-pg-$$"
# Rótulo próprio: o limparOrfaos do worker de teste não pode pegar os containers de produção.
ROTULO="questoes-sandbox-e2e"
TMP="$(mktemp -d)"
API_PID=""
WORKER_PID=""

limpar() {
  set +e
  [ -n "$API_PID" ] && kill "$API_PID" 2>/dev/null
  [ -n "$WORKER_PID" ] && kill -TERM "$WORKER_PID" 2>/dev/null
  for pid in $API_PID $WORKER_PID; do
    for _ in $(seq 1 60); do kill -0 "$pid" 2>/dev/null || break; sleep 0.5; done
    kill -KILL "$pid" 2>/dev/null
  done
  sudo -n docker rm -f "$PG_NOME" >/dev/null 2>&1
  ids="$(sudo -n docker ps -aq --filter "label=$ROTULO=1")"
  [ -n "$ids" ] && sudo -n docker rm -f $ids >/dev/null 2>&1
  rm -rf "$TMP"
}
trap limpar EXIT

# O worker roda como o usuário atual e chama o docker por este wrapper.
printf '#!/bin/sh\nexec sudo -n docker "$@"\n' >"$TMP/docker"
chmod +x "$TMP/docker"

echo "== postgres descartável ($PG_NOME, 127.0.0.1:$PORTA_PG)"
sudo -n docker run -d --rm --name "$PG_NOME" -p "127.0.0.1:$PORTA_PG:5432" \
  -e POSTGRES_PASSWORD=e2e -e POSTGRES_DB=questoes_e2e --tmpfs /var/lib/postgresql/data \
  postgres:16-alpine >/dev/null
for _ in $(seq 1 60); do
  sudo -n docker exec "$PG_NOME" pg_isready -U postgres -d questoes_e2e -q 2>/dev/null && break
  sleep 0.5
done
sleep 1

DB="postgresql://postgres:e2e@127.0.0.1:$PORTA_PG/questoes_e2e?schema=public"
echo "== migrações"
(cd "$RAIZ/backend" && DATABASE_URL="$DB" ./node_modules/.bin/prisma migrate deploy >"$TMP/migrate.log" 2>&1) || {
  cat "$TMP/migrate.log"; exit 1;
}
sudo -n docker exec -i "$PG_NOME" psql -q -v ON_ERROR_STOP=1 -U postgres -d questoes_e2e <"$RAIZ/sandbox/e2e/seed.sql"

SEGREDO="e2e-$(head -c 16 /dev/urandom | od -An -tx1 | tr -d ' \n')"
echo "== API em :$PORTA_API"
(cd "$RAIZ/backend" && exec env -i PATH="$PATH" HOME="$HOME" PORT="$PORTA_API" DATABASE_URL="$DB" \
  JWT_ACCESS_SECRET="$SEGREDO" JWT_REFRESH_SECRET="$SEGREDO-r" ./node_modules/.bin/tsx src/server.ts) >"$TMP/api.log" 2>&1 &
API_PID=$!

echo "== worker (rótulo $ROTULO)"
(cd "$RAIZ/sandbox/worker" && exec env -i PATH="$PATH" HOME="$HOME" DOCKER_BIN="$TMP/docker" SANDBOX_ROTULO="$ROTULO" \
  SANDBOX_DATABASE_URL="postgresql://questoes_sandbox_e2e:e2e@127.0.0.1:$PORTA_PG/questoes_e2e" \
  ./node_modules/.bin/tsx src/index.ts) >"$TMP/worker.log" 2>&1 &
WORKER_PID=$!

for _ in $(seq 1 60); do curl -sf "http://127.0.0.1:$PORTA_API/health" >/dev/null && break; sleep 0.5; done
curl -sf "http://127.0.0.1:$PORTA_API/health" >/dev/null || { cat "$TMP/api.log"; exit 1; }

echo "== casos"
set +e
E2E_API="http://127.0.0.1:$PORTA_API" JWT_ACCESS_SECRET="$SEGREDO" E2E_FILTRO="${1:-}" \
  "$RAIZ/sandbox/worker/node_modules/.bin/tsx" "$RAIZ/sandbox/e2e/casos.ts"
status=$?
set -e
echo "== log do worker"
cat "$TMP/worker.log"
if [ "$status" -ne 0 ]; then echo "== log da API"; tail -n 40 "$TMP/api.log"; fi
exit "$status"

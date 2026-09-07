#!/usr/bin/env bash
# Compara a lógica pura copiada de frontend/src para mobile/ (SDD §4 e §9.1).
#
# A cópia é literal de propósito: enquanto estes arquivos forem idênticos, uma
# divergência entre web e mobile aparece aqui em vez de virar bug em produção.
# Rodar antes de cada release do mobile.
set -u

RAIZ="$(cd "$(dirname "$0")/.." && pwd)"

ARQUIVOS=(
  types/questao.ts
  config/prova.ts
  lib/correcao.ts
  lib/sessionBuilder.ts
  lib/agenda.ts
  lib/legislacao.ts
  lib/portugues.ts
  lib/questoesRepo.ts
  lib/validarLote.ts
  lib/sessao.ts
)

TESTES=(
  sessionBuilder.test.ts
  validarLote.test.ts
)

divergiu=0

for f in "${ARQUIVOS[@]}"; do
  if ! diff -q "$RAIZ/frontend/src/$f" "$RAIZ/mobile/$f" > /dev/null 2>&1; then
    echo "DIVERGIU: $f"
    diff -u "$RAIZ/frontend/src/$f" "$RAIZ/mobile/$f" | sed -n '1,40p'
    divergiu=1
  fi
done

for t in "${TESTES[@]}"; do
  if ! diff -q "$RAIZ/frontend/src/__tests__/$t" "$RAIZ/mobile/__tests__/$t" > /dev/null 2>&1; then
    echo "DIVERGIU (teste): $t"
    divergiu=1
  fi
done

if [ "$divergiu" -eq 0 ]; then
  echo "OK: web e mobile em sincronia (${#ARQUIVOS[@]} arquivos, ${#TESTES[@]} testes)."
fi

exit "$divergiu"

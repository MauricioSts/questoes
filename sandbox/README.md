# Sandbox de código

Roda o código dos exercícios práticos e verifica as questões de "qual a saída". Serviço
separado da API: a API (`backend/src/modules/codigo`) só insere em `Execucao` e lê o
resultado; o worker (`worker/`) pega a fila e executa.

## Como uma execução roda

1. A API valida com zod (64 KB, linguagem da lista de permissão, só usuário logado),
   aplica o limite de 10 execuções/min por usuário e insere a linha com `status = 'fila'`.
2. O worker (`systemd: questoes-sandbox`, usuário `qsandbox`, 2 vagas) pega a próxima
   com `FOR UPDATE SKIP LOCKED`.
3. Sobe um container efêmero com `--runtime runsc` (gVisor), `--network none`, usuário
   65534, rootfs read-only, `/tmp` em tmpfs de 16 MB, 128 MB de memória (256 MB no
   Java), 0,5 CPU, 64 PIDs, `--cap-drop ALL`, `no-new-privileges` e vida máxima de 120 s.
4. Grava o código por `docker exec` (stdin), compila (10 s) e roda cada teste (5 s).
5. Compara a saída **fora** do container: a saída esperada nunca entra nele. Dos testes
   ocultos grava só passou/falhou (o stdout poderia ecoar a entrada oculta).
6. Destrói o container e grava o resultado. A API filtra de novo (`lib/saidaSandbox.ts`).

O worker fala com o Postgres pela role `questoes_sandbox`, que só lê `Exercicio`,
`TesteExercicio` e algumas colunas de `Execucao` (e atualiza status/resultado).
Credenciais em `/etc/questoes-sandbox/env` (root:qsandbox 640).

## Modos

| modo | código do usuário | `TesteExercicio.entrada` | compara |
|---|---|---|---|
| io | programa | stdin | stdout |
| sql | consulta (SQLite `--safe`) | SQL extra aplicado depois do `seedSql` | linhas (`conjunto` sem ORDER BY) |
| testes | testes em Python (`from alvo import ...`) | implementação certa ou mutante | `PASSOU` / `FALHOU` |
| shell | script bash num repo git montado pelo `seedSql` | script de conferência | stdout da conferência |
| livre | (verificação de questão) | — | stdout/stderr/exit crus |

`cpp-ubsan` existe só para verificar questões de comportamento indefinido: o UBSan em
modo trap transforma o UB num sinal observável.

## Operação

- Deploy (imagens + worker + serviço): `sandbox/deploy.sh`
- Logs: `sudo journalctl -u questoes-sandbox -f`
- Testes de fuga e de funcionamento (containers reais): `cd sandbox/worker && sudo npm run test:fuga`
- Unitários: `cd sandbox/worker && npm test`
- Ponta a ponta (API + fila + worker de verdade, sem tocar em produção): `sandbox/e2e/rodar.sh`
  (ou `sandbox/e2e/rodar.sh python`, `sandbox/e2e/rodar.sh cpp:fork`). Sobe um Postgres
  descartável num container (porta 55432), aplica as migrações, cria exercícios com testes
  ocultos em cada linguagem, roda a API (porta 3397) e o worker deste checkout com o rótulo
  `questoes-sandbox-e2e` (`SANDBOX_ROTULO`, para não limpar os containers de produção) e
  confere certo/errado/loop/fork/memória/rede. Derruba tudo no fim.

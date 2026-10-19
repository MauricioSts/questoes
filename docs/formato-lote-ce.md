# Formato do lote de questões CERTO/ERRADO (estilo Cebraspe)

Lote para trilhas cobradas no formato certo/errado (CGU 2026, Bacen…). O formato de
múltipla escolha continua em [FORMATO_LOTE.md](FORMATO_LOTE.md) e não muda.

Um **comando** (texto-base, situação hipotética ou enunciado comum) agrupa vários **itens**.
Cada item é uma afirmação independente que o candidato julga C (certo), E (errado) ou deixa
em branco.

## Estrutura

```json
{
  "lote": "cgu-v1",
  "tipo": "CERTO_ERRADO",
  "perfil": "cgu-2026-dev",
  "provas": {
    "CEBRASPE_BACEN_2024_ANALISTA-TI": {
      "banca": "Cebraspe",
      "orgao": "BACEN",
      "ano": 2024,
      "cargo": "Analista – Tecnologia da Informação",
      "gabarito_fonte": "definitivo"
    }
  },
  "comandos": [
    {
      "id": 1,
      "grupo": "P3",
      "disciplina": "Arquitetura e Integração de Sistemas",
      "texto": "Considerando uma API REST desenvolvida com Spring Boot e protegida com OAuth 2.0, julgue os itens a seguir.",
      "itens": [
        {
          "id": 903,
          "assunto": "OAuth 2.0",
          "dificuldade": "media",
          "afirmacao": "O OAuth 2.0 é um protocolo de autenticação, responsável por verificar a identidade do usuário.",
          "gabarito": "E",
          "explicacao": "O OAuth 2.0 trata de [autorização]: delega acesso a recursos. A autenticação federada é feita pelo [OpenID Connect], camada construída sobre ele.",
          "origem": "autoral"
        },
        {
          "id": 904,
          "assunto": "HTTP",
          "dificuldade": "facil",
          "afirmacao": "O método HTTP PUT é idempotente.",
          "gabarito": "C",
          "explicacao": "Repetir a mesma requisição PUT leva o recurso ao [mesmo estado], por isso ele é idempotente.",
          "origem": "adaptada",
          "prova": "CEBRASPE_BACEN_2024_ANALISTA-TI",
          "numero": 87
        }
      ]
    }
  ]
}
```

## Raiz

| Campo | Obrigatório | Regras |
|---|---|---|
| `lote` | sim | rótulo do lote: `cgu-v1`, `cgu-v2`… |
| `tipo` | sim | sempre `"CERTO_ERRADO"` |
| `perfil` | sim | perfil de pontuação: `"cgu-2026-dev"` ou `"bacen-2024-ti"` |
| `provas` | condicional | provas citadas pelos itens `oficial`/`adaptada`. Cada uma exige `banca`, `orgao`, `ano` (inteiro) e `gabarito_fonte` (`"definitivo"` = gabarito definitivo da banca; `"resolucao_propria"` = resolvido por quem montou o lote, e o app mostra o selo "gabarito não oficial"); `cargo`, `tipo` e `url` são opcionais. Chave no padrão `BANCA_ORGAO_ANO_CARGO`, maiúsculas, sem acento |
| `comandos` | sim | lista com pelo menos 1 comando |
| `pendencias` | opcional | itens da prova que ficaram de fora: `[{ "prova": "<chave>", "numero": 42, "motivo": "anulado" }]`. Motivos: `anulado`, `sem_gabarito`, `depende_de_figura`, `ilegivel`, `fora_do_edital`. Não é importado; aparece no relatório da importação |

## Comando

| Campo | Obrigatório | Regras |
|---|---|---|
| `id` | sim | inteiro do lote, 1, 2, 3… em sequência |
| `grupo` | sim | grupo do perfil: `"P1"`, `"P2"` ou `"P3"` (CGU); `"P1"` ou `"P2"` (Bacen) |
| `disciplina` | sim | nome **exato** de uma disciplina daquele grupo no perfil |
| `texto` | sim | o comando ("julgue os itens a seguir…"), em português acentuado |
| `codigo` + `linguagem` | opcional | bloco de código compartilhado pelos itens, com quebras de linha reais (`\n`) |
| `imagens` | opcional | igual aos lotes de múltipla escolha (data URI) |
| `itens` | sim | pelo menos 1 item; o normal é de 2 a 5 |

## Item

| Campo | Obrigatório | Regras |
|---|---|---|
| `id` | sim | inteiro, **numeração contínua com o banco**: o primeiro item do lote é o próximo id livre e os seguintes vão de 1 em 1, sem pular nem repetir, atravessando os comandos |
| `assunto` | sim | texto curto e consistente (agrupa as estatísticas) |
| `dificuldade` | sim | `"facil"`, `"media"` ou `"dificil"` (minúsculo, sem acento) |
| `afirmacao` | sim | a afirmação a julgar, uma só ideia, acentuada |
| `gabarito` | sim | `"C"` ou `"E"` |
| `explicacao` | sim | por que está certo ou errado; trechos-chave entre `[colchetes]` aparecem em destaque. Num item E, diga o que tornaria a afirmação certa |
| `origem` | sim | `"oficial"`, `"adaptada"`, `"gerada"` ou `"autoral"` |
| `prova` | condicional | obrigatória quando `origem` é `oficial` ou `adaptada`; chave existente em `provas` (ou já no banco) |
| `numero` | opcional | número do item na prova de origem |
| `topico` | recomendado | número do tópico do conteúdo programático do edital, dentro da disciplina do item (ex.: `"2.3"`). O perfil traz o conteúdo (`docs/perfis/*.json`); tópico inexistente bloqueia, item sem tópico gera aviso |
| `disciplina` | opcional | só quando o item é de outra disciplina do **mesmo grupo** do comando |
| `gabarito_conferir` | opcional | `true` quando o gabarito é duvidoso; o feedback mostra "gabarito a conferir". Omitir nos demais |
| `geradaDe` | opcional | ids dos itens errados que motivaram este reforço (`origem: "gerada"`) |
| `codigo` + `linguagem`, `imagens` | opcional | como no comando |

## Validação

Bloqueiam a importação:
- `gabarito` diferente de `C` ou `E`;
- item sem `afirmacao` ou `explicacao`; comando sem `texto` ou sem itens;
- `origem` inválida, `oficial`/`adaptada` sem `prova`, `prova` inexistente, `ano` não inteiro;
- ids de item ou de comando duplicados ou fora da sequência;
- `grupo`/`disciplina` que não existem no perfil (no comando ou no item);
- `topico` que não existe no conteúdo programático da disciplina.

Importam com aviso:
- proporção de C fora de 40–60% no lote;
- muitas afirmações com palavra absoluta ("sempre", "nunca", "somente", "exclusivamente",
  "apenas", "qualquer") com o mesmo gabarito (vira pista);
- comando com um único item.

Todo texto é exibido como texto puro: HTML ou Markdown aparecem literalmente na tela.

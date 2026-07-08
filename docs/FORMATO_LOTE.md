# Formato do lote de questões (para gerar com IA)

Este é o formato que o app espera na importação (📥 Importar). Um exemplo válido e completo
está em [frontend/src/data/questoes.json](../frontend/src/data/questoes.json) (é o mesmo do botão
"importar exemplo").

## Estrutura do arquivo

```jsonc
{
  "meta": { "banca": "FGV", "concurso": "Dataprev 2026", "versao": "v1" },
  "textos_base": {
    "TB_ENG_1": "texto longo em inglês, usado por 1+ questões de leitura..."
  },
  "questoes": [ /* array de questões (ver abaixo) */ ]
}
```

## Campos de cada questão

| Campo | Obrigatório | Regras |
|---|---|---|
| `id` | ✅ | inteiro **único** no lote. No 1º lote (v1) use 1, 2, 3, … |
| `modulo` | ✅ | exatamente `"I"` (gerais) ou `"II"` (específicos) |
| `materia` | ✅ | **exatamente** um dos valores da lista abaixo (com acento) |
| `assunto` | ✅ | texto livre e consistente (ex.: `"Crase"`, `"SQL"`) — agrupa as estatísticas |
| `dificuldade` | ✅ | exatamente `"facil"`, `"media"` ou `"dificil"` (minúsculo, **sem acento** — é um código) |
| `enunciado` | ✅ | português **acentuado** (UTF-8). Não coloque código aqui |
| `codigo` | opcional | bloco de código com quebras de linha reais (`\n` no JSON). Vai renderizado como bloco monoespaçado |
| `linguagem` | opcional | rótulo do código: `"java"`, `"sql"`, `"python"`, etc. |
| `texto_base` | opcional | chave de `textos_base` (só para leitura em inglês) |
| `alternativas` | ✅ | objeto `{ "A": "...", "B": "...", "C": "...", "D": "...", "E": "..." }` (5 opções) |
| `gabarito` | ✅ | a letra correta: `"A"`–`"E"` (deve existir em `alternativas`) |
| `explicacao` | ✅ | por que a correta está certa (e, se útil, por que as outras erram) — acentuado |

### Valores exatos de `materia`

**Módulo I (gerais) — os nomes precisam ser EXATAMENTE estes (o simulado depende disso):**
- `"Língua Portuguesa"`
- `"Língua Inglesa"`
- `"Raciocínio Lógico-Matemático"`
- `"Atualidades e IA"`
- `"Legislação (SI e Proteção de Dados)"`

**Módulo II (específicos) — use estes nomes de forma consistente:**
- `"Desenvolvimento de Software"`
- `"Banco de Dados / BI / Big Data"`
- `"Segurança da Informação"`
- `"Governança de TI"`

## Proporção de um lote completo (70 questões = 1 prova)

- **Módulo I = 40:** Língua Portuguesa 12 · Língua Inglesa 12 · Raciocínio Lógico-Matemático 5 ·
  Atualidades e IA 6 · Legislação (SI e Proteção de Dados) 5.
- **Módulo II = 30:** distribua entre as matérias específicas (ex.: Desenvolvimento de Software ~15,
  Banco de Dados / BI / Big Data ~5, Segurança da Informação ~5, Governança de TI ~5).

## Regras que o validador checa (evite reprovar a importação)
- Todo `gabarito` existe em `alternativas`.
- `modulo`/`dificuldade` com os valores exatos acima.
- `texto_base` referenciado precisa existir em `textos_base`.
- `id` único no lote.
- ⚠️ Ele **avisa** (não bloqueia) quando um enunciado parece **sem acentuação**.

---

## Prompt pronto para pedir à IA (lote v1)

> Gere um arquivo **JSON** (e nada além do JSON) de um lote de **70 questões** de concurso no
> formato abaixo, para a prova da **Dataprev 2026 (banca FGV)**.
>
> **Formato raiz:** `{ "meta": {...}, "textos_base": {...}, "questoes": [...] }`.
>
> **Cada questão tem os campos:** `id` (inteiro, comece em 1 e vá até 70, sem repetir),
> `modulo` ("I" ou "II"), `materia` (use EXATAMENTE um dos nomes da lista), `assunto` (texto
> curto e consistente), `dificuldade` ("facil" | "media" | "dificil", minúsculo e sem acento),
> `enunciado`, `alternativas` (objeto com A, B, C, D, E), `gabarito` (a letra correta),
> `explicacao`. Opcionais: `codigo` (bloco de código com quebras de linha reais) + `linguagem`,
> e `texto_base` (chave para leitura em inglês).
>
> **Matérias do Módulo I (nomes exatos):** "Língua Portuguesa", "Língua Inglesa",
> "Raciocínio Lógico-Matemático", "Atualidades e IA", "Legislação (SI e Proteção de Dados)".
> **Matérias do Módulo II (nomes exatos):** "Desenvolvimento de Software",
> "Banco de Dados / BI / Big Data", "Segurança da Informação", "Governança de TI".
>
> **Proporção obrigatória (total 70):** Módulo I = 40 (Língua Portuguesa 12, Língua Inglesa 12,
> Raciocínio Lógico-Matemático 5, Atualidades e IA 6, Legislação (SI e Proteção de Dados) 5) e
> Módulo II = 30 (Desenvolvimento de Software 15, Banco de Dados / BI / Big Data 5,
> Segurança da Informação 5, Governança de TI 5).
>
> **Regras de conteúdo:**
> - Escreva TODO o português com **acentuação correta** (UTF-8). Nunca remova acentos.
> - As questões de "Língua Inglesa" devem estar em inglês; quando forem de interpretação,
>   crie o texto em `textos_base` (ex.: chave "TB_ENG_1") e referencie via `texto_base`.
> - Quando a questão envolver código (SQL, Java, Python…), coloque o código no campo `codigo`
>   com quebras de linha reais e informe `linguagem`. **Não** coloque código dentro do enunciado.
> - Cada questão tem 5 alternativas (A–E) e exatamente um gabarito.
> - `explicacao` deve justificar a resposta correta.
> - O `gabarito` precisa corresponder a uma alternativa existente.
>
> Responda apenas com o JSON, válido e pronto para importar.

Depois de gerar, salve como `dataprev_v1.json` e importe em **📥 Importar**. O app valida antes de
gravar; se algo estiver fora do padrão, ele aponta o erro exato.

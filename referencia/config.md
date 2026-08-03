# `ThenaConfig`

Passado ao `bootstrapWorkflow`. Tudo é opcional.

```ts
// src/config.ts
import type { ThenaConfig } from "@thenajs/core";

export const config: ThenaConfig = {
  log: true,
  report: true,
  toolErrors: "throw",
  memory: [MeuQdrant],
};
```

| Campo | Tipo | Padrão | O que faz |
| --- | --- | --- | --- |
| `log` | `boolean \| "verbose" \| fn` | desligado | árvore da execução ao vivo |
| `report` | `boolean \| ReportOptions` | desligado | HTML + JSON ao final |
| `toolErrors` | `"throw" \| "observe"` | `"throw"` | o que fazer quando uma tool lança |
| `memory` | `VectorStoreCtor[]` | — | bancos vetoriais, injetados nos agentes |

## `log`

```ts
log: true          // árvore indentada, com duração
log: "verbose"     // inclui o conteúdo de cada passo
log: (evento) => logger.info(evento)   // sink próprio
```

## `report`

```ts
report: true
report: { dir: "report", format: "html" }   // "html" | "json" | "both"
```

Sem `report` nem `log`, nada é capturado — a instrumentação é no-op.

## `toolErrors`

- `"throw"` (padrão) — o erro sobe, passa pelo `onError` e pode derrubar a execução.
- `"observe"` — vira observação `isError: true` de volta ao modelo, e o nó fica
  marcado como erro no report.

## `memory`

Classes de store, instanciadas **uma vez** e compartilhadas por todos os agentes —
uma conexão e uma criação de collection, independente de quantos agentes existem.

```ts
memory: [MeuQdrant]
memory: [QdrantNomic, QdrantOpenAI]   // vários, quando forem incompatíveis
```

Cada agente recebe uma `VectorMemory` por store, na ordem do array.

::: warning A ordem é contrato
Reordenar o array troca qual store cada agente usa, e o TypeScript não acusa —
todos os parâmetros têm o mesmo tipo. Acrescente no fim, nunca no meio. Se as
dimensões forem incompatíveis, o erro aparece na primeira escrita; se forem
iguais, você grava na collection errada em silêncio.
:::

Vários stores fazem sentido quando são incompatíveis entre si — tipicamente
modelos de embedding de dimensões diferentes, que não cabem na mesma collection.

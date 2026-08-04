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

## O que o `bootstrapWorkflow` devolve

Um `app` com três métodos.

```ts
const app = await bootstrapWorkflow(MeuWorkflow, config);
```

### `app.run(options)`

Executa o workflow. Devolve a saída do último passo.

```ts
await app.run({
  input: { message: "Olá" },
  memory: { userId: "123" },   // contexto inicial
  budget: { maxSeconds: 60 },  // teto da execução
});
```

Pode ser chamado mais de uma vez no mesmo `app` — cada chamada é uma execução
independente, com um estado novo.

### `app.use(plugin)`

Acopla um observador do stream de execução. Chame **antes** do `run`.

```ts
await app.use(thenaFlow());
```

Vários plugins convivem, e nenhum toma o lugar do `log` do config — todos
recebem os mesmos eventos. Se o `setup` do plugin lançar, o `use()` rejeita:
falha de configuração aparece antes da execução, não no meio dela.

A interface é pequena de propósito, para você escrever a sua — está em
[Ver a execução ao vivo](/guias/flow#o-mesmo-stream-para-onde-voce-quiser).

### `app.dispose()`

Encerra os plugins e solta a instrumentação.

```ts
await app.run({ input: { message: "Olá" } });
await app.dispose();
```

Sem plugins, não é obrigatório — o processo termina sozinho. Com o
[Flow](/guias/flow), é o que fecha o servidor: sem isso o site fica no ar de
propósito, para dar tempo de olhar o resultado.

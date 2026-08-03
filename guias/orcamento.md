# Limitar tempo e custo

`maxIterations` limita um laço. O `budget` limita a **execução inteira** — tempo de
parede, chamadas ao modelo, tokens e custo.

```ts
await app.run({
  input: { message: "faça o deploy" },
  budget: {
    maxDurationMs: 5 * 60_000,
    maxChatCalls: 30,
    maxToolCalls: 40,
    maxTokens: 200_000,
    maxCostUsd: 1.5,
    mode: "stop",
    onExceeded: (i) => console.warn(`[app] orçamento estourado: ${i.reason}`),
  },
});
```

Sem `budget`, nada é medido nem checado.

## Parar ou lançar

- **`"stop"`** (padrão) encerra graciosamente: os passos seguintes são pulados e a
  execução devolve o resultado que já tinha.
- **`"throw"`** lança `BudgetExceededError`.

`"stop"` costuma ser o certo em produção: você fica com o trabalho parcial em vez
de perder tudo.

## Onde é conferido

Entre unidades de trabalho — um turno é uma chamada ao modelo mais, no máximo, uma
ferramenta. Ou seja, o consumo pode passar um pouco do teto **dentro** do turno em
que ele é atingido. Não é um freio instantâneo, é um teto entre passos.

## Custo precisa de preço

`maxTokens` funciona sozinho, porque tokens vêm do provider. `maxCostUsd` exige
informar quanto custa:

```ts
super({ apiKey, model, costPer1kTokens: { input: 0.00015, output: 0.0006 } });
```

## Escrever política própria

O consumo acumulado fica em `ctx.budget`, e é a partir dele que você escreve
heurísticas que o framework não impõe:

```ts
export class MeuAgente {
  beforeTool(call: ToolCall, ctx: AgentContext) {
    if ((ctx.budget?.toolCalls ?? 0) > 20 && call.name === "busca_cara") {
      throw new Error("Orçamento apertado — evitando busca cara.");
    }
  }
}
```

Campos disponíveis: `chatCalls`, `toolCalls`, `tokens`, `costUsd`, `elapsedMs`.

::: tip Retry não infla a contagem
As tentativas de uma mesma chamada contam como **uma** chamada lógica em
`maxChatCalls`. Mas as esperas do backoff contam no `maxDurationMs`.
:::

## Sub-workflows têm contador próprio

Um `budget` no pai não soma o consumo de um [sub-agente isolado](/guias/sub-agente).
Se o filho é caro, passe um `budget` no `runtime.run` dele também.

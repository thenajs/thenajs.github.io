# Contexto (`ctx`)

O objeto que atravessa todos os passos de uma execução.

```ts
type AgentContext = {
  state: StateManager;        // a conversa com o modelo
  output?: unknown;           // saída do último passo
  turn?: TurnInfo;            // resumo do último turno
  loop?: LoopInfo;            // do laço mais recente
  budget?: BudgetUsage;       // quando há orçamento
  logs: string[];
} & Record<string, unknown>;  // seus campos
```

Guia conceitual: [Estado e contexto](/como-funciona/estado).

## `ctx.state`

O que o modelo vê.

```ts
ctx.state.history      // Message[] — a conversa
ctx.state.memory       // string[]  — vira mensagem `system`
ctx.state.tasks        // string[]  — nota dentro do `system`

ctx.state.append("memory", "texto");
ctx.state.set("history", ctx.state.history.slice(0, -1));
ctx.state.get("history");
ctx.state.toMessages();   // a projeção enviada ao modelo
```

```ts
type Message = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  toolCalls?: ProviderToolCall[];
  toolName?: string;
  toolCallId?: string;
  isError?: boolean;
};
```

## `ctx.turn`

```ts
type TurnInfo = {
  calledTool: boolean;
  toolName?: string;
  toolError?: boolean;
  toolCallSource?: "native" | "rescued";
  response: string;
};
```

`toolCallSource` diz se o modelo usou o formato estruturado (`native`) ou se a
chamada foi recuperada do texto (`rescued`). Contar `rescued` é um bom termômetro
de fragilidade do modelo na sua tarefa.

## `ctx.loop`

```ts
type LoopInfo = { iterations: number; exhausted: boolean; maxIterations?: number };
```

::: warning Em laços aninhados, o último a terminar vence
`ctx.loop` é sobrescrito. Para o dado aninhado corretamente, leia a árvore do
[report](/guias/report).
:::

## `ctx.budget`

```ts
type BudgetUsage = {
  chatCalls: number; toolCalls: number;
  tokens: number; costUsd: number; elapsedMs: number;
};
```

Presente quando há `budget` no `run`.

## Seus campos

O índice livre aceita qualquer chave, tipada como `unknown`:

```ts
ctx.aprovado = true;
const ok = ctx.aprovado === true;
```

Para fluxos maiores vale um acessor tipado — veja
[Estado e contexto](/como-funciona/estado#um-estado-tipado-para-o-seu-workflow).

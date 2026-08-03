# Hooks

Métodos opcionais na classe do agente. O runtime chama só o que existir.

```ts
beforePrompt(prompt: string, ctx: AgentContext): string | void
beforeTool(call: ToolCall, ctx: AgentContext): ToolCall | void
afterTool(result: ToolResult, ctx: AgentContext): string | ToolOutput | void
afterResponse(response: string, ctx: AgentContext): string | void
onError(error: Error, ctx: AgentContext): string | void

// todos aceitam Promise<…> também
```

**Contrato:** retornar um valor **substitui**; retornar `undefined` **mantém** o
original.

## Payloads

```ts
type ToolCall   = { name: string; args: unknown };
type ToolResult = { name: string; args: unknown; output: string; isError?: boolean };
type ToolOutput = { content: string; isError?: boolean; data?: unknown };
```

::: warning Dois tipos parecidos
O `ToolCall` dos hooks usa `args`. O que circula em `ctx.turn` e no report é o
`ProviderToolCall` (`{ id, name, arguments, source }`), com `arguments` — é o que
o provider produziu, não o que você intercepta. São tipos distintos de propósito.
:::

## Comportamentos específicos

**`beforeTool`** — um `throw` cancela aquela ferramenta e propaga. Isso vale mesmo
com `toolErrors: "observe"`, que só afeta erros do `execute`.

**`afterTool`** — devolver uma `string` troca só o texto e **preserva** o `isError`.
Para mudar a marca de erro, devolva um `ToolOutput` completo.

**`onError`** — se devolver algo, vira a saída do agente e a execução continua. Sem
retorno, o erro sobe.

## Ordem

```
beforePrompt → chat [ beforeTool → execute → afterTool ] → afterResponse
                                    (qualquer throw) → onError
```

## Escape hatch

Se a classe define `run(input, ctx)`, ela assume o turno e **nenhum hook automático
é chamado**.

# `@Workflow`

Declara a ordem dos passos. Todos compartilham o mesmo estado.

```ts
@Workflow({
  steps: [
    PlannerAgent,
    parallel([ExplorerAgent, RevisorAgent]),
    loop({ steps: [ExecutorAgent], until: untilAnswered, maxIterations: 8 }),
  ],
})
export class MeuWorkflow {}
```

## `state`

```ts
@Workflow({ state: RevisaoState, steps: [ /* … */ ] })
```

Classe instanciada **uma vez por execução**. Os valores iniciais são as próprias
inicializações de campo:

```ts
export class RevisaoState {
  aprovado = false;
  rodadas = 0;
}
```

A mesma instância é entregue a quem pedir com [`@state()`](/referencia/injecao) e
ao `until` dos loops, como segundo parâmetro.

## Tipos de passo

```ts
type WorkflowStep = AgentClass | ParallelStep | LoopStep;
```

### `parallel(steps)`

```ts
parallel([AgenteA, AgenteB])
```

Roda os passos concorrentes sobre o mesmo contexto.

::: warning Todos escrevem em `ctx.output`
A última escrita vence, e a ordem é uma corrida. Leia os resultados em
`ctx.state.history`, ou faça cada agente gravar num campo próprio do `ctx`.
`ctx.turn` sofre do mesmo problema — não use `untilAnswered` num loop que contém
`parallel`.
:::

### `loop(options)`

```ts
loop({
  steps: WorkflowStep[],
  until: (ctx, state?) => unknown,  // true = PARAR; state vem do @Workflow
  maxIterations?: number,
  onExhausted?: (ctx, iterations) => unknown,
})
```

O corpo roda **pelo menos uma vez** — `until` é avaliado depois. Quando o laço para
por `maxIterations` em vez do `until`, `onExhausted` é chamado e `ctx.loop.exhausted`
fica `true`.

Guia com padrões prontos: [Decidir quando o loop para](/guias/parada).

## Executar

```ts
const app = await bootstrapWorkflow(MeuWorkflow, config);
await app.run({ input, memory?, budget? });
```

| Campo | O que faz |
| --- | --- |
| `input.message` | a entrada inicial; sem ele, o objeto é serializado |
| `memory` | semeado em `state.memory` — vira mensagem `system` |
| `budget` | teto da execução — veja [Orçamento](/guias/orcamento) |

Para pegar o retorno em vez de imprimir:

```ts
const resultado = await runWorkflow(MeuWorkflow, "entrada");
```

## Helpers de parada

| Helper | O que faz |
| --- | --- |
| `untilAnswered(ctx)` | `true` quando o turno **não** chamou ferramenta |
| `calledTool(ctx)` | `true` se o último turno executou ferramenta |
| `turnOf(ctx)` | o `TurnInfo` do último turno, ou `undefined` |
| `wasExhausted(ctx)` | `true` se o laço mais recente parou pelo teto |

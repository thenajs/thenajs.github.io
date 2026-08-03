# Estado e contexto

Toda execução carrega um objeto `ctx` que atravessa todos os passos. Ele tem duas
partes que é fácil confundir — e essa confusão é a origem da maior parte das
dúvidas.

```
ctx                    ← o contexto da execução: campos seus e do runtime
 └─ ctx.state          ← a conversa com o modelo: o que ele efetivamente vê
```

**Regra prática:** se o modelo precisa ler, vai em `ctx.state`. Se é dado seu, para
o seu código decidir alguma coisa, vai em `ctx` direto.

## `ctx.state` — o que o modelo vê

Três compartimentos, cada um vira uma parte do prompt:

| Bucket | O que guarda | Como chega no modelo |
| --- | --- | --- |
| `history` | a conversa: turnos `user`, `assistant`, `tool` | as mensagens, em ordem |
| `memory` | contexto durável (`string[]`) | uma mensagem `system` no topo |
| `tasks` | itens sendo acompanhados (`string[]`) | uma nota dentro do `system` |

```ts
ctx.state.history          // Message[]
ctx.state.memory           // string[]
ctx.state.append("memory", "O usuário se chama Castro");
ctx.state.set("history", ctx.state.history.slice(0, -1));   // remove o último turno
```

O `memory` inicial é semeado no `run`:

```ts
await app.run({
  input: { message: "Olá" },
  memory: { userId: "123", plano: "pro" },   // vira contexto durável
});
```

## `ctx` — os seus dados avulsos

O contexto aceita qualquer campo, tipado como `unknown`:

```ts
ctx.tentativas = (ctx.tentativas as number ?? 0) + 1;
```

Serve para uma marcação pontual. Para o que os passos realmente trocam entre si,
prefira [o estado do workflow](#o-estado-do-workflow), que é tipado e não exige
cast.

O runtime também escreve alguns campos ali:

| Campo | O que é |
| --- | --- |
| `ctx.turn` | resumo do último turno: `calledTool`, `toolName`, `response` |
| `ctx.output` | a saída do último passo |
| `ctx.loop` | `{ iterations, exhausted }` do laço mais recente |
| `ctx.budget` | consumo acumulado, quando há orçamento |

## O estado do workflow

Para o que os passos trocam entre si, declare uma classe. Os valores iniciais são
as próprias inicializações de campo — sem schema, sem factory, sem cast:

```ts
// src/workflows/revisao.state.ts
export class RevisaoState {
  aprovado = false;
  rodadas = 0;
  problemas: string[] = [];
}
```

O workflow declara, e o framework instancia **uma por execução**:

```ts
@Workflow({
  state: RevisaoState,
  steps: [ /* … */ ],
})
export class RevisaoWorkflow {}
```

Quem precisa dele pede com `@state()`:

```ts
@Agent({ provider: MeuProvider, prompt: "./revisor.agent.md" })
export class RevisorAgent {
  constructor(@state() private readonly s: RevisaoState) {}

  async afterResponse(resposta: string) {
    this.s.rodadas++;
    this.s.aprovado = /\bAPROVADO\b/.test(resposta);
  }
}
```

E o `until` recebe como segundo parâmetro:

```ts
loop({
  steps: [RevisorAgent],
  until: (ctx, s: RevisaoState) => s.aprovado,
  maxIterations: 5,
})
```

Todos veem **o mesmo objeto** — agentes, hooks, tools e o `until`. Nada de
`as unknown as`, nada de campo solto no `ctx`.

::: tip Tools também
Uma tool pode pedir o estado: `async execute(@input() args, @state() s)`. É o
único jeito de uma tool alcançar algo do fluxo — veja [Tools](/guias/tools).
:::

## A saída de um passo vira fala do próximo

Consequência do estado compartilhado que vale conhecer antes de ser mordido por ela.

Quando um agente responde, o turno dele é anexado ao `history` como
`role: "assistant"`. O próximo agente lê o mesmo `history` — então recebe aquilo
**como se ele próprio já tivesse respondido**.

Na maior parte dos fluxos é o que você quer: uma conversa contínua. Mas se a saída
é *contexto* (um plano, um resumo, uma pesquisa) e não *fala*, promova-a:

```ts
export class PlannerAgent {
  afterResponse(plano: string, ctx: AgentContext) {
    ctx.state.set("history", ctx.state.history.slice(0, -1)); // tira do transcript
    ctx.state.append("memory", `Plano a seguir:\n${plano}`);  // vira system no topo
    ctx.plan = plano;
  }
}
```

A alternativa, quando o passo precisa de histórico próprio e não só de uma saída
limpa, é isolá-lo — veja [Sub-agente isolado](/guias/sub-agente).

## O que uma ferramenta enxerga

Por padrão, o `execute` recebe **só os argumentos validados** — a tool é uma
função pura do ponto de vista do fluxo, e isso a mantém trivial de testar:

```ts
async execute({ caminho }: { caminho: string }) {
  return readFile(caminho, "utf8");
}
```

Quando ela precisa de mais, os parâmetros dizem o que querem:

```ts
async execute(
  @input() { caminho }: { caminho: string },
  @context() ctx: AgentContext,
  @state() s: RevisaoState,
) {
  s.arquivosLidos.push(caminho);
  return readFile(caminho, "utf8");
}
```

Use com parcimônia: uma tool que lê o contexto deixa de ser testável isoladamente.
O caso que mais justifica é repassar informação a um
[sub-workflow](/guias/sub-agente), que roda isolado e começa sem saber o que foi
pedido.

## Próximo

- [Decidir quando o loop para](/guias/parada) — usando o estado numa condição
- [Interceptar o fluxo](/guias/hooks) — onde escrever no `ctx`

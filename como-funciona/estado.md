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

## `ctx` — os seus dados

O contexto aceita qualquer campo. É onde você guarda o que **seu código** precisa
saber, sem poluir o que o modelo lê:

```ts
ctx.aprovado = true;
ctx.tentativas = (ctx.tentativas as number ?? 0) + 1;
```

O runtime também escreve alguns campos ali:

| Campo | O que é |
| --- | --- |
| `ctx.turn` | resumo do último turno: `calledTool`, `toolName`, `response` |
| `ctx.output` | a saída do último passo |
| `ctx.loop` | `{ iterations, exhausted }` do laço mais recente |
| `ctx.budget` | consumo acumulado, quando há orçamento |

## Um estado tipado para o seu workflow

O `ctx` é permissivo por padrão (`Record<string, unknown>`), o que é flexível mas
custa autocomplete e deixa typo passar. Para fluxos maiores, vale declarar o
formato num arquivo só — o equivalente a um "arquivo de estado":

```ts
// src/workflows/revisao.state.ts
import type { AgentContext } from "@thenajs/core";

/** O que os passos deste workflow trocam entre si. */
export interface RevisaoState {
  arquivosLidos: string[];
  problemas: { arquivo: string; descricao: string }[];
  aprovado: boolean;
}

/** Lê o ctx com o formato acima, com defaults. */
export function estado(ctx: AgentContext): RevisaoState {
  ctx.arquivosLidos ??= [];
  ctx.problemas ??= [];
  ctx.aprovado ??= false;
  return ctx as unknown as RevisaoState;
}
```

Aí os passos usam o helper em vez de tocar no `ctx` cru:

```ts
import { estado } from "../workflows/revisao.state.js";

export class RevisorAgent {
  async afterResponse(resposta: string, ctx: AgentContext) {
    const s = estado(ctx);              // ← tipado daqui em diante
    s.aprovado = resposta.includes("APROVADO");
    s.problemas.push({ arquivo: "src/main.ts", descricao: resposta });
  }
}
```

E o `until` do loop fica legível:

```ts
loop({
  steps: [RevisorAgent],
  until: (ctx) => estado(ctx).aprovado,
  maxIterations: 5,
})
```

::: tip Por que um helper, e não um tipo genérico
Um genérico teria que atravessar `AgentContext`, `AgentHooks`, `until` e todo hook
— viral, e obriga a repetir o tipo em cada assinatura. Uma função de acesso resolve
com uma linha por uso, sem contaminar a API do framework.
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

## Ferramentas não veem o `ctx`

O `execute` de uma tool recebe **só os argumentos validados**. Isso é proposital:
a tool é uma função pura do ponto de vista do fluxo, e o que ela precisa saber deve
estar nos argumentos — que o modelo preenche, ou que você rederiva dentro dela.

```ts
async execute({ caminho }: { caminho: string }) {
  // sem ctx, sem history, sem memory
  return readFile(caminho, "utf8");
}
```

Se uma tool precisa mesmo de contexto do fluxo, os caminhos são: colocar nos
argumentos, rederivar dentro dela, ou usar
[um sub-workflow](/guias/sub-agente) e passar contexto explícito.

## Próximo

- [Decidir quando o loop para](/guias/parada) — usando o estado numa condição
- [Interceptar o fluxo](/guias/hooks) — onde escrever no `ctx`

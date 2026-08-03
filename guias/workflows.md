# Orquestrar vários agentes

Um workflow encadeia passos que compartilham o mesmo estado. Cada passo é uma de
três coisas:

```ts
import { Workflow, parallel, loop, untilAnswered } from "@thenajs/core";

@Workflow({
  steps: [
    PlannerAgent,                                    // 1. um agente, em sequência
    parallel([ExplorerAgent, RevisorAgent]),         // 2. concorrentes
    loop({ steps: [ExecutorAgent],                   // 3. repetição
           until: untilAnswered, maxIterations: 8 }),
  ],
})
export class MeuWorkflow {}
```

Eles se combinam e aninham à vontade — um `loop` pode conter um `parallel`, que
pode conter outro `loop`.

## Sequência

A forma mais simples: cada agente roda depois do anterior e enxerga o que ele
disse, porque o histórico é compartilhado.

```ts
@Workflow({ steps: [PesquisadorAgent, EscritorAgent] })
export class ArtigoWorkflow {}
```

::: tip A saída de um passo vira fala do próximo
O turno de um agente entra no histórico como `assistant`. O próximo agente recebe
aquilo como se **ele** já tivesse falado — o que é ótimo para uma conversa
contínua, e ruim quando a saída deveria ser só contexto. Veja como promover para
contexto em [Estado e contexto](/como-funciona/estado#a-saida-de-um-passo-vira-fala-do-proximo).
:::

## Paralelo

Para agentes independentes que olham a mesma entrada:

```ts
parallel([AnalistaDeSegurancaAgent, AnalistaDePerformanceAgent])
```

Todos recebem o mesmo estado e rodam ao mesmo tempo. Como todos escrevem em
`ctx.output`, a última escrita vence — leia os resultados em `ctx.state.history`,
ou faça cada agente gravar num campo próprio do `ctx`.

## Laço

Onde o agente trabalha em várias voltas — investigar, agir, olhar, repetir:

```ts
loop({
  steps: [ExecutorAgent],
  until: untilAnswered,
  maxIterations: 8,
  onExhausted: (ctx, n) => console.warn(`parou no teto após ${n} voltas`),
})
```

Escrever a condição de parada tem página própria:
[Decidir quando o loop para](/guias/parada).

## Rodar

```ts
// src/main.ts
import { bootstrapWorkflow } from "@thenajs/core";
import { MeuWorkflow } from "./workflows/meu.workflow.js";
import { config } from "./config.js";

const app = await bootstrapWorkflow(MeuWorkflow, config);

await app.run({
  input: { message: "Revise o diretório src/" },
  memory: { userId: "123" },     // contexto durável, vira `system`
});
```

Para pegar o resultado no código em vez de imprimir:

```ts
import { runWorkflow } from "@thenajs/core";

const parecer = await runWorkflow(MeuWorkflow, "Revise o diretório src/");
```

## Um exemplo completo

Um revisor que lê, avalia e repete até aprovar. O estado é o que amarra tudo:

```ts
// src/workflows/revisao.state.ts
export class RevisaoState {
  aprovado = false;
  rodadas = 0;
}
```

```ts
// src/workflows/revisao.workflow.ts
@Workflow({
  state: RevisaoState,
  steps: [
    PlannerAgent,                     // decide o que olhar
    loop({
      steps: [LeitorAgent, RevisorAgent],
      until: (_ctx, s: RevisaoState) => s.aprovado,
      maxIterations: 5,
      onExhausted: (_ctx, voltas) =>
        console.warn(`não aprovou em ${voltas} rodadas`),
    }),
  ],
})
export class RevisaoWorkflow {}
```

```ts
// o revisor grava a decisão que o `until` lê
export class RevisorAgent {
  constructor(@state() private readonly s: RevisaoState) {}

  async afterResponse(resposta: string) {
    this.s.rodadas++;
    this.s.aprovado = resposta.includes("APROVADO");
  }
}
```

Sem alguém gravar `aprovado`, a condição nunca ficaria verdadeira e o loop rodaria
até o teto toda vez — é o erro mais comum ao montar o primeiro laço com critério
próprio.

## Próximo

- [Decidir quando o loop para](/guias/parada)
- [Sub-agente isolado](/guias/sub-agente) — quando o histórico compartilhado atrapalha
- [Limitar tempo e custo](/guias/orcamento)

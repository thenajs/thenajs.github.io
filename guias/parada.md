# Decidir quando o loop para

Um `loop` repete seus passos até `until(ctx)` devolver algo verdadeiro. Escrever
esse `until` é a decisão mais importante de um agente que trabalha em várias voltas
— e a que mais confunde no começo.

```ts
loop({
  steps: [MeuAgente],
  until: (ctx) => /* devolva true para PARAR */,
  maxIterations: 8,
})
```

::: warning O sentido é "parar"
`until` devolve `true` quando é hora de **encerrar**, não de continuar. É o ponto
que mais gera erro de leitura.
:::

O laço sempre roda **pelo menos uma vez** — a condição é avaliada depois do corpo.

## O caso comum: parar quando ele responder

Um agente que usa ferramentas alterna entre agir e responder. Enquanto ele chama
ferramentas, há trabalho a fazer; quando ele finalmente responde em texto, acabou.

```ts
import { loop, untilAnswered } from "@thenajs/core";

loop({ steps: [LeitorAgent], until: untilAnswered, maxIterations: 8 })
```

`untilAnswered` é exatamente isto, pronto:

```ts
const untilAnswered = (ctx) => !ctx.turn?.calledTool;
```

Serve para a maioria dos agentes de uma tarefa só. Para fluxos mais longos, vale
escrever o seu — as próximas seções mostram como.

## Parar quando algo foi decidido

Quando o critério não é "respondeu", mas "chegou a uma conclusão", declare o
[estado do workflow](/como-funciona/estado#o-estado-do-workflow): o agente grava,
o `until` lê.

```ts
// revisao.state.ts
export class RevisaoState {
  aprovado = false;
}
```

```ts
export class RevisorAgent {
  constructor(@state() private readonly s: RevisaoState) {}

  async afterResponse(resposta: string) {
    this.s.aprovado = resposta.includes("APROVADO");
  }
}
```

```ts
@Workflow({
  state: RevisaoState,
  steps: [
    loop({
      steps: [RevisorAgent],
      until: (ctx, s: RevisaoState) => s.aprovado,   // ← o estado é o 2º parâmetro
      maxIterations: 5,
    }),
  ],
})
export class RevisaoWorkflow {}
```

## Parar por qualidade da resposta

`untilAnswered` considera qualquer resposta como final — inclusive uma string
vazia, que modelos locais produzem com alguma frequência. Se isso te morde, seja
mais exigente:

```ts
import { turnOf } from "@thenajs/core";

const until = (ctx) => {
  const t = turnOf(ctx);
  return !!t && !t.calledTool && !!t.response?.trim();
};
```

## Combinar condições

O `until` é uma função comum — combine à vontade:

```ts
until: (ctx, s: RevisaoState) => s.aprovado || ctx.turn?.toolError === true
```

E pode ser assíncrono, se precisar consultar algo:

```ts
until: async (ctx) => (await jaExisteNoBanco(ctx.output)) === true
```

## O teto, e como saber que bateu nele

`maxIterations` é a rede de segurança. Quando o laço para por causa dele — e não
porque o `until` ficou verdadeiro —, isso é registrado:

```ts
loop({
  steps: [MeuAgente],
  until: untilAnswered,
  maxIterations: 10,
  onExhausted: (ctx, n) => console.warn(`[app] parou no teto, após ${n} voltas`),
})
```

Também dá para ler depois:

```ts
import { wasExhausted } from "@thenajs/core";

wasExhausted(ctx);        // true se parou pelo teto
ctx.loop?.iterations;     // quantas voltas deu
```

E o nó `loop` do [report](/guias/report) mostra `exhausted: true`. Distinguir
"convergiu" de "desistiu" muda como você lê uma execução — sem isso, as duas
parecem sucesso.

## Padrões prontos

::: code-group

```ts [ReAct simples]
// repita enquanto usar ferramentas
loop({
  steps: [Agente],
  until: untilAnswered,
  maxIterations: 8,
})
```

```ts [Até aprovar]
// um agente decide, outro revisa
loop({
  steps: [ExecutorAgent, RevisorAgent],
  until: (ctx, s: RevisaoState) => s.aprovado,
  maxIterations: 5,
})
```

```ts [Resposta não-vazia]
// não aceita string vazia como fim
loop({
  steps: [Agente],
  until: (ctx) => {
    const t = turnOf(ctx);
    return !!t && !t.calledTool && !!t.response?.trim();
  },
  maxIterations: 8,
})
```

```ts [Limite de tentativas]
// desiste depois de N erros de ferramenta
loop({
  steps: [Agente],
  until: (ctx, s: MeuState) => {
    if (ctx.turn?.toolError) s.erros++;
    return s.erros >= 3 || !ctx.turn?.calledTool;
  },
  maxIterations: 10,
})
```

:::

## Dentro de `parallel`

Vários agentes rodando ao mesmo tempo escrevem em `ctx.turn`, e o último a
terminar vence. Se o seu loop tem um `parallel` dentro, não confie em
`untilAnswered` — escreva uma condição sobre campos que **você** controla:

```ts
loop({
  steps: [parallel([AgenteA, AgenteB])],
  until: (_ctx, s: MeuState) => s.prontoA && s.prontoB,
  maxIterations: 5,
})
```

## Próximo

- [Orquestrar vários agentes](/guias/workflows) — sequência, paralelo e laço
- [Limitar tempo e custo](/guias/orcamento) — teto da execução inteira, não só do laço

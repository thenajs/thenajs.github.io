# O ciclo de uma execução

Uma execução tem três camadas encaixadas. Entender a ordem resolve a maior parte
das dúvidas de "por que isso aconteceu antes daquilo".

## A visão de cima

```
app.run()
 └─ workflow
     └─ passo 1, passo 2, passo 3…        ← a ordem que você declarou em `steps`
         └─ cada passo é um agente, um `parallel` ou um `loop`
             └─ turno do agente
                 ├─ monta as mensagens
                 ├─ chama o modelo
                 ├─ se pediu ferramenta: valida, executa, guarda o resultado
                 └─ devolve a resposta
```

O `loop` repete o bloco interno até o `until` ser verdadeiro. O `parallel` roda os
passos ao mesmo tempo, sobre o mesmo estado.

## Um turno de agente, em detalhe

É aqui que os hooks entram. A ordem exata:

```
beforePrompt(prompt, ctx)          ← altera o system prompt
        ↓
   chamada ao modelo
        ↓
   pediu ferramenta?
   ├─ sim → beforeTool(call, ctx)   ← troca args, ou `throw` cancela
   │         ↓
   │      execute(args)             ← seu código, com args já validados
   │         ↓
   │        afterTool(result, ctx)  ← transforma o resultado
   └─ não → (segue)
        ↓
afterResponse(response, ctx)        ← transforma a resposta do turno
        ↓
   grava ctx.turn e ctx.output

  qualquer throw acima → onError(error, ctx)
```

Todos os hooks são opcionais. Sem nenhum, o turno acontece igual — eles só existem
para quando você precisa entrar no meio.

::: tip Contrato dos hooks
Retornar um valor **substitui**. Retornar `undefined` **mantém** o original. É por
isso que um `beforePrompt` que só quer observar pode simplesmente não retornar nada.
:::

## Um turno é uma chamada, não a tarefa toda

Distinção que confunde no começo: **um turno do agente é uma volta só** — uma
chamada ao modelo e, no máximo, uma ferramenta.

Se a tarefa exige investigar antes de responder, você precisa de várias voltas. É
para isso que serve o `loop`:

```ts
loop({
  steps: [LeitorAgent],
  until: untilAnswered,
  maxIterations: 8,
})
```

Sem o `loop`, o agente chamaria uma ferramenta e o workflow terminaria ali — com o
resultado da ferramenta como saída, sem o modelo ter tido chance de interpretá-lo.

## O que sobrevive entre os passos

Todos os passos de um workflow compartilham o **mesmo estado**. Um agente adiciona
seu turno ao histórico; o próximo agente já enxerga a conversa até ali.

Isso é útil e tem uma consequência que vale saber desde já: a resposta de um passo
entra no próximo como fala do assistente. Se você quer que ela seja *contexto* em
vez de *fala*, [Estado e contexto](/como-funciona/estado) mostra como.

## Onde ver isso acontecendo

Ligue o log no config e a árvore aparece ao vivo:

```ts
export const config: ThenaConfig = { log: true };
```

```
[thena] ▸ workflow LeitorWorkflow
[thena]   ▸ loop
[thena]     ▸ agent LeitorAgent
[thena]       ▸ chat
[thena]         ▸ tool ler_arquivo
[thena]         ◂ tool ler_arquivo  12ms ✓
[thena]       ◂ chat  1.84s ✓
[thena]     ◂ agent LeitorAgent  1.85s ✓
```

Com `report: true` você ganha o mesmo em HTML, com o conteúdo de cada passo —
veja [Report](/guias/report).

## Próximo

[Estado e contexto](/como-funciona/estado) — o que é `ctx`, o que é `state`, e como
mexer nos dois.

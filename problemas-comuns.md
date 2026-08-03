# Problemas comuns

Sintomas reais e o que costuma causá-los. Se o seu não estiver aqui, o
[report](/guias/report) quase sempre mostra onde a execução saiu do trilho.

## O agente responde em texto em vez de usar a ferramenta

Sintoma: você pediu algo que exige a ferramenta, e ele descreveu o que faria.

**Causa mais comum: a `description` não diz quando usar.** É prompt, e o modelo lê
literalmente.

```ts
description: "Operações de arquivo."                    // vago
description: "Lê um arquivo do projeto. Use antes de responder sobre código."
```

**Segunda causa: o prompt não instrui a agir.** Diga explicitamente no markdown:
*"Antes de responder, leia os arquivos relevantes."*

**Terceira: o modelo é pequeno demais para a tarefa.** Abra o report e olhe o campo
`toolCallSource` nos nós `chat`. Se aparecer `rescued`, ele está emitindo a chamada
como texto e o framework recuperando — funciona, mas é sinal de que está no limite.

## O loop encerra na primeira volta

Sintoma: o agente chama uma ferramenta e a execução termina, sem ele interpretar o
resultado.

Quase sempre é `untilAnswered` com um modelo que devolveu **resposta vazia** — ela
conta como "respondeu". Seja mais exigente:

```ts
import { turnOf } from "@thenajs/core";

until: (ctx) => {
  const t = turnOf(ctx);
  return !!t && !t.calledTool && !!t.response?.trim();
}
```

O outro caso é o modelo ter escrito a chamada em prosa (sem JSON nenhum), que o
resgate não recupera porque não há chamada ali — veja o item anterior.

## O loop nunca termina

Sintoma: bate no `maxIterations` toda vez.

Confirme que é isso, em vez de supor:

```ts
loop({
  steps: [Agente],
  until: minhaCondicao,
  maxIterations: 8,
  onExhausted: (ctx, n) => console.warn(`parou no teto após ${n}`),
})
```

Se dispara, o `until` nunca ficou verdadeiro. Os motivos usuais: o campo lido pelo
`until` nunca é gravado (typo, ou o hook que grava não roda), ou a condição está
invertida — lembre que **`true` significa parar**.

## O segundo agente responde vazio

Sintoma: `steps: [PlannerAgent, ExecutorAgent]`, e o executor devolve nada ou
encerra de imediato.

A saída do primeiro entrou no histórico como fala do **assistente**. O segundo lê
o mesmo histórico e conclui que já respondeu.

Se a saída do primeiro é *contexto* e não *fala*, promova:

```ts
export class PlannerAgent {
  afterResponse(plano: string, ctx: AgentContext) {
    ctx.state.set("history", ctx.state.history.slice(0, -1));
    ctx.state.append("memory", `Plano a seguir:\n${plano}`);
  }
}
```

Detalhes em [Estado e contexto](/como-funciona/estado#a-saida-de-um-passo-vira-fala-do-proximo).

## `recall` volta vazio

Ordem de verificação:

1. **Você gravou no mesmo dataset em que está buscando?** `remember` sem `dataset`
   grava em `"default"`; `recall` com `{ dataset: "persistent" }` não acha.
   Para buscar em todos: `{ dataset: null }`.
2. **O `scoreThreshold` está alto?** Comece sem ele e olhe os scores reais.
3. **A collection existe?** Ela é criada na primeira gravação, não na leitura.

## Erro de dimensão no banco vetorial

```
Este store já foi preparado com 768 dimensões, mas agora recebeu embeddings de 1536.
```

Dois agentes com modelos de embedding diferentes apontando para o mesmo store. Uma
collection guarda um tamanho só — cada modelo precisa do seu:

```ts
memory: [QdrantNomic, QdrantOpenAI]
```

E o agente de 1536 pega o segundo parâmetro do construtor. Veja
[ThenaConfig](/referencia/config#memory).

## A execução morre com `fetch failed`

Se demorou uns 300 segundos antes de falhar, foi o limite do runtime — a requisição
ficou pendurada e o retry nunca disparou, porque nada rejeitou.

Ligue o timeout por tentativa:

```ts
super({ host, model, retry: { maxAttempts: 3, timeoutMs: 120_000 } });
```

Escolha um valor acima do que seu modelo leva no pior caso: um teto curto demais
aborta trabalho legítimo.

## Erro de ferramenta derruba tudo

Por padrão é assim. Se você prefere que o modelo veja o erro e tente outra coisa:

```ts
export const config: ThenaConfig = { toolErrors: "observe" };
```

Ou trate dentro da própria tool, devolvendo `{ content, isError: true }` — que é
mais preciso, porque você controla a mensagem.

## O prompt não foi encontrado

```
[@Agent] Prompt markdown não encontrado: /caminho/…
```

O caminho relativo é resolvido a partir do **arquivo do agente**. Se você move o
`.ts` sem mover o `.md`, quebra. Em build compilado, confirme que os `.md` são
copiados para o `dist/` — o projeto do CLI já faz isso.

## Uma tool não é reconhecida

```
[thena] A classe "MinhaTool" não está decorada com @Tool().
[thena] A classe "MinhaTool" não implementa execute(input).
```

A primeira é decorator faltando; a segunda é o método com nome errado (`run` em
vez de `execute`, por exemplo).

## Resultados diferentes a cada execução

Esperado sem `sampling`. Para iterar sobre o comportamento do agente, fixe:

```ts
sampling: { temperature: 0, seed: 42 }
```

O `seed` só tem efeito junto da temperatura baixa. Sem isso, você não consegue
distinguir "minha mudança melhorou" de "deu sorte".

## Ainda travado

Abra uma issue no [GitHub](https://github.com/thenajs/ThenaJS/issues) com o
`report/report.json` da execução — ele tem a árvore completa e é o que mais ajuda
a entender o que aconteceu.

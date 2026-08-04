# O que é automático

Todo framework esconde alguma coisa. O problema não é esconder — é você não saber
**o quê**, e descobrir na hora errada.

Esta página é a lista completa. Se algo acontece sem você mandar, está aqui.

## Feito por você

| Acontece sozinho | Onde você entra |
| --- | --- |
| montar as mensagens (`system`, `user`, `assistant`, `tool`) | hook `beforePrompt` altera o system |
| chamar o modelo com as tools declaradas | `sampling` no provider ou no `@Agent` |
| **detectar que o modelo pediu uma ferramenta** | *(fechado — ver abaixo)* |
| **validar os argumentos contra o schema Zod** | você escreve o schema |
| **executar a ferramenta e devolver o resultado** | hooks `beforeTool` / `afterTool` |
| anexar cada turno ao histórico | `ctx.state` é público e editável |
| repetir enquanto o `until` do loop não for verdadeiro | você escreve o `until` |
| criar o estado do workflow, um por execução | você declara a classe em `@Workflow({ state })` |
| tentar de novo em falha transitória de rede | `retry` no provider |
| gravar a árvore da execução | `report` e `log` no config |

## A parte deliberadamente fechada

Três linhas da tabela estão em negrito. Elas são o núcleo do framework e **não têm
gancho de personalização** — de propósito.

Quando o modelo responde, o framework precisa decidir: isso é uma resposta final
ou um pedido de ferramenta? Feito à mão, esse código vira uma pilha de condicionais
que muda a cada modelo:

```ts
// o que você NÃO escreve
if (resposta.tool_calls?.length) { … }
else if (resposta.content?.startsWith("{")) { …tentar parsear… }
else if (resposta.content?.includes("<tool_call>")) { …outro formato… }
```

É onde moram os bugs mais chatos de agente: um modelo pequeno emite a chamada como
texto em vez de usar o campo estruturado, e o agente encerra achando que respondeu.
O framework trata isso — inclusive recuperando chamadas escritas como texto, em
vários formatos — e você nunca vê.

::: tip Por que isso é bom
Trocar `qwen2.5-coder` por `gpt-4o-mini` não deveria exigir mudar seu código. Como
essa camada é do framework, não é.
:::

Se você precisa mesmo interferir aí, o caminho é
[escrever um provider](/referencia/providers) — que é o ponto de extensão certo
para "meu backend fala diferente".

## O que não é automático

Igualmente importante: o framework **não** decide por você.

- **Quando parar.** O `until` do loop é seu. Não há heurística escondida de
  "acho que terminou" — veja [Decidir quando o loop para](/guias/parada).
- **Quando buscar na memória.** Nada é injetado no prompt sozinho. Se você quer
  contexto vetorial, você chama `recall` onde fizer sentido.
- **O que fazer com erro de ferramenta.** Por padrão o erro sobe e derruba a
  execução. Virar observação para o modelo é opt-in (`toolErrors: "observe"`).
- **Quanto gastar.** Sem `budget`, nada é medido nem limitado.
- **Como formatar contexto recuperado.** Você monta a string.

A regra que seguimos: **o framework entrega o mecanismo, você escolhe a política.**

## O que muda de comportamento por padrão

Uma exceção honesta à regra acima. O **retry vem ligado**: um `429` de rate limit
ou um `503` momentâneo são reexecutados até 3 vezes, com espera crescente.

Foi decisão deliberada — falha transitória de rede derrubando uma execução inteira
é quase sempre indesejado. Para desligar:

```ts
super({ host, model, retry: false });
```

O timeout, esse sim, **não** tem valor padrão: um teto arbitrário abortaria um
modelo local lento que hoje funciona. Ligue quando quiser ([Providers](/referencia/providers)).

## Onde você pode entrar

Do mais leve ao mais invasivo:

| Precisão | Ferramenta |
| --- | --- |
| ajustar o prompt final | hook `beforePrompt` |
| inspecionar ou barrar uma ferramenta | hook `beforeTool` (um `throw` cancela) |
| transformar o resultado de uma ferramenta | hook `afterTool` |
| transformar a resposta do agente | hook `afterResponse` |
| tratar erro sem derrubar | hook `onError` |
| receber o contexto ou o estado numa tool | `@context()`, `@state()` nos parâmetros |
| escolher qual memória vetorial | `@memory(Store)` no construtor |
| mexer no histórico e no contexto | `ctx.state`, público |
| controlar o laço | o `until` do `loop` |
| falar com outro backend | escrever um provider |
| assumir o turno inteiro | método `run(input, ctx)` na classe do agente |

Esse último é o escape hatch total: se a classe do agente define `run`, ela toma
conta do passo e nenhum hook automático é chamado.

## Próximo

[O ciclo de uma execução](/como-funciona/ciclo) mostra a ordem exata em que tudo
isso acontece.

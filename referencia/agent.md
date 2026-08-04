# `@Agent`

Registra uma classe como agente e carrega o prompt do markdown.

```ts
@Agent({
  provider: LocalOllamaProvider,
  tools: [ShellTool],
  prompt: "./explorer.agent.md",
  sampling: { temperature: 0 },
})
export class ExplorerAgent {}
```

## Opções

| Campo | Tipo | Obrigatório | O que faz |
| --- | --- | --- | --- |
| `provider` | `Providers \| ProviderCtor` | sim | quem fala com o modelo — instância ou classe |
| `prompt` | `string \| URL` | sim | caminho do markdown com o prompt |
| `tools` | `ToolInput[]` | não | ações disponíveis: classes `@Tool` ou objetos `ToolType` |
| `sampling` | `SamplingParams` | não | sobrescreve, chave a chave, o sampling do provider |

## `prompt`

Resolvido de três formas:

```ts
prompt: "./explorer.agent.md"                        // relativo ao arquivo do agente
prompt: "/caminho/absoluto/explorer.agent.md"        // absoluto
prompt: new URL("./explorer.agent.md", import.meta.url)
```

O caminho relativo é resolvido a partir do arquivo que contém o decorator. O
markdown é lido **na carga do módulo** — se não existir, o erro aparece no import,
não na execução.

## Injeção no construtor

Declare nos parâmetros o que o agente precisa — veja
[Injeção](/referencia/injecao):

```ts
export class MeuAgente {
  constructor(
    @state() private readonly s: RevisaoState,
    @memory(QdrantOpenAI) private readonly mem: VectorMemory,
  ) {}
}
```

Sem decorator, vale o contrato posicional: uma `VectorMemory` para cada store
registrado em [`ThenaConfig.memory`](/referencia/config), na ordem do array.

```ts
export class MeuAgente {
  constructor(private readonly memory: VectorMemory) {}
}
```

Agentes que não usam memória não escrevem construtor — o argumento extra é
ignorado. Sem `memory` no config, o parâmetro chega `undefined`.

Para não depender da ordem, use os [decorators de injeção](/referencia/injecao):

```ts
constructor(
  @state() private readonly s: RevisaoState,
  @memory(QdrantOpenAI) private readonly vetor: VectorMemory,
) {}
```

::: warning A injeção é posicional
Com vários stores, a ordem do array em `ThenaConfig.memory` é a ordem dos
parâmetros, e o TypeScript não pode ajudar — todos têm o mesmo tipo. Reordenar o
array troca qual store cada agente usa **sem erro de compilação**. Trate a ordem
como contrato: acrescente no fim, nunca no meio.

Não usamos `reflect-metadata` porque o esbuild (que o `tsx` usa em dev) não emite
`design:paramtypes` — injeção por tipo compilaria e quebraria em silêncio no dev.
:::

## Hooks

A classe pode declarar os cinco hooks opcionais. Veja
[Referência · Hooks](/referencia/hooks).

## Escape hatch

Se a classe define `run(input, ctx)`, ela assume o turno inteiro e **nenhum hook
automático é chamado**. Antes de `run` ser invocado, o runtime preenche
`this.context`, `this.provider`, `this.tools` e `this.prompt`.

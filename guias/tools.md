# Dar ações ao agente

Uma tool é uma ação que o agente pode executar. Você descreve o que ela faz e quais
argumentos aceita; o framework cuida de oferecê-la ao modelo, entender que ele quer
usá-la, validar o que ele mandou e chamar seu código.

```ts
import { Tool } from "@thenajs/core";
import { readFile } from "node:fs/promises";
import { z } from "zod";

@Tool({
  name: "ler_arquivo",
  description: "Lê o conteúdo de um arquivo do projeto.",
  schema: z.object({
    caminho: z.string().describe("caminho relativo, ex.: src/main.ts"),
  }),
})
export class LerArquivoTool {
  async execute({ caminho }: { caminho: string }) {
    return readFile(caminho, "utf8");
  }
}
```

E declare no agente:

```ts
@Agent({ provider: MeuProvider, tools: [LerArquivoTool], prompt: "./a.agent.md" })
export class MeuAgente {}
```

## A descrição é para o modelo

`description` é o que o modelo lê para decidir **quando** usar a ferramenta. É
prompt, não comentário de código.

```ts
// vago demais — o modelo chuta
description: "Operações de arquivo."

// diz quando usar
description: "Lê o conteúdo de um arquivo do projeto. Use antes de responder sobre código."
```

Vale o mesmo para os campos: `.describe()` no Zod entra no schema que o modelo vê.

## O schema é a fronteira de confiança

Os argumentos vêm de um modelo de linguagem — ou seja, não são confiáveis. O
framework valida contra o seu schema **antes** de chamar `execute`, então dentro
dele você já trabalha com dados verificados.

Mantenha estrito. Um `z.string()` genérico deixa passar coisa que um
`z.enum(["leitura", "escrita"])` recusaria de graça.

## O que o `execute` recebe

Por padrão, só o objeto já validado pelo schema:

```ts
async execute({ caminho }: { caminho: string }) {
  return readFile(caminho, "utf8");
}
```

É o caso comum, e mantém a tool trivial de testar. Quando ela precisa de mais, os
parâmetros dizem o que querem — e a ordem não importa:

```ts
import { Tool, input, context, state } from "@thenajs/core";

async execute(
  @input() { caminho }: { caminho: string },   // os argumentos validados
  @context() ctx: AgentContext,                 // o contexto da execução
  @state() s: RevisaoState,                     // o estado do workflow
) {
  s.arquivosLidos.push(caminho);
  return readFile(caminho, "utf8");
}
```

::: tip Use com parcimônia
Uma tool que lê o contexto deixa de ser testável isoladamente. O caso que mais
justifica é repassar informação a um [sub-workflow](/guias/sub-agente), que roda
isolado e começaria sem saber o que foi pedido.
:::

## Sinalizar que deu errado

Devolver uma string é o caminho normal. Para marcar que a observação é um erro —
sem derrubar a execução — devolva um objeto:

```ts
async execute({ caminho }: { caminho: string }) {
  try {
    return await readFile(caminho, "utf8");
  } catch (err) {
    return { content: `Não consegui ler: ${(err as Error).message}`, isError: true };
  }
}
```

O modelo recebe o texto e pode tentar outra coisa. E o [report](/guias/report)
marca esse passo como erro, o que deixa "taxa de erro de ferramenta" ser uma
contagem, não uma busca no texto.

::: tip Uma tool que lança
Por padrão, um `throw` dentro do `execute` derruba a execução. Se preferir que
vire observação para o modelo tentar de novo, ligue no config:
`toolErrors: "observe"`.
:::

## Limitar o tamanho da saída

Uma ferramenta que devolve 200 KB entope o contexto do modelo e encarece tudo.
Corte antes de devolver:

```ts
const LIMITE = 4000;

async execute({ caminho }: { caminho: string }) {
  const conteudo = await readFile(caminho, "utf8");
  return conteudo.length <= LIMITE
    ? conteudo
    : `${conteudo.slice(0, LIMITE)}\n… [truncado]`;
}
```

## Uma tool que dispara um workflow

O construtor pode receber o `WorkflowRuntime` injetado — é assim que uma ação
dispara um processo inteiro:

```ts
import { Tool, WorkflowRuntime } from "@thenajs/core";
import { DeployWorkflow } from "../workflows/deploy.workflow.js";

@Tool({
  name: "deploy",
  description: "Executa o processo de deploy e devolve o resultado.",
  schema: z.object({ repositorio: z.string() }),
})
export class DeployTool {
  constructor(private readonly runtime: WorkflowRuntime) {}

  async execute(input: { repositorio: string }) {
    return this.runtime.run(DeployWorkflow, { input });
  }
}
```

Esse é o padrão de [sub-agente isolado](/guias/sub-agente), e vale a pena conhecer:
o workflow filho roda com histórico próprio e devolve uma string só.

## Tools prontas

```bash
npm install @thenajs/tools
```

```ts
import { ShellTool } from "@thenajs/tools";

@Agent({ provider: MeuProvider, tools: [ShellTool], prompt: "./a.agent.md" })
export class MeuAgente {}
```

::: warning ShellTool executa comandos de verdade
Dê a ela apenas para agentes cujo prompt e cujo ambiente você controla. Para
restringir, um hook `beforeTool` pode barrar comandos — veja
[Hooks](/guias/hooks#barrar-uma-ferramenta).
:::

## Referência

Assinaturas e tipos exatos em [`@Tool`](/referencia/tool).

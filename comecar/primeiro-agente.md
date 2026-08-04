# Seu primeiro agente

Vamos construir um agente que **lê arquivos do projeto para responder**. Ao final
ele estará rodando, e você terá visto os quatro arquivos que compõem qualquer
agente no ThenaJS.

Leva uns 10 minutos. Assume que você já [instalou](/comecar/instalacao).

## 1. O prompt

O comportamento vive num markdown, não no código. Crie
`src/agents/leitor/leitor.agent.md`:

```md
Você responde perguntas sobre este projeto.

Antes de responder, **leia os arquivos relevantes** com a ferramenta disponível.
Não invente conteúdo: se não leu, diga que não sabe.

Responda em português, de forma direta.
```

Editar esse arquivo muda o agente. Sem recompilar, sem mexer em `.ts`.

## 2. A ação

Um agente sem ferramentas só conversa. Vamos dar a ele a capacidade de ler
arquivos — `src/tools/ler-arquivo.tool.ts`:

```ts
import { Tool, input } from "@thenajs/core";
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
  async execute(@input() { caminho }: { caminho: string }) {
    return readFile(caminho, "utf8");
  }
}
```

Três coisas importam aqui:

- **`description`** é lida pelo modelo. É como ele decide *quando* usar a
  ferramenta — escreva pensando nele, não em você.
- **`schema`** é a fronteira de confiança. O framework valida os argumentos que o
  modelo inventou **antes** de chamar seu `execute`. Mantenha estrito.
- **`@input()`** marca o parâmetro que recebe os argumentos já validados. Nada de
  `if` para descobrir se o modelo chamou a ferramenta, nem qual — isso é do
  framework.

Cada parâmetro declara o que quer, então a ordem nunca importa. Além do
`@input()`, uma ferramenta pode pedir `@context()` (o contexto da execução) e
`@state()` (o estado do workflow) — veja [Injeção](/referencia/injecao).

## 3. O agente

`src/agents/leitor/leitor.agent.ts`:

```ts
import { Agent } from "@thenajs/core";
import { LerArquivoTool } from "../../tools/ler-arquivo.tool.js";
import { LocalOllamaProvider } from "../../providers/ollama.provider.js";

@Agent({
  provider: LocalOllamaProvider,
  tools: [LerArquivoTool],
  prompt: "./leitor.agent.md",
})
export class LeitorAgent {}
```

A classe está vazia — e na maioria dos casos continua assim. Ela só ganha corpo
quando você precisa [interceptar o fluxo](/guias/hooks).

## 4. O workflow

Um agente sozinho responde uma vez e para. Como queremos que ele **leia e depois
responda**, precisamos de um laço. `src/workflows/leitor.workflow.ts`:

```ts
import { Workflow, loop, untilAnswered } from "@thenajs/core";
import { LeitorAgent } from "../agents/leitor/leitor.agent.js";

@Workflow({
  steps: [
    loop({
      steps: [LeitorAgent],
      until: untilAnswered, // para quando ele responder sem usar ferramenta
      maxIterations: 8,     // rede de segurança
    }),
  ],
})
export class LeitorWorkflow {}
```

`untilAnswered` é a regra de parada mais comum: **repita enquanto ele usar
ferramentas; pare quando ele finalmente responder.** O `maxIterations` existe para
o caso de ele nunca parar.

::: tip Isso é o padrão ReAct
Pensar → agir → observar → repetir. O `loop` é onde ele acontece, e a
[página sobre parada](/guias/parada) mostra como escrever regras próprias quando
`untilAnswered` não serve.
:::

## 5. Rodar

`src/main.ts`:

```ts
import { bootstrapWorkflow } from "@thenajs/core";
import { LeitorWorkflow } from "./workflows/leitor.workflow.js";
import { config } from "./config.js";

const pergunta = process.argv.slice(2).join(" ") || "O que este projeto faz?";

const app = await bootstrapWorkflow(LeitorWorkflow, config);
await app.run({ input: { message: pergunta } });
```

```bash
npm start -- "Quais dependências este projeto tem?"
```

O agente vai ler o `package.json` e responder com base no que leu.

## O que aconteceu

Você escreveu um prompt, uma ação e a ordem dos passos. Não escreveu:

- montagem de mensagens ou payload de API
- detecção de que o modelo pediu uma ferramenta
- validação dos argumentos
- o laço de "chamou ferramenta? então rode de novo"

Isso está descrito em detalhe em [O que é automático](/como-funciona/automatico) —
vale ler antes de personalizar qualquer coisa, para saber onde você pode entrar.

## Ver por dentro

Ligue o report no `src/config.ts`:

```ts
export const config: ThenaConfig = {
  log: true,     // árvore da execução, ao vivo no terminal
  report: true,  // arquivo HTML no fim
};
```

Rode de novo e abra `report/index.html`. Você vai ver cada chamada ao modelo, o
que foi enviado, o que ele decidiu e quanto custou. É a melhor forma de entender
o que o agente está de fato fazendo — mais em [Report](/guias/report).

## Próximos passos

- [O que é automático](/como-funciona/automatico) — o que o framework faz por você
- [Estado e contexto](/como-funciona/estado) — como os passos compartilham dados
- [Orquestrar vários agentes](/guias/workflows) — sequência, paralelo e laço

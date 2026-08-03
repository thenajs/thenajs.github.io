# Ver o que aconteceu

Agente é difícil de depurar porque a decisão é do modelo. O report existe para
isso: ao final da execução, um HTML com a árvore inteira — o que foi enviado, o
que ele decidiu, quanto durou e quanto custou.

```ts
// src/config.ts
import type { ThenaConfig } from "@thenajs/core";

export const config: ThenaConfig = {
  log: true,      // árvore ao vivo no terminal
  report: true,   // arquivo HTML no fim
};
```

```ts
const app = await bootstrapWorkflow(MeuWorkflow, config);
```

Rode e abra `report/index.html`.

## Ao vivo, no terminal

```
[thena] ▸ workflow RevisaoWorkflow
[thena]   ▸ agent PlannerAgent
[thena]     ▸ chat
[thena]     ◂ chat  1.20s ✓
[thena]   ◂ agent PlannerAgent  1.21s ✓
[thena]   ▸ loop
[thena]     ▸ agent RevisorAgent
[thena]       ▸ chat
[thena]         ▸ tool ler_arquivo
[thena]         ◂ tool ler_arquivo  8ms ✓
```

`log: true` mostra a estrutura. `log: "verbose"` inclui o conteúdo. E uma função
recebe cada evento, para mandar ao seu logger:

```ts
log: (evento) => logger.info(evento)
```

## O que dá para medir

Cada nó carrega dados estruturados — a ideia é que medir uma execução não exija
procurar padrão em texto:

| Nó | Campos |
| --- | --- |
| `workflow` | `chatCalls`, `toolCalls`, `tokens`, `costUsd`, `elapsedMs`, `exceeded` |
| `loop` | `iterations`, `exhausted`, `maxIterations` |
| `chat` | `toolCallSource`, `promptTokens`, `completionTokens`, `costUsd`, `attempts` |
| `tool` | `isError` (e o nó fica com status de erro) |

Na prática:

- **taxa de erro de ferramenta** = contar nós `tool` com status de erro
- **loops que não convergiram** = `exhausted: true`
- **instabilidade da API** = `attempts` presente (só aparece quando houve retry)
- **fragilidade do modelo** = `toolCallSource: "rescued"`, que significa que ele
  escreveu a chamada como texto em vez de usar o formato estruturado

Esse último é um bom termômetro: se sobe muito, o modelo está no limite da tarefa.

## Custo

Tokens aparecem sem configuração — Ollama e OpenAI reportam. Para custo em dinheiro,
informe o preço no provider:

```ts
super({ apiKey, model, costPer1kTokens: { input: 0.00015, output: 0.0006 } });
```

Não há tabela embutida, de propósito: preço muda e uma tabela desatualizada mente
com confiança.

## Opt-in, custo zero

Sem `report` nem `log`, nada é capturado e não há sobrecarga — a instrumentação é
no-op. Não há serviço externo nem telemetria: o report é um arquivo local.

```ts
report: { dir: "report", format: "html" }   // ou "json", ou "both"
```

# Instalação

## Criar um projeto

```bash
npm install -g @thenajs/cli
thena create meu-agente
cd meu-agente
npm install
```

O `thena create` gera um projeto pronto para editar:

```
src/
  agents/
    assistant/
      assistant.agent.ts    # a lógica
      assistant.agent.md    # o prompt
  providers/
    ollama.provider.ts      # qual modelo usar
  workflows/
    assistant.workflow.ts   # a ordem dos passos
  config.ts                 # log e report
  main.ts                   # ponto de entrada
```

## Apontar para um modelo

O projeto já vem configurado para [Ollama](https://ollama.com) local. Se ainda não
tiver o modelo:

```bash
ollama pull qwen2.5-coder:7b
```

Ajuste `src/providers/ollama.provider.ts` se usar outro host ou modelo:

```ts
import { OllamaProvider } from "@thenajs/core";

export class LocalOllamaProvider extends OllamaProvider {
  constructor() {
    super({
      host: "http://localhost:11434",
      model: "qwen2.5-coder:7b",
      sampling: { temperature: 0 }, // ver a nota abaixo
    });
  }
}
```

::: tip Comece em `temperature: 0`
Agente não é chat: você quer que a mesma entrada produza a mesma decisão. Medimos
num `qwen2.5-coder:1.5b` — a mesma pergunta 3 vezes deu **3 respostas diferentes**
sem `sampling`, e **3 idênticas** com `temperature: 0` e um `seed`. Suba a
temperatura depois, onde quiser variedade.
:::

Para OpenAI em vez de Ollama:

```ts
import { OpenAIProvider } from "@thenajs/core";

export class GptProvider extends OpenAIProvider {
  constructor() {
    super({
      apiKey: process.env.OPENAI_API_KEY!,
      model: "gpt-4o-mini",
      sampling: { temperature: 0 },
    });
  }
}
```

## Rodar

```bash
npm start
```

Você deve ver o agente responder no terminal. Se algo falhar aqui, a página
[Problemas comuns](/problemas-comuns) cobre os erros de primeira execução.

## Adicionar ao projeto existente

Se preferir instalar num projeto que já existe, em vez de usar o CLI:

```bash
npm install @thenajs/core @thenajs/tools zod
```

E habilite decorators no `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "experimentalDecorators": true,
    "strict": true
  }
}
```

Pronto — agora vale [criar o primeiro agente](/comecar/primeiro-agente).

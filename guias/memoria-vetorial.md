# Memória vetorial

Busca semântica: o agente grava textos e recupera **por similaridade**, não por
ordem. Serve para uma base de conhecimento que não caberia no prompt inteiro.

::: tip Não confunda com `ctx.state.memory`
Aquele é o bucket de contexto durável, que entra **sempre** no prompt, na ordem
que você colocou. Este aqui você grava muito e recupera só o relevante. Um é
lembrete, o outro é biblioteca.
:::

## Registrar o banco

```bash
npm install @thenajs/qdrant-client
```

```ts
// src/vector/qdrant.store.ts
import { QdrantStore } from "@thenajs/qdrant-client";

export class MeuQdrant extends QdrantStore {
  constructor() {
    super({ url: "http://localhost:6333", collection: "conhecimento" });
  }
}
```

```ts
// src/config.ts
export const config: ThenaConfig = {
  memory: [MeuQdrant],   // as classes; o framework instancia uma vez
};
```

Um Qdrant local sobe com Docker:

```bash
docker run -d -p 6333:6333 qdrant/qdrant
```

::: warning Requer Qdrant 1.10 ou superior
O endpoint de busca que o cliente usa estreou nessa versão.
:::

## Usar no agente

Quem quer memória pede no construtor — como as tools fazem com o `WorkflowRuntime`:

```ts
@Agent({ provider: LocalOllamaProvider, prompt: "./assistente.agent.md" })
export class AssistenteAgent {
  constructor(@memory() private readonly mem: VectorMemory) {}

  async beforePrompt(prompt: string, ctx: AgentContext) {
    const pergunta = ctx.state.history.at(-1)?.content ?? "";
    const achados = await this.mem.recall(pergunta, { limit: 3 });

    if (!achados.length) return;

    return `${prompt}\n\n## Contexto\n${achados.map((a) => `- ${a.text}`).join("\n")}`;
  }

  async afterResponse(resposta: string) {
    await this.mem.remember(resposta);
  }
}
```

Agentes que não usam memória simplesmente não escrevem construtor.

Com **mais de um store** registrado, aponte qual você quer pela classe — assim a
ordem do array em `ThenaConfig.memory` deixa de importar:

```ts
constructor(@memory(QdrantOpenAI) private readonly mem: VectorMemory) {}
```

Os embeddings saem do `provider` do próprio agente. Aponte um modelo dedicado:

```ts
super({ host, model: "qwen2.5-coder:7b", embedModel: "nomic-embed-text" });
```

As dimensões da collection são descobertas na primeira gravação — você não precisa
saber que `nomic-embed-text` é 768.

## Separar contextos

`dataset` particiona a mesma collection. É opcional; omitido, usa `"default"`:

```ts
await this.memory.remember("fato duradouro", { dataset: "persistent" });
await this.memory.remember("algo desta sessão", { dataset: "sessao" });

await this.memory.recall("pergunta", { dataset: "persistent" });  // um
await this.memory.recall("pergunta");                             // o "default"
await this.memory.recall("pergunta", { dataset: null });          // todos
await this.memory.forget({ dataset: "sessao" });                  // limpa um
```

Datasets não são collections separadas — são um campo indexado. É a recomendação
do próprio Qdrant, e é o que permite buscar através de todos com `dataset: null`.

## Quando buscar é decisão sua

O framework não injeta contexto sozinho. As duas formas comuns:

- **Num hook** (acima): o contexto **sempre** entra, e você controla corte e escopo.
- **Numa tool**: o **modelo** decide se precisa buscar.

```ts
@Tool({
  name: "buscar_conhecimento",
  description: "Busca informação na base de conhecimento da empresa.",
  schema: z.object({ pergunta: z.string() }),
})
export class BuscarTool {
  constructor(private readonly memory: VectorMemory) {}

  async execute({ pergunta }: { pergunta: string }) {
    const achados = await this.mem.recall(pergunta, { limit: 5 });
    return achados.length
      ? achados.map((a) => `[${a.score.toFixed(2)}] ${a.text}`).join("\n")
      : "Nada encontrado.";
  }
}
```

## Fora de um agente

```ts
import { VectorMemory } from "@thenajs/core";

const memoria = new VectorMemory({
  store: new MeuQdrant(),
  provider: new LocalOllamaProvider(),
});

await memoria.remember("o deploy roda pelo scripts/deploy.sh");
const achados = await memoria.recall("como faço deploy?", { limit: 3 });
```

## Outro banco

`VectorStore` é o contrato. Estenda e implemente seis métodos — a classe base cuida
do transporte. Veja [Referência · Banco vetorial](/referencia/vetorial).

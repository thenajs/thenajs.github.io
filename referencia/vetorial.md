# Banco vetorial

## `VectorMemory`

O que é injetado no construtor dos agentes.

```ts
remember(text: string, options?: {
  dataset?: string;
  payload?: Record<string, unknown>;
  id?: string | number;
}): Promise<string | number>

rememberMany(items: ({ text: string } & RememberOptions)[]): Promise<(string | number)[]>

recall(query: string, options?: {
  limit?: number;              // padrão 5
  dataset?: string | null;     // omitido = "default"; null = todos
  scoreThreshold?: number;
  where?: Record<string, unknown>;
}): Promise<RecallHit[]>

forget(selector?: {
  ids?: (string | number)[];
  dataset?: string;
  where?: Record<string, unknown>;
}): Promise<void>
```

```ts
type RecallHit = {
  text: string;
  score: number;
  dataset: string;
  id: string | number;
  payload?: Record<string, unknown>;
};
```

O texto vai no payload junto com o `dataset`; `recall` devolve os dois.

## `VectorStore`

O contrato de um banco. Estenda para trazer o seu.

```ts
abstract ensureCollection(options: { size: number; distance?: VectorDistance }): Promise<void>
abstract collectionExists(): Promise<boolean>
abstract dropCollection(): Promise<void>
abstract upsert(docs: VectorDocument[]): Promise<void>
abstract search(params: VectorSearch): Promise<VectorMatch[]>
abstract remove(selector: VectorSelector): Promise<void>
```

```ts
type VectorSearch = {
  vector: number[];
  limit?: number;
  where?: Record<string, unknown>;   // igualdade simples
  rawFilter?: unknown;               // formato nativo — vence o `where`
  scoreThreshold?: number;
  withPayload?: boolean;
};
```

Credenciais: `url`, `apiKey?`, `collection?`, `datasetField?`, mais `retry` do
transporte.

```ts
export class PgVectorStore extends VectorStore {
  constructor(credentials: VectorStoreCredentials) {
    super();
    this.configureTransport(credentials);   // ganha retry e timeout
  }
  // …
}
```

::: warning Uma collection guarda um tamanho de vetor só
As dimensões são descobertas na primeira gravação. Se dois agentes usam modelos de
embedding diferentes (768 e 1536) apontando para o mesmo store, a segunda gravação
falha com mensagem explícita. Modelos diferentes precisam de stores diferentes.
:::

## `QdrantStore`

```bash
npm install @thenajs/qdrant-client
```

Cliente nativo sobre a API REST, sem SDK. **Requer Qdrant 1.10 ou superior** — o
endpoint de busca que ele usa estreou nessa versão.

```ts
export class MeuQdrant extends QdrantStore {
  constructor() {
    super({
      url: "http://localhost:6333",
      apiKey: process.env.QDRANT_API_KEY,   // Qdrant Cloud
      collection: "conhecimento",
      retry: { maxAttempts: 3, timeoutMs: 10_000 },
    });
  }
}
```

| Campo | Padrão |
| --- | --- |
| `url` | — (obrigatório) |
| `apiKey` | — |
| `collection` | `"thena_memory"` |
| `datasetField` | `"dataset"` |

Grava tudo numa collection e separa contextos por um campo indexado do payload —
que é a recomendação do próprio Qdrant, porque muitas collections geram overhead
e o Cloud limita a 1000 por cluster.

Em Qdrant 1.12+, o índice usa `is_tenant`, que co-loca os pontos do mesmo dataset
em disco. Em versões anteriores cai para o índice simples — funciona igual, sem
essa otimização.

::: tip `datasets` está deprecado
O campo `datasets` das credenciais não é mais usado e sai na 0.5.0. Pode remover
da sua config sem mudar nada.
:::

# Providers

## Credenciais comuns

Todo provider aceita, além dos campos próprios:

| Campo | Tipo | O que faz |
| --- | --- | --- |
| `sampling` | `SamplingParams` | parâmetros de amostragem |
| `raw` | `Record<string, unknown>` | chaves cruas mescladas no body |
| `retry` | `RetryPolicy \| boolean` | retry das chamadas HTTP |
| `rescueToolCalls` | `boolean` | recuperar tool call emitida como texto |
| `costPer1kTokens` | `{ input?, output? }` | preço, para o custo no report |

## `SamplingParams`

Shape neutro, traduzido por cada provider. Nada tem valor padrão: o que você não
informar não é enviado.

| Campo | Ollama | OpenAI |
| --- | --- | --- |
| `temperature` | `options.temperature` | `temperature` |
| `topP` | `options.top_p` | `top_p` |
| `seed` | `options.seed` | `seed` |
| `maxTokens` | `options.num_predict` | `max_tokens` |
| `stop` | `options.stop` | `stop` |
| `topK` | `options.top_k` | — |
| `numCtx` | `options.num_ctx` | — |
| `repeatPenalty` | `options.repeat_penalty` | — |

Os três últimos não têm equivalente na OpenAI e são descartados lá. Use `raw` para
o que o shape neutro não cobre.

## `RetryPolicy`

```ts
{
  maxAttempts?: number;        // padrão 3
  timeoutMs?: number;          // sem padrão — ver abaixo
  initialDelayMs?: number;     // padrão 500
  maxDelayMs?: number;         // padrão 8000
  factor?: number;             // padrão 2
  respectRetryAfter?: boolean; // padrão true
  isRetryable?: (info: RetryAttempt) => boolean;
  onRetry?: (info: RetryAttempt) => void;
}
```

| Situação | Retenta? |
| --- | --- |
| `408` · `425` · `429` | sim |
| `500` · `502` · `503` · `504` | sim |
| erro de rede, abort por timeout | sim |
| demais `4xx` | **não** — erro de contrato não melhora repetindo |

O backoff usa *full jitter*. Um `Retry-After` do servidor vence o cálculo.
`retry: false` reduz a uma tentativa.

::: warning `timeoutMs` não tem padrão
É o único parâmetro capaz de quebrar um setup que funcionava — um teto de 120s
abortaria um modelo local lento que hoje responde em 200s. Sem ele, uma requisição
pendurada só falha no limite do runtime.
:::

::: warning Custo do retry
Reexecutar um `5xx` pode cobrar duas vezes, se o servidor processou e só a resposta
se perdeu. E um `5xx` permanente gasta as três tentativas antes de falhar.
:::

## Escrever o seu

Estenda `Providers` e implemente `chatInternal`:

```ts
protected chatInternal(
  tools: ToolType[],
  messages: Message[],
  sampling?: SamplingParams,
): Promise<RawAssistant>
```

```ts
type RawAssistant = {
  content: string;
  toolCalls?: ProviderToolCall[];
  usage?: { promptTokens?: number; completionTokens?: number };
  attempts?: number;
};
```

| A base faz | Você devolve |
| --- | --- |
| remover blocos de raciocínio do conteúdo | `content` |
| detectar tool call, nativa ou no texto | `toolCalls?` se a API trouxer |
| validar args contra o schema | — |
| executar a ferramenta | — |
| mesclar sampling do provider e do agente | — |
| retry e timeout (via `this.request`) | `attempts` do `request()` |
| calcular custo | `usage?` se a API reportar |

Use `this.configure(credentials)` no construtor para absorver os campos comuns, e
`this.request(url, init)` no lugar de `fetch`.

## Embeddings

```ts
public embed(input?: string): Promise<number[]>
```

Público. Providers sem suporte devolvem `[]`.

## Tipos exportados

`Providers` · `OllamaProvider` · `OpenAIProvider` · `ProviderCredentials` ·
`SamplingParams` · `RetryPolicy` · `RetryAttempt` · `RawAssistant` · `ChatParams` ·
`ProviderToolCall` · `Usage` · `TokenCost` · `HttpTransport` · `TransportCredentials`

Utilitários para quem escreve provider: `parser`, `normalizeToolCallEnvelope`,
`pruneUndefined`.

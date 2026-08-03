# Interceptar o fluxo

Na maioria dos casos a classe do agente fica vazia. Quando você precisa entrar no
meio do turno, declare um dos cinco métodos — o runtime chama só o que existir.

```ts
@Agent({ provider: MeuProvider, tools: [ShellTool], prompt: "./a.agent.md" })
export class MeuAgente {
  async beforePrompt(prompt: string, ctx: AgentContext) {
    return `${prompt}\n\nHoje é ${new Date().toISOString().slice(0, 10)}.`;
  }
}
```

::: tip Retornar substitui, não retornar mantém
Um hook que devolve um valor **substitui** o original. Um que devolve `undefined`
deixa tudo como estava — é por isso que um hook só de observação pode não retornar
nada.
:::

## Os cinco pontos

| Hook | Quando |
| --- | --- |
| `beforePrompt` | antes de enviar ao modelo |
| `beforeTool` | antes de executar uma ferramenta |
| `afterTool` | com o resultado da ferramenta |
| `afterResponse` | com a resposta final do turno |
| `onError` | quando algo lança |

A ordem exata está em [O ciclo de uma execução](/como-funciona/ciclo#um-turno-de-agente-em-detalhe).

## Injetar contexto no prompt

```ts
async beforePrompt(prompt: string, ctx: AgentContext) {
  const pergunta = ctx.state.history.at(-1)?.content ?? "";
  const achados = await this.memory.recall(pergunta, { limit: 3 });

  if (!achados.length) return;   // mantém o prompt original

  return `${prompt}\n\n## Contexto\n${achados.map((a) => `- ${a.text}`).join("\n")}`;
}
```

## Barrar uma ferramenta

Um `throw` no `beforeTool` cancela a execução daquela ferramenta:

```ts
async beforeTool(call: ToolCall) {
  const { command } = call.args as { command: string };
  if (/\brm\b|sudo/.test(command)) {
    throw new Error("Comando bloqueado por política.");
  }
}
```

Também dá para trocar os argumentos, devolvendo um `ToolCall` novo:

```ts
async beforeTool(call: ToolCall) {
  if (call.name === "ler_arquivo") {
    const args = call.args as { caminho: string };
    return { ...call, args: { caminho: args.caminho.replace(/^\/+/, "") } };
  }
}
```

## Cortar chamadas repetidas

Um agente que insiste na mesma ferramenta com os mesmos argumentos está travado.
O `beforeTool` resolve, e a política é sua:

```ts
export class ExplorerAgent {
  private vistas = new Set<string>();

  beforeTool(call: ToolCall) {
    const assinatura = `${call.name}:${JSON.stringify(call.args)}`;
    if (this.vistas.has(assinatura)) {
      throw new Error(`Você já chamou ${call.name} com esses argumentos.`);
    }
    this.vistas.add(assinatura);
  }
}
```

## Comprimir uma saída grande

```ts
async afterTool(result: ToolResult) {
  if (result.output.length > 4000) {
    return `${result.output.slice(0, 4000)}\n… [truncado]`;
  }
}
```

Devolver uma string troca só o texto e preserva a marca de erro. Para mudar a
marca, devolva um objeto completo: `{ content, isError: false }`.

## Gravar uma decisão para o loop ler

```ts
async afterResponse(resposta: string, ctx: AgentContext) {
  ctx.aprovado = resposta.includes("APROVADO");
}
```

É o padrão usado em [Decidir quando o loop para](/guias/parada#parar-quando-algo-foi-decidido).

## Não derrubar a execução

```ts
async onError(erro: Error, ctx: AgentContext) {
  console.error("[app] falhou:", erro.message);
  return "Não consegui completar agora.";   // vira a saída do agente
}
```

Sem retorno, o erro continua subindo.

## Assumir o turno inteiro

Se a classe define `run(input, ctx)`, ela toma conta do passo — e **nenhum hook
automático é chamado**. É o escape hatch total, para quando você quer orquestrar
na mão:

```ts
export class MeuAgente {
  async run(input: string, ctx: AgentContext) {
    // provider, tools e prompt estão disponíveis em `this`
    return "resposta montada por mim";
  }
}
```

Assinaturas exatas em [Referência · Hooks](/referencia/hooks).

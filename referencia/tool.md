# `@Tool`

Registra uma classe como ferramenta. A lógica fica em `execute`.

```ts
@Tool({
  name: "ler_arquivo",
  description: "Lê o conteúdo de um arquivo do projeto.",
  schema: z.object({ caminho: z.string() }),
})
export class LerArquivoTool {
  async execute({ caminho }: { caminho: string }) {
    return readFile(caminho, "utf8");
  }
}
```

## Opções

| Campo | Tipo | O que faz |
| --- | --- | --- |
| `name` | `string` | identificador que o modelo usa para chamar |
| `description` | `string` | **lido pelo modelo** — é como ele decide quando usar |
| `schema` | `z.ZodType` | valida os argumentos antes do `execute` |

## `execute`

```ts
execute(args: any): string | ToolOutput | Promise<string | ToolOutput>
```

Recebe os argumentos **já validados** pelo schema.

Para receber mais que isso, decore os parâmetros — veja
[Injeção](/referencia/injecao):

```ts
async execute(
  @input() args: { caminho: string },
  @context() ctx: AgentContext,
  @state() s: RevisaoState,
) {}
```

```ts
type ToolOutput = {
  content: string;        // o texto que volta ao modelo
  isError?: boolean;      // marca como falha (nó de erro no report)
  data?: unknown;         // carga livre, ignorada pelo modelo
};
```

Devolver uma `string` equivale a `{ content, isError: false }`.

## Injeção no construtor

O construtor recebe o `WorkflowRuntime`, para disparar outro workflow:

```ts
export class DeployTool {
  constructor(private readonly runtime: WorkflowRuntime) {}
}
```

Tools sem construtor ignoram o argumento.

## Erros

Por padrão, um `throw` no `execute` **derruba a execução**. Para virar observação
que volta ao modelo:

```ts
export const config: ThenaConfig = { toolErrors: "observe" };
```

Um `throw` no hook `beforeTool` cancela a ferramenta e propaga — isso não muda com
`toolErrors`.

::: tip A classe precisa mesmo de `execute`
O decorator exige o método em tempo de compilação; uma classe sem ele não compila.
E há uma checagem em runtime para quem não passa pelo `tsc`, com mensagem que
aponta a classe.
:::

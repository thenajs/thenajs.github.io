---
layout: home

hero:
  name: ThenaJS
  text: Agentes de IA em TypeScript
  tagline: A lógica no .ts, o prompt no .md. O framework une os dois e cuida do resto.
  image:
    src: /assets/logo.png
    alt: ThenaJS
  actions:
    - theme: brand
      text: Começar
      link: /comecar/o-que-e
    - theme: alt
      text: Seu primeiro agente
      link: /comecar/primeiro-agente
    - theme: alt
      text: GitHub
      link: https://github.com/thenajs/ThenaJS

features:
  - icon: 🧩
    title: Um agente é uma classe
    details: Decore com @Agent, aponte o prompt em markdown, e pronto. Sem boilerplate de mensagens, sem montar payload de API.
    link: /comecar/primeiro-agente
    linkText: Ver o exemplo

  - icon: 🛠️
    title: Tools sem if/else
    details: Você descreve a ação com um schema Zod. Detectar que o modelo quer chamá-la, validar os argumentos e executar é trabalho do framework — nunca seu.
    link: /guias/tools
    linkText: Como funciona

  - icon: 🔍
    title: Nada de caixa-preta
    details: Um report em HTML mostra a árvore da execução — o que foi enviado ao modelo, o que ele decidiu, quanto custou.
    link: /guias/report
    linkText: Ver o report
---

## Em trinta segundos

```bash
npm install -g @thenajs/cli
thena create meu-agente
cd meu-agente && npm install && npm start
```

E um agente é isto:

```ts
// src/agents/explorer/explorer.agent.ts
import { Agent } from "@thenajs/core";
import { ShellTool } from "@thenajs/tools";
import { LocalOllamaProvider } from "../../providers/ollama.provider.js";

@Agent({
  provider: LocalOllamaProvider,
  tools: [ShellTool],
  prompt: "./explorer.agent.md", // o comportamento vive no markdown
})
export class ExplorerAgent {}
```

```md
<!-- src/agents/explorer/explorer.agent.md -->
Você explora projetos de software.

Use o shell para investigar antes de responder. Prefira comandos de leitura.
```

Nenhuma linha para tratar mensagens, chamar a API, detectar tool call ou validar
argumentos. Isso é o que o framework faz — e a página
[O que é automático](/como-funciona/automatico) lista exatamente o quê, para você
não ficar adivinhando.

## Por onde seguir

| Se você quer… | Vá para |
| --- | --- |
| entender se serve para o seu caso | [O que é ThenaJS](/comecar/o-que-e) |
| ver algo rodando em 10 minutos | [Seu primeiro agente](/comecar/primeiro-agente) |
| saber o que acontece por baixo | [O que é automático](/como-funciona/automatico) |
| resolver uma tarefa específica | [Guias](/guias/tools) |
| consultar uma assinatura | [Referência](/referencia/agent) |
| destravar de um erro | [Problemas comuns](/problemas-comuns) |

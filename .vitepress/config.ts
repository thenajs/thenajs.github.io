import { defineConfig } from "vitepress";

const github = "https://github.com/thenajs/ThenaJS";

export default defineConfig({
  lang: "pt-BR",
  title: "ThenaJS",
  description:
    "Framework TypeScript para agentes de IA: a lógica no .ts, o prompt no .md, e o framework une os dois.",

  // Publicado em thenajs.github.io (página de organização), logo na raiz.
  base: "/",
  cleanUrls: true,
  lastUpdated: true,
  sitemap: { hostname: "https://thenajs.github.io" },

  head: [
    ["link", { rel: "icon", href: "/assets/logo.png" }],
    ["meta", { name: "theme-color", content: "#5b8def" }],
    ["meta", { property: "og:type", content: "website" }],
    ["meta", { property: "og:image", content: "https://thenajs.github.io/assets/branding.png" }],
  ],

  themeConfig: {
    logo: "/assets/logo.png",

    nav: [
      { text: "Começar", link: "/comecar/o-que-e" },
      { text: "Guias", link: "/guias/tools" },
      { text: "Referência", link: "/referencia/agent" },
      {
        text: "npm",
        items: [
          { text: "@thenajs/core", link: "https://www.npmjs.com/package/@thenajs/core" },
          { text: "@thenajs/tools", link: "https://www.npmjs.com/package/@thenajs/tools" },
          { text: "@thenajs/qdrant-client", link: "https://www.npmjs.com/package/@thenajs/qdrant-client" },
          { text: "@thenajs/cli", link: "https://www.npmjs.com/package/@thenajs/cli" },
        ],
      },
    ],

    sidebar: [
      {
        text: "Começar",
        items: [
          { text: "O que é ThenaJS", link: "/comecar/o-que-e" },
          { text: "Instalação", link: "/comecar/instalacao" },
          { text: "Seu primeiro agente", link: "/comecar/primeiro-agente" },
        ],
      },
      {
        text: "Como funciona",
        items: [
          { text: "O que é automático", link: "/como-funciona/automatico" },
          { text: "O ciclo de uma execução", link: "/como-funciona/ciclo" },
          { text: "Estado e contexto", link: "/como-funciona/estado" },
        ],
      },
      {
        text: "Guias",
        items: [
          { text: "Dar ações ao agente (tools)", link: "/guias/tools" },
          { text: "Escolher o modelo (providers)", link: "/guias/providers" },
          { text: "Orquestrar vários agentes", link: "/guias/workflows" },
          { text: "Decidir quando o loop para", link: "/guias/parada" },
          { text: "Interceptar o fluxo (hooks)", link: "/guias/hooks" },
          { text: "Memória vetorial", link: "/guias/memoria-vetorial" },
          { text: "Sub-agente isolado", link: "/guias/sub-agente" },
          { text: "Ver o que aconteceu (report)", link: "/guias/report" },
          { text: "Limitar tempo e custo", link: "/guias/orcamento" },
        ],
      },
      {
        text: "Referência",
        items: [
          { text: "@Agent", link: "/referencia/agent" },
          { text: "@Tool", link: "/referencia/tool" },
          { text: "@Workflow", link: "/referencia/workflow" },
          { text: "ThenaConfig", link: "/referencia/config" },
          { text: "Hooks", link: "/referencia/hooks" },
          { text: "Injeção", link: "/referencia/injecao" },
          { text: "Contexto (ctx)", link: "/referencia/contexto" },
          { text: "Providers", link: "/referencia/providers" },
          { text: "Banco vetorial", link: "/referencia/vetorial" },
        ],
      },
      {
        text: "Ajuda",
        items: [{ text: "Problemas comuns", link: "/problemas-comuns" }],
      },
    ],

    socialLinks: [{ icon: "github", link: github }],

    editLink: {
      pattern: "https://github.com/thenajs/thenajs.github.io/edit/main/:path",
      text: "Sugerir mudança nesta página",
    },

    outline: { level: [2, 3], label: "Nesta página" },

    docFooter: { prev: "Anterior", next: "Próxima" },

    search: { provider: "local" },

    footer: {
      message: "Publicado sob a licença MIT.",
      copyright: `<a href="${github}">ThenaJS no GitHub</a>`,
    },

    lastUpdatedText: "Atualizado em",
    darkModeSwitchLabel: "Tema",
    returnToTopLabel: "Voltar ao topo",
    sidebarMenuLabel: "Menu",
  },
});

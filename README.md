# tAsk

tAsk is a bot-first task tracker for music and creative work. The primary interface is a
Telegram bot with an LLM agent and MCP tools; the web app provides operational views for projects,
tasks, templates, agent history, and workspace settings.

## Docs

- [Docs index](./docs/README.md)
- [Implementation roadmap](./docs/implementation-roadmap.md)
- [Product model](./docs/product-model.md)
- [Technical architecture](./docs/technical-architecture.md)
- [Data model](./docs/data-model.md)
- [Agent and MCP design](./docs/agent-mcp-design.md)

## Repository Layout

```text
apps/api          NestJS backend and OpenAPI contract
apps/web          React + Vite web app
apps/tg-bot       Telegram bot runtime
apps/mcp-server   MCP tool server
packages/api-client
packages/config
packages/domain
packages/ui
```

## Local Checks

Use `.env.example` as the complete environment variable reference. App-specific templates live in
`apps/api`, `apps/web`, `apps/tg-bot`, and `apps/mcp-server`; copy the relevant template into your
runtime environment when running a service separately.

```bash
npm install
npm run lint
npm run build
npm run test
```

When API DTOs change, regenerate and check the OpenAPI/API client contract:

```bash
npm run check:generated
```

## Project State

`graphify-out/` is committed project state. After code or docs changes, update it before committing:

```bash
graphify update . --force
```

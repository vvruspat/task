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

## Email Invitations

Workspace owners and admins can invite people from the workspace settings screen. Configure the
API with `BREVO_API_KEY`, `BREVO_TEMPLATE_ID`, and the public `WEB_APP_URL`; see
`apps/api/.env.example`. The active Brevo template must define its sender and subject and use the
`username`, `workspace_name`, and `link` parameters. The recipient must accept the one-time link
while the current application user has the invited email address.

The Brevo Developer CLI manages OAuth applications, while this server-to-server delivery path uses
a Brevo API key as recommended for direct integrations. You can verify the active CLI account and
the current OAuth scope catalog without exposing credentials:

```bash
brevo whoami --json
brevo app available-scopes --json
```

## Project State

`graphify-out/` is committed project state. After code or docs changes, update it before committing:

```bash
graphify update . --force
```

# Technical architecture

## Stack

Монорепа:

```text
turborepo
```

Backend:

```text
NestJS
TypeScript
PostgreSQL
TypeORM
OpenAPI
Scalar API reference
```

Frontend:

```text
React
Vite
TypeScript
lazy loading / route-level code splitting
generated API types from OpenAPI
```

Telegram bot:

```text
TypeScript
grammY
webhook-first deployment
```

LLM:

```text
OpenRouter
model configurable via env
tool calling through Agent Runtime + MCP tools
```

## Proposed monorepo layout

```text
apps/
  api/              # NestJS backend
  web/              # React + Vite frontend
  tg-bot/           # Telegram bot in TypeScript
  mcp-server/       # MCP server exposing safe task-tracker tools

packages/
  api-client/       # generated client/types from backend OpenAPI
  config/           # shared tsconfig/env helpers
  ui/               # copied/adapted UI kit
  domain/           # shared domain constants that are not API contracts
  test-utils/       # shared test helpers

docs/
```

## Package manager

Use regular `npm` with npm workspaces:

```text
package.json workspaces
turbo.json
```

Core commands:

```text
npm run dev
npm run build
npm run lint
npm run format
npm run test
npm run generate:openapi
npm run generate:api-client
```

## Linting and formatting

Use Biome.js as the monorepo linter and formatter.

```text
biome.json
```

Expected commands:

```text
npm run lint       # biome check
npm run format     # biome format --write
npm run lint:fix   # biome check --write
```

Biome should own formatting and common lint rules across apps and packages. Avoid adding ESLint/Prettier unless a specific framework integration forces it.

## Backend architecture

`apps/api` owns:

- authentication;
- workspaces;
- users and membership;
- projects;
- tasks and task trees;
- task skills/templates;
- comments;
- attachments;
- statuses;
- Telegram identity mapping;
- agent runs and confirmation requests;
- OpenAPI generation.

Suggested Nest modules:

```text
AuthModule
WorkspacesModule
UsersModule
ProjectsModule
TasksModule
TaskSkillsModule
AttachmentsModule
CommentsModule
TelegramModule
AgentModule
OpenApiModule
```

The backend is the only service allowed to write business data to PostgreSQL.

## Database

Use PostgreSQL with TypeORM migrations.

Rules:

- no `synchronize: true` outside local throwaway development;
- migrations are committed;
- ids are UUIDs;
- important flexible fields use `jsonb`;
- task tree uses `parent_task_id`;
- ordering uses explicit `position`;
- every workspace-scoped table has `workspace_id`;
- every mutating action writes an activity/audit event.

## OpenAPI contract

OpenAPI must be treated as the API contract.

Pragmatic implementation for NestJS:

1. Controllers and DTOs are decorated with `@nestjs/swagger`.
2. Backend generates `openapi.json`.
3. Generated spec is committed, for example:

```text
apps/api/openapi/openapi.json
```

4. CI regenerates OpenAPI and fails if the committed spec is stale.
5. Frontend, bot, and MCP client code generate types/client from that spec.
6. No hand-written duplicated API types in frontend or bot.

Scalar can expose the spec in development and staging:

```text
GET /reference
GET /openapi.json
```

Generated packages:

```text
packages/api-client
```

Good candidates:

- `openapi-typescript` for types;
- `@hey-api/openapi-ts` or `orval` for typed client/query helpers.

## Frontend architecture

`apps/web` should be a real product UI, not a landing page.

Core screens:

- project list;
- project detail;
- Kanban view;
- Matrix view;
- Table view;
- task detail drawer/page;
- task skills/templates editor;
- users/invites/settings;
- Telegram linking screen;
- agent/command history.

Recommended libraries:

- React Router or TanStack Router for route-level lazy loading;
- TanStack Query for server state;
- generated API client from OpenAPI;
- React Hook Form + Zod for forms;
- dnd-kit for Kanban drag-and-drop;
- TanStack Table for table/matrix foundations if it fits the UX.

Lazy loading rule:

- each major route is loaded as a separate chunk;
- heavy views like Matrix/Kanban load only when opened;
- task drawer and template editor can be lazy modules.

## UI kit

Target source:

```text
https://github.com/vvruspat/sci-fy-dashboard
```

Plan:

1. Copy/adapt reusable primitives into `packages/ui`.
2. Keep local ownership after copy; do not make the app depend on the source repo at runtime.
3. Normalize components around project needs:
   - buttons;
   - inputs;
   - modals;
   - drawers;
   - tables;
   - tabs;
   - badges;
   - cards for repeated items only;
   - tooltips;
   - icon buttons.

Current note: this UI kit is owned by the project author, so implementation can vendor/adapt it directly into `packages/ui` after inspecting its component structure.

## Telegram bot

Use `grammY` because it is TypeScript-first, lightweight, and works well with webhooks, middleware, sessions, inline keyboards, and Telegram Mini App flows.

Bot responsibilities:

- receive direct messages;
- receive group mentions like `@task ...`;
- receive replies with files/links;
- verify and map Telegram users;
- send requests to backend Agent API;
- show previews and confirmation buttons;
- handle confirmation callbacks;
- open Mini App links;
- never write directly to PostgreSQL.

Bot deployment should be webhook-first:

```text
Telegram -> tg-bot webhook -> backend API / agent runtime -> MCP tools -> DB
```

For local development, polling can be supported.

## Telegram Mini App

Mini App should focus on quick actions:

- my tasks;
- project overview;
- task detail;
- quick status changes;
- comments;
- file/link attachments;
- open Kanban/Matrix summary;
- ask AI.

Backend must verify Telegram `initData` before granting access.

## LLM and OpenRouter

Use OpenRouter through a small internal provider abstraction:

```text
LlmProvider
  complete()
  completeWithTools()
  stream()
```

Environment variables:

```text
OPENROUTER_API_KEY=
OPENROUTER_MODEL=
OPENROUTER_FALLBACK_MODEL=
OPENROUTER_SITE_URL=
OPENROUTER_APP_TITLE=tAsk
```

Model choice should stay configurable. As of July 6, 2026, OpenRouter exposes tool calling and structured output parameters in its Chat API, so the agent can use OpenRouter models with tool schemas. Exact model choice should be pinned after testing Russian natural-language commands, tool-call reliability, latency, and cost.

Practical starting strategy:

- cheap/default model for parsing and routine task operations;
- stronger fallback model for ambiguous multi-step edits or summaries;
- log token usage and cost per agent run;
- add evaluation fixtures for typical Russian Telegram commands.

## MCP strategy

LLM should not call backend services directly and must not touch the database.

The safe path:

```text
User message
  -> Bot/Web
  -> Agent Runtime
  -> OpenRouter model
  -> MCP tool selection
  -> MCP server
  -> Backend service layer
  -> PostgreSQL
```

MCP server can be implemented as:

- separate `apps/mcp-server` for clean protocol boundaries;
- or an internal Nest module first, with a thin MCP adapter later.

For this product, the separate app is cleaner because it keeps "tools available to LLM" explicit.

## Confirmation model

Some actions can run immediately:

- read project summary;
- list tasks;
- add a comment;
- attach a link to a clearly referenced task;
- show preview.

Actions that should require confirmation:

- create many tasks/subtasks;
- modify task skills/templates;
- delete/archive data;
- bulk update statuses or assignees;
- ambiguous fuzzy matches;
- attach files when target is unclear.

Confirmation requests are stored in DB so Telegram callbacks are reliable.

## Deployment draft

For MVP:

- API, bot, MCP server as separate Node.js processes;
- PostgreSQL;
- S3-compatible object storage for files;
- frontend as static Vite build;
- background queue later if needed.

Potential infrastructure:

- Docker Compose for local development;
- one managed Postgres;
- one S3-compatible bucket;
- deploy apps to a Node-friendly platform;
- webhook endpoint for Telegram.

## External references

- OpenRouter API docs: https://openrouter.ai/docs/api/reference/overview
- OpenRouter models API: https://openrouter.ai/api/v1/models
- Target UI kit source: https://github.com/vvruspat/sci-fy-dashboard

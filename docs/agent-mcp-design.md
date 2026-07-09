# Agent and MCP design

## Role of the agent

The LLM agent is not a chatbot bolted onto the tracker. It is the main operator of the system.

The agent should:

- understand natural-language Telegram/Web commands;
- resolve workspace, project, task, user, skill, and attachment references;
- preview risky changes;
- call MCP tools for real actions;
- explain what changed;
- ask follow-up questions only when needed.

The agent must not:

- write directly to PostgreSQL;
- invent hardcoded project/task types;
- silently perform destructive or ambiguous actions;
- trust Telegram username as identity.

## Example flow: create a song from a skill

Input:

```text
@task создай песню "моя песня 3" в альбоме "мой альбом"
```

Expected runtime:

1. Bot receives message and identifies Telegram user.
2. Backend maps `telegram_id` to internal `user_id`.
3. Backend maps Telegram chat to workspace.
4. Agent receives normalized request.
5. Agent asks tools for context:
   - possible projects matching "мой альбом";
   - possible task skills matching "песня";
   - permissions for current user.
6. Agent prepares a preview.
7. User confirms.
8. Agent calls tools to create parent task and subtasks.
9. Bot replies with concise result and link to task.

## Example flow: create a task skill

Input:

```text
@task создай шаблон "инструментал" с полями:
- Аранжировка
- Партия ударных
- Бас
```

Expected behavior:

- create a workspace-scoped task skill named "инструментал";
- store aliases if the user provides them later;
- store the ordered subtask list;
- make it available for future commands;
- require confirmation if a skill with a similar name already exists.

## Example flow: apply a skill with overrides

Input:

```text
@task создай песню "Интро" в "мой альбом", без вокала и без гитар
```

Expected behavior:

- resolve project "мой альбом";
- resolve skill "песня";
- remove matching subtasks:
  - Запись вокала;
  - Вокальная мелодия;
  - Гитара ритм;
  - Гитара соло;
- show preview;
- create after confirmation.

## Tool surface

MCP tools should be small and explicit. Do not create one giant `doEverything` tool.

### Workspace/user tools

```text
workspace.get_current
user.resolve
user.list_workspace_members
telegram.resolve_user
telegram.link_user
```

### Project tools

```text
project.search
project.get
project.create
project.update
project.archive
```

### Task tools

```text
task.search
task.get
task.create
task.update
task.move
task.add_subtasks
task.set_status
task.assign
task.archive
task.comment
```

### Task skill tools

```text
skill.search
skill.get
skill.create
skill.update
skill.clone
skill.preview_apply
skill.apply
```

### Attachment tools

```text
attachment.add_link
attachment.add_file
attachment.resolve_pending_telegram_file
attachment.list
```

### Summary tools

```text
summary.project
summary.task
summary.user
summary.workspace
```

### Confirmation tools

```text
confirmation.list_pending
confirmation.create
confirmation.get
confirmation.commit
confirmation.cancel
```

## Fuzzy resolution

The agent needs deterministic helper tools for fuzzy matching. LLM text similarity alone is not enough.

Project resolution:

```text
project.search({ query: "мой альбом", limit: 5 })
```

Skill resolution:

```text
skill.search({ query: "песня", limit: 5 })
```

If top match is confident, agent can continue to preview. If multiple matches are plausible, ask:

```text
Я нашел несколько проектов:
1. мой альбом
2. мой альбом демо
3. мой альбом 2026

Куда добавить?
```

## Preview format

Preview should be stored as structured data, not only text.

Example:

```json
{
  "kind": "apply_skill",
  "workspaceId": "uuid",
  "projectId": "uuid",
  "skillId": "uuid",
  "title": "моя песня 3",
  "subtasks": [
    { "title": "Текст Rus" },
    { "title": "Текст Eng" },
    { "title": "Вокальная мелодия" }
  ],
  "requiresConfirmation": true
}
```

Telegram can render the preview as text with buttons:

```text
[Создать] [Изменить] [Отмена]
```

Agents can use `confirmation.list_pending` to inspect outstanding confirmation requests before
rendering or resolving a confirmation flow.

## Agent run audit

Every agent request should be auditable.

Store:

- input message;
- normalized intent;
- selected model;
- tool calls;
- tool results;
- confirmation status;
- final response;
- token usage;
- cost;
- error, if any.

This makes debugging possible when the bot creates the wrong thing.

## Permissions

All MCP tools must check permissions through backend service layer.

The agent can only do what the user could do in the UI.

Examples:

- a guest can ask for summary but cannot edit templates;
- a member can create tasks but cannot invite users;
- an admin can edit workspace skills and link Telegram groups.

## Telegram files and links

The bot should capture message context:

- text;
- replied message;
- file metadata;
- Telegram `file_id`;
- external links;
- sender;
- chat;
- timestamp.

If a user sends a file with:

```text
@task прикрепи к песне "моя песня 3"
```

The agent should:

1. resolve task/project target;
2. create preview if target is ambiguous;
3. save attachment metadata;
4. optionally download file to object storage;
5. link attachment to target.

## MCP and OpenAPI

The backend OpenAPI contract and MCP tools should not drift apart.

Recommended path:

1. Backend exposes normal REST endpoints and OpenAPI.
2. MCP server calls backend services or API client.
3. Tool input/output schemas are generated or derived from the same DTO/Zod schemas where practical.
4. Tests cover important agent flows:
   - create skill;
   - apply skill;
   - apply skill with overrides;
   - attach file;
   - summary;
   - ambiguous project match.

Longer term, some MCP tools can be generated from OpenAPI, but hand-written tools are better at first because agent-facing operations should be higher-level than raw CRUD.

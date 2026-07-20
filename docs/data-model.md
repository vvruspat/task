# Data model draft

This is a first PostgreSQL/TypeORM draft. It should evolve with implementation.

## Core principle

No hardcoded project/task types.

The database stores generic projects, task trees, task skills/templates, users, attachments, comments, statuses, and agent activity.

## Tables

### workspaces

```text
id uuid pk
name text not null
slug text not null unique
created_at timestamptz not null
updated_at timestamptz not null
```

### users

```text
id uuid pk
display_name text not null
email text null
avatar_url text null
created_at timestamptz not null
updated_at timestamptz not null
```

### workspace_members

```text
id uuid pk
workspace_id uuid fk workspaces.id
user_id uuid fk users.id
role text not null             # owner | admin | member | guest
created_at timestamptz not null
updated_at timestamptz not null

unique(workspace_id, user_id)
```

### telegram_identities

```text
id uuid pk
user_id uuid fk users.id
telegram_id bigint not null unique
telegram_username text null
first_name text null
last_name text null
linked_at timestamptz not null
last_seen_at timestamptz null
```

### telegram_chats

```text
id uuid pk
workspace_id uuid fk workspaces.id
telegram_chat_id bigint not null unique
title text null
default_project_id uuid null fk projects.id
linked_by_user_id uuid fk users.id
created_at timestamptz not null
updated_at timestamptz not null
```

### invites

```text
id uuid pk
workspace_id uuid fk workspaces.id
invited_user_id uuid null fk users.id
token_hash text not null unique
role text not null
expires_at timestamptz not null
used_at timestamptz null
created_by_user_id uuid fk users.id
created_at timestamptz not null
```

### projects

```text
id uuid pk
workspace_id uuid fk workspaces.id
title text not null
description text null
status text null
position numeric null
created_by_user_id uuid fk users.id
archived_at timestamptz null
created_at timestamptz not null
updated_at timestamptz not null
```

### statuses

Workspace-scoped statuses, so the user can keep the Excel-style semantics.

```text
id uuid pk
workspace_id uuid fk workspaces.id
name text not null             # Нет | В процессе | Готово | Заблокировано
color text not null            # hex or token
position numeric not null
is_done boolean not null default false
created_at timestamptz not null
updated_at timestamptz not null

unique(workspace_id, name)
```

### tasks

Tasks form a tree. A "song" is simply a parent task created through a skill.

```text
id uuid pk
workspace_id uuid fk workspaces.id
project_id uuid fk projects.id
parent_task_id uuid null fk tasks.id
title text not null
description text null
status_id uuid null fk statuses.id
assignee_user_id uuid null fk users.id
created_by_user_id uuid fk users.id
position numeric not null
due_at timestamptz null
source_skill_id uuid null fk task_skills.id
source_skill_version_id uuid null fk task_skill_versions.id
metadata jsonb not null default '{}'
archived_at timestamptz null
created_at timestamptz not null
updated_at timestamptz not null
```

Useful indexes:

```text
(workspace_id, project_id)
(workspace_id, parent_task_id)
(workspace_id, status_id)
(workspace_id, assignee_user_id)
gin(metadata)
```

### task_skills

Task skills/templates are workspace-scoped.

```text
id uuid pk
workspace_id uuid fk workspaces.id
name text not null
description text null
aliases text[] not null default '{}'
created_by_user_id uuid fk users.id
archived_at timestamptz null
created_at timestamptz not null
updated_at timestamptz not null

unique(workspace_id, name)
```

### task_skill_versions

Versioning matters because old tasks should keep a record of the skill version used to create them.

```text
id uuid pk
workspace_id uuid fk workspaces.id
task_skill_id uuid fk task_skills.id
version int not null
definition jsonb not null
created_by_user_id uuid fk users.id
created_at timestamptz not null

unique(task_skill_id, version)
```

Example `definition`:

```json
{
  "version": 1,
  "subtasks": [
    {
      "title": "Текст Rus",
      "optional": false,
      "description": null,
      "labels": []
    },
    {
      "title": "Гитара соло",
      "optional": true,
      "description": null,
      "labels": ["instrument"]
    }
  ]
}
```

### comments

```text
id uuid pk
workspace_id uuid fk workspaces.id
task_id uuid fk tasks.id
author_user_id uuid fk users.id
parent_comment_id uuid nullable fk comments.id
mentioned_user_ids uuid[] not null default '{}'
body text not null
created_at timestamptz not null
updated_at timestamptz not null
```

### attachments

Attachments can point to a task, project, comment, or later another entity.

```text
id uuid pk
workspace_id uuid fk workspaces.id
target_type text not null       # task | project | comment
target_id uuid not null
kind text not null              # file | link | telegram_file
title text null
url text null
storage_key text null
telegram_file_id text null
mime_type text null
size_bytes bigint null
created_by_user_id uuid fk users.id
created_at timestamptz not null
```

Useful index:

```text
(workspace_id, target_type, target_id)
```

### activity_events

```text
id uuid pk
workspace_id uuid fk workspaces.id
actor_user_id uuid null fk users.id
event_type text not null
entity_type text not null
entity_id uuid not null
payload jsonb not null default '{}'
created_at timestamptz not null
```

### agent_runs

```text
id uuid pk
workspace_id uuid fk workspaces.id
user_id uuid fk users.id
source text not null            # telegram | web | mini_app
source_message_id text null
model text null
input_text text not null
normalized_intent jsonb null
final_response text null
status text not null            # running | waiting_confirmation | completed | failed
token_usage jsonb null
cost jsonb null
error text null
created_at timestamptz not null
updated_at timestamptz not null
```

### agent_tool_calls

```text
id uuid pk
agent_run_id uuid fk agent_runs.id
tool_name text not null
arguments jsonb not null
result jsonb null
status text not null            # pending | success | error
error text null
created_at timestamptz not null
completed_at timestamptz null
```

### confirmation_requests

```text
id uuid pk
workspace_id uuid fk workspaces.id
agent_run_id uuid fk agent_runs.id
user_id uuid fk users.id
kind text not null
preview jsonb not null
status text not null            # pending | confirmed | cancelled | expired
expires_at timestamptz not null
created_at timestamptz not null
updated_at timestamptz not null
```

## Open questions

- Whether task labels are needed in MVP or can wait.
- Whether Matrix view needs a first-class `matrix_view_settings` table or can derive rows dynamically from tasks.
- Whether files should be copied from Telegram to object storage immediately or lazily on first access.
- Whether task skill definitions should stay JSONB-only or get normalized child tables after the editor becomes complex.

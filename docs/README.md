# tAsk docs

Документация фиксирует текущую концепцию продукта и техническое направление.

## Документы

- [Product model](./product-model.md) - что именно строим: музыкальный task tracker без жестких типов проектов и задач.
- [Technical architecture](./technical-architecture.md) - стек, структура turborepo, backend/frontend/bot/MCP/LLM.
- [Implementation roadmap](./implementation-roadmap.md) - текущий прогресс, оставшиеся фазы MVP и следующие задачи.
- [Agent and MCP design](./agent-mcp-design.md) - как Telegram-бот и LLM создают проекты, задачи, шаблоны, файлы и summary через MCP tools.
- [Data model draft](./data-model.md) - черновая модель PostgreSQL/TypeORM.

## Главная идея

Система должна быть bot-first task tracker'ом для музыкальных и креативных проектов.

Пользователь пишет в Telegram или в веб-интерфейсе обычным языком:

```text
@task добавь песню "моя песня 3" в альбом "мой альбом"
```

LLM не должна иметь магические hardcoded-типы вроде `album` или `song`. Вместо этого она смотрит на проекты, задачи и пользовательские task skills/templates внутри workspace:

- проект - обычный контейнер;
- задача - дерево задач и сабтасок;
- task skill/template - способ быстро создать дерево задач;
- LLM agent - диспетчер, который выбирает подходящий skill, показывает preview и вызывает MCP tools;
- MCP tools - безопасный слой для реальных изменений в системе.

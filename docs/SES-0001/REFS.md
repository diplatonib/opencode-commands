# Ссылки и референсы сессии SES-0001

Извлечено из сессии «Создание плагина opencode-commands».

## Исходный код opencode

| Файл | Контекст |
|------|----------|
| [`packages/opencode/src/cli/cmd/stats.ts`](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/cli/cmd/stats.ts) | `--project ""` = текущий проект (`projectFilter === ""` → `session.projectID === currentProject.id`) |
| [`packages/opencode/src/cli/cmd/export.ts`](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/cli/cmd/export.ts) | CLI `opencode export` — только JSON, флаги `--sanitize`, `--pure`, `--print-logs` |
| [`packages/opencode/src/command/index.ts`](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/command/index.ts) | Серверный реестр команд: `init`, `review` + пользовательские + MCP + скиллы. `/export` здесь нет |
| [`packages/opencode/src/cli/cmd/run.ts`](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/cli/cmd/run.ts) | `opencode run --command <name>` dispatch в серверный реестр; `-c`/`--continue`, `-s`/`--session` |
| [`packages/opencode/src/cli/cmd/tui.ts`](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/cli/cmd/tui.ts) | TUI entry point |

## Документация opencode

| Ссылка | Контекст |
|--------|----------|
| [opencode.ai/docs/tui](https://opencode.ai/docs/tui) | Встроенные TUI-команды: `/export` (Markdown → $EDITOR), `/init`, `/undo`, `/redo`, `/share`, `/help` |
| [opencode.ai/docs/plugins](https://opencode.ai/docs/plugins/) | Структура плагинов, хуки `config`, `experimental.chat.system.transform` |
| [opencode.ai/docs/skills](https://opencode.ai/docs/skills/) | Skills discovery: `**/SKILL.md` в `cfg.skills.paths` |
| [opencode.ai/docs/commands](https://opencode.ai/docs/commands/) | Slash-команды: frontmatter `description` + тело промпта |

## Референсы-вдохновители

| Ссылка | Контекст |
|--------|----------|
| [obra/superpowers](https://github.com/obra/superpowers) | Паттерн: инъекция bootstrap-контекста, авто-регистрация каталога скиллов |
| [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail) | Паттерн: npm-плагин, парсер frontmatter (`ponytail-frontmatter.cjs`), регистрация команд |
| `foundation.ts` (локальный) | Паттерн: инъекция правил в системный промпт через `<RULE>`/`<FOUNDATION_RULES>`, хук `experimental.chat.system.transform` |

## Инструменты и скиллы

| Ссылка | Контекст |
|--------|----------|
| [luongnv89/skills](https://github.com/luongnv89/skills.git) | Источник скилла `opencode-runner` (автор Luong NGUYEN, MIT) |
| `npx skills add -y https://github.com/luongnv89/skills.git --skill opencode-runner --agent opencode` | Установка скилла в `.agents/skills/`, генерирует `skills-lock.json` |

## Статьи

| Ссылка | Контекст |
|--------|----------|
| [How to Reduce opencode Token Usage](https://tokenade.net/en/articles/reduce-opencode-token-usage) | Разбор флагов `opencode stats`, созвучно с командой `/usage` |

## Ключевые выводы

- `/export` — **клиентская TUI-команда**, формирует Markdown на стороне TUI и открывает в `$EDITOR`. Через `opencode run --command export` не вызывается (нет в серверном реестре).
- `opencode run --command <name>` — способ неинтерактивного вызова slash-команд (серверный реестр: `init`, `review`, скиллы, пользовательские команды).
- `opencode stats --project ""` — официальный способ «текущий проект».
- Node 22.18 не делает type-stripping для `.ts` под `node_modules` (`ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`) — поэтому реализация плагина в `.mjs`.
- `npm link` создаёт `node_modules`-раскладку, после чего работает `opencode plugin @diplatonib/opencode-commands` и инлайновая спека в конфиге.

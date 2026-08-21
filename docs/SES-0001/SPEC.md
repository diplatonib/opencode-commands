# ПЛАН: репозиторий `@diplatonib/opencode-commands`

## 1. Цель

Плагин для opencode: npm-пакет, который поставляет slash-команды (первая —
`/usage`, обёртка над `opencode stats`) и скилл `opencode-runner`, с
авто-регистрацией через хук `config`. Все документы и комментарии — на русском.
Без инструментов сборки.

## 2. Зафиксированные решения

| Вопрос            | Решение                                                               |
|-------------------|-----------------------------------------------------------------------|
| Имя пакета        | `@diplatonib/opencode-commands`                                       |
| Точка входа       | `.opencode/plugins/commands.ts`                                       |
| Layout            | npm + `.opencode/{commands,skills}`                                   |
| Парсер команд     | отдельный модуль `.opencode/plugins/frontmatter.mjs` (паттерн ponytail — избегаем legacy-загрузчика функций) |
| `/usage` дефолты  | текущий проект (`--project` без значения) + `--days 7`; флаги пользователя переопределяют (yargs — последний флаг) |
| Скиллы            | бандл `opencode-runner` из `~/.agents/skills/opencode-runner/` |
| Правила           | TODO-заглушка: закомментированный хук `experimental.chat.system.transform` |
| Установка в README| `opencode plugin [options]` + ручной `opencode.json(c)` + git-репозиторий |
| Тесты             | `node --test` в tmp-каталоге с моками; `.ts` грузится через `--experimental-strip-types` (проверено на node 22.18) |
| Репозиторий       | новый каталог `~/Experiments/opencode-commands`, remote `git@github.com:diplatonib/opencode-commands.git` |

## 3. Структура репозитория

```
opencode-commands/
├── SPEC.md
├── package.json
├── README.md
├── LICENSE                        # MIT
├── .gitignore
├── .opencode/
│   ├── plugins/
│   │   ├── commands.ts            # точка входа плагина (типизированная)
│   │   ├── commands.mjs           # реализация плагина (см. решение ниже)
│   │   └── frontmatter.mjs        # parseCommand(content)
│   ├── commands/
│   │   └── usage.md               # /usage
│   └── skills/
│       └── opencode-runner/       # копия: SKILL.md, references/, docs/, evals/
└── tests/
    ├── frontmatter.test.mjs
    └── install.test.mjs
```

## 4. Содержимое файлов

### 4.1 `package.json`

```json
{
  "name": "@diplatonib/opencode-commands",
  "version": "0.1.0",
  "description": "Плагин для opencode: slash-команды и скиллы",
  "keywords": ["opencode", "opencode-plugin", "commands", "skills"],
  "license": "MIT",
  "type": "module",
  "main": "./.opencode/plugins/commands.ts",
  "exports": {
    ".": "./.opencode/plugins/commands.ts",
    "./plugin": "./.opencode/plugins/commands.ts",
    "./server": "./.opencode/plugins/commands.ts"
  },
  "files": [".opencode/", "README.md", "LICENSE"],
  "scripts": { "test": "node --test --experimental-strip-types tests/" },
  "publishConfig": { "access": "public" },
  "repository": { "type": "git", "url": "git+https://github.com/diplatonib/opencode-commands.git" }
}
```

`exports["./server"]` + `main` → `opencode plugin` находит серверный таргет и
патчит конфиг.

### 4.2 `.gitignore`

```
node_modules/
*.log
.idea/
.DS_Store
```

### 4.3 `.opencode/plugins/frontmatter.mjs`

```js
export function parseCommand(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/)
  if (!match) return null
  const description = match[1].match(/description:\s*(.+)/)?.[1]?.trim()
  return { description, template: match[2].trim() }
}
```

### 4.4 `.opencode/plugins/commands.mjs` + `commands.ts`

Реализация плагина вынесена в `commands.mjs`: Node не делает type-stripping
для `.ts` под `node_modules`, поэтому тесты (node --test) должны импортировать
реализацию из `.mjs`. `commands.ts` — типизированная точка входа:

```ts
import commands from "./commands.mjs"
import type { Plugin } from "@opencode-ai/plugin"

export default commands satisfies Plugin
```

`commands.mjs`:

```js
import { readdirSync, readFileSync } from "node:fs"
import { join, basename, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { parseCommand } from "./frontmatter.mjs"

const __dirname = dirname(fileURLToPath(import.meta.url))
const commandsDir = join(__dirname, "..", "commands")
const skillsDir = join(__dirname, "..", "skills")

export default async function commandsPlugin() {
  return {
    config: async (cfg) => {
      cfg.command = cfg.command ?? {}
      for (const file of readdirSync(commandsDir).filter((f) => f.endsWith(".md"))) {
        const name = basename(file, ".md")
        const parsed = parseCommand(readFileSync(join(commandsDir, file), "utf8"))
        if (parsed) cfg.command[name] = parsed
      }
      cfg.skills = cfg.skills ?? {}
      cfg.skills.paths = cfg.skills.paths ?? []
      if (!cfg.skills.paths.includes(skillsDir)) cfg.skills.paths.push(skillsDir)
    },
    // TODO(правила): внедрение фундаментальных правил в системный промпт (по образцу foundation.ts)
    // "experimental.chat.system.transform": async (_input, output) => {
    //   // собрать rules/**/RULE.md и добавить в output.system как <FOUNDATION_RULES>
    // },
  }
}
```

### 4.5 `.opencode/commands/usage.md`

```markdown
---
description: Статистика токенов и стоимости по текущему проекту (opencode stats)
---

Статистика использования токенов и стоимости по текущему проекту:

!`opencode stats --models --project --days 7 $ARGUMENTS`

Представь результат на русском: кратко перечисли ключевые метрики
(сессии, токены, стоимость, топ инструментов и моделей). По умолчанию —
текущий проект за последние 7 дней; переданные флаги (`--days [<num>]`,
`--tools [<num>]`, `--models [<num>]`, `--project [<id>]`) переопределяют
дефолты.
```

Механика: `--project` без значения (пустая строка) = текущий проект (проверено
в исходниках opencode: `projectFilter === ""` → `session.projectID ===
currentProject.id`, и запуском `opencode stats --days 1 --project ""`). yargs
берёт последний флаг → `/usage --days 30` переопределяет `--days 7`.

### 4.6 `.opencode/skills/opencode-runner/`

Полная копия `~/.agents/skills/opencode-runner/` (`cp -r`):
`SKILL.md`, `references/expected-output.md`, `docs/README.md`,
`evals/evals.json`. Автор в frontmatter: `Luong NGUYEN`.

### 4.7 `README.md` (разделы)

1. Заголовок/описание — плагин `@diplatonib/opencode-commands`: slash-команды
   и скиллы для opencode.
2. Возможности — авто-регистрация команд из `.opencode/commands/*.md`;
   подключение `.opencode/skills`; TODO-хук правил.
3. Установка:
   ```
   # из npm (после публикации)
   opencode plugin @diplatonib/opencode-commands
   opencode plugin @diplatonib/opencode-commands --global   # в глобальный конфиг
   opencode plugin @diplatonib/opencode-commands --force    # переустановить
   ```
   или вручную в `opencode.json(c)`:
   ```json
   { "plugin": ["@diplatonib/opencode-commands"] }
   ```
   или из git-репозитория `git@github.com:diplatonib/opencode-commands.git`:
   ```json
   { "plugin": ["./opencode-commands/.opencode/plugins/commands.ts"] }
   ```
   (плюс упоминание inline-спеки
   `opencode plugin git@github.com:diplatonib/opencode-commands.git` — помечаем
   «проверить после пуша»).
4. Структура репозитория — tree из п.3.
5. Команды — таблица: `/usage` | Статистика токенов и стоимости по текущему
   проекту. Подробный раздел `/usage`: поведение дефолтов, флаги `opencode
   stats` (`--days`, `--tools`, `--models`, `--project`), как переопределить.
6. Скиллы — `opencode-runner`: делегирование задач бесплатным облачным
   моделям; происхождение (из `~/.agents/skills/opencode-runner`, автор Luong
   NGUYEN).
7. Разработка — как добавить команду (файл в `.opencode/commands/*.md` с
   frontmatter `description` + тело с `$ARGUMENTS`/`!`); как добавить скилл
   (`SKILL.md` в `.opencode/skills/<name>/`); тесты: `npm test` (нужен node ≥
   22.7, работает через `--experimental-strip-types`).
8. Вдохновение и ссылки:
   - [superpowers](https://github.com/obra/superpowers) — авто-подключение
     скиллов и внедрение контекста;
   - [ponytail](https://github.com/DietrichGebert/ponytail) — npm-плагин:
     регистрация команд и скиллов;
   - `foundation.ts` — локальный референс внедрения правил
     `<RULE>/<FOUNDATION_RULES>` (TODO-хук);
   - [How to Reduce opencode Token Usage](https://tokenade.net/en/articles/reduce-opencode-token-usage)
     — статья о снижении расхода токенов и флагах `opencode stats`
     (созвучно с `/usage`).
9. Лицензия — MIT.

### 4.8 `LICENSE` — MIT, автор `diplatonib`.

### 4.9 `tests/frontmatter.test.mjs` (чистый `node --test`)

Тесты `parseCommand`: обычный файл (description + template), CRLF (`\r\n`),
отсутствие frontmatter → `null`.

### 4.10 `tests/install.test.mjs` (`node --test`)

- `repoRoot` определяется от `import.meta.url`.
- Хелпер `makeFixture(kind)`: `mkdtempSync` в `os.tmpdir()`; `cpSync` реальных
  `.opencode/` и `package.json` из репо; пишет `opencode.json`; возвращает
  `{ project, dest, entry }`.
- Сценарий A (npm): файлы в `tmp/<project>/node_modules/@diplatonib/opencode-commands/`;
  `opencode.json` = `{"plugin": ["@diplatonib/opencode-commands"]}`.
- Сценарий B (git/локальный клон): файлы в `tmp/<project>/opencode-commands/`;
  `opencode.json` = `{"plugin": ["./opencode-commands/.opencode/plugins/commands.ts"]}`.
- Для каждого: `import(pathToFileURL(entry))` (entry — `commands.mjs`, чтобы
  Node мог загрузить файл и из-под node_modules) → `mod.default(mockCtx)` →
  `hooks.config(mockCfg)`.
- Моки: `mockCtx = { worktree: project, directory: project, project: {},
  client: {}, $: {} }`; `mockCfg = { command: {}, skills: {} }`.
- Проверки: `cfg.command.usage` зарегистрирован; `description` непустой;
  `template` содержит `opencode stats`, `--project`, `--days 7`, `--models`;
  `cfg.skills.paths` — ровно 1 путь (`<dest>/.opencode/skills`), в нём существует
  `opencode-runner/SKILL.md`.
- Уборка: `after()` → `rmSync` всех tmp-каталогов.

Запуск тестов: `node --test tests/*.test.mjs` (glob — node 22.18 не сканирует
каталог, переданный позиционным аргументом).

## 5. Шаги реализации (порядок)

1. Создать `~/Experiments/opencode-commands/`; `git init -b main`;
   `git remote add origin git@github.com:diplatonib/opencode-commands.git`.
2. Записать `SPEC.md`, `package.json`, `.gitignore`, `LICENSE`.
3. Записать `frontmatter.mjs`, `commands.ts`, `usage.md`.
4. Скопировать скилл:
   `cp -r ~/.agents/skills/opencode-runner .opencode/skills/opencode-runner`.
5. Записать `tests/frontmatter.test.mjs`, `tests/install.test.mjs`.
6. Написать `README.md`.
7. `npm test` — все тесты зелёные.
8. `git add -A && git commit` (сообщение на русском, напр.
   `первичный каркас плагина @diplatonib/opencode-commands`; без push).

## 6. Проверка (verification)

- `npm test` проходит (node 22.18).
- Ручная проверка в каталоге репо: `opencode` видит `/usage` и скилл
  (авто-обнаружение `.opencode/`).
- Ручной тест `/usage` в рабочем проекте: без аргументов →
  `opencode stats --project --days 7`; с `--days 30` → переопределение.
- Проверить подстановку `$ARGUMENTS` внутри `!`-макроса; запасной вариант —
  шаблон, где модель сама запускает `opencode stats` через bash.

## 7. Риски / открытые вопросы

- `opencode plugin git@github.com:...` (inline git-спека) — проверяется после
  пуша; в README уже есть гарантированный вариант «клон + локальный путь».
- Строгость `satisfies Plugin` при мутации `cfg` — сборки нет, но при желании
  запустить `tsc --noEmit` может потребоваться приведение типов (не блокирует).

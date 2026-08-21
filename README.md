# @diplatonib/opencode-commands

Плагин для [opencode](https://opencode.ai): поставляет slash-команды и скиллы.
Плагин сам регистрирует команды из `.opencode/commands/*.md` и подключает
каталог скиллов — после установки ничего дополнительно настраивать не нужно.

## Возможности

- Авто-регистрация slash-команд из `.opencode/commands/*.md` (парсер frontmatter).
- Подключение каталога скиллов `.opencode/skills` в конфиг opencode.
- Расширяемость: новые команды и скиллы добавляются обычными markdown-файлами.

## Установка

Плагин можно установить через CLI, вписать в конфиг вручную или подключить из
git-репозитория.

### Через `opencode plugin`

Пакет **не опубликован в npm** — установка по имени пакета не работает:

```bash
opencode plugin @diplatonib/opencode-commands   # ✗ 404 Not Found
```

Для установки используйте git-URL:

```bash
opencode plugin git@github.com:diplatonib/opencode-commands.git
```

Полезные флаги:

| Флаг            | Описание                                                        |
|-----------------|-----------------------------------------------------------------|
| `--global`, `-g`| Установить в глобальный конфиг (`~/.config/opencode/opencode.json`) |
| `--force`, `-f` | Переустановить, заменив существующую версию                      |

Примеры:

```bash
opencode plugin git@github.com:diplatonib/opencode-commands.git --global
opencode plugin git@github.com:diplatonib/opencode-commands.git --force
```

### Через `npm link` (для разработки)

`npm link` создаёт глобальный симлинк на пакет — после этого работает и
`opencode plugin @diplatonib/opencode-commands`, и инлайновая спека
`"@diplatonib/opencode-commands"` в конфиге:

```bash
git clone git@github.com:diplatonib/opencode-commands.git
cd opencode-commands
npm link
```

После этого в любом проекте:

```bash
opencode plugin @diplatonib/opencode-commands --global
```

Или в `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@diplatonib/opencode-commands"]
}
```

Для отвязки:

```bash
npm unlink -g @diplatonib/opencode-commands
```

### Вручную в `opencode.json(c)`

Добавьте пакет в массив `plugin`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["git@github.com:diplatonib/opencode-commands.git"]
}
```

### Из git-репозитория

Репозиторий: `git@github.com:diplatonib/opencode-commands.git`.

Склонируйте его и укажите локальный путь к точке входа плагина:

```bash
git clone git@github.com:diplatonib/opencode-commands.git
```

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["./opencode-commands/.opencode/plugins/commands.ts"]
}
```

Inline-спека из git также принимается (проверить после публикации репозитория):

```bash
opencode plugin git@github.com:diplatonib/opencode-commands.git
```

После любых изменений конфигурации перезапустите opencode — конфиг читается
один раз при старте.

## Структура репозитория

```
opencode-commands/
├── package.json
├── README.md
├── LICENSE                        # MIT
├── .opencode/
│   ├── plugins/
│   │   ├── commands.ts            # точка входа плагина (типизированная)
│   │   └── internals/
│   │       ├── commands.mjs       # реализация плагина
│   │       └── frontmatter.mjs    # парсер frontmatter команд
│   ├── commands/
│   │   └── usage.md               # /usage
│   └── skills/
│       └── opencode-runner/       # бандл скилла opencode-runner
└── tests/
    ├── frontmatter.test.mjs
    └── install.test.mjs
```

## Команды

| Команда   | Описание                                                        |
|-----------|-----------------------------------------------------------------|
| `/usage`  | Статистика токенов и стоимости по текущему проекту (обёртка над `opencode stats`) |

### `/usage`

Обёртка над CLI `opencode stats [options]` с макросом
`!`opencode stats --models --project --days 7 $ARGUMENTS`` — вывод `opencode stats`
внедряется прямо в промпт, а модель кратко интерпретирует его на русском.

Поведение по умолчанию:

- **Текущий проект** — `--project` без значения означает «текущий проект» (фильтр по
  проекту, в котором запущен opencode);
- **Последние 7 дней** — `--days 7`.

Флаги `opencode stats` можно передавать через аргументы команды; переданный
флаг переопределяет дефолт:

```bash
/usage                        # текущий проект за 7 дней
/usage --days 30              # текущий проект за 30 дней
/usage --tools 5              # показать топ-5 инструментов
/usage --models               # разбивка по моделям
/usage --project <id>         # конкретный проект вместо текущего
```

Доступные флаги `opencode stats`:

| Флаг             | Описание                                                        |
|------------------|-----------------------------------------------------------------|
| `--days N`       | Статистика за последние N дней (по умолчанию — за всё время)    |
| `--tools N`      | Количество показываемых инструментов (по умолчанию — все)       |
| `--models [N]`   | Разбивка по моделям (скрыта по умолчанию); N — топ моделей      |
| `--project <id>` | Фильтр по проекту; пустая строка — текущий проект                |

Примечание: так как макрос всегда подставляет фильтр проекта, показать
одновременно все проекты через `/usage` нельзя — укажите конкретный проект
флагом `--project <id>`.

## Скиллы

Плагин подключает каталог `.opencode/skills`, поэтому скиллы из него доступны
после установки.

| Скилл              | Описание                                                                 |
|--------------------|--------------------------------------------------------------------------|
| `opencode-runner`  | Делегирование задач opencode бесплатным облачным моделям с мониторингом и очисткой процессов |

Скилл `opencode-runner` упакован из `~/.agents/skills/opencode-runner` (автор —
Luong NGUYEN, лицензия MIT), происхождение сохранено во frontmatter `SKILL.md`.

## Разработка

### Как добавить команду

Создайте файл `.opencode/commands/<имя>.md` с frontmatter `description` и телом
промпта:

```markdown
---
description: Краткое описание команды
---

Промпт команды. $ARGUMENTS — всё, что введено после /имя.
```

### Как добавить скилл

Создайте каталог `.opencode/skills/<имя>/SKILL.md` со frontmatter `name` и
`description`. Плагин подключит каталог автоматически.

### Тесты

```bash
npm test
```

Тесты покрывают два сценария установки (npm-раскладка `node_modules` и
локальный клон git) и выполняются в tmp-каталоге с моками конфига и контекста.
Реализация плагина лежит в `.mjs`, поэтому тестам не нужна сборка или флаги
типизации. Для запуска нужен Node.js ≥ 18 (встроенный test-runner).

## TODO

- **Фильтр импортируемых модулей** — поддержка объекта с `include` в массиве
  `plugin` для гранулярной настройки того, что регистрирует плагин:

  ```json
  {
    "plugin": [
      "git@github.com:diplatonib/opencode-commands.git",
      { "include": "*" }
    ]
  }
  ```

  Возможные значения `include`: `"*"` (все модули), `"commands"`, `"skills"`,
  или массив `["commands", "usage"]` для выборочной регистрации. По умолчанию
  — `"*"` (совместимость с текущим поведением).

- **Внедрение фундаментальных правил** в системный промпт
  (хук `experimental.chat.system.transform` по образцу `foundation.ts`).

- **CONTRIBUTING.md** — как внести вклад, dev-сетап, ветвление от `main`,
  Conventional Commits, процесс PR, стандарты кода и требования к тестам.

- **docs/** — `ARCHITECTURE.md` (структура плагина, зачем `internals/`) и
  `CHANGELOG.md` (история версий).

  Оба пункта — из чеклиста скилла `~/.agents/skills/oss-ready/SKILL.md`.

## Вдохновение и ссылки

- [obra/superpowers](https://github.com/obra/superpowers) — паттерн
  авто-подключения каталога скиллов и внедрения контекста (вдохновение для
  `.opencode/skills`).
- [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail) — паттерн
  npm-плагина с регистрацией команд и скиллов (вдохновение для
  `.opencode/plugins` и парсера frontmatter).
- `foundation.ts` — локальный референс внедрения правил в системный промпт через
  `<RULE>`/`<FOUNDATION_RULES>` (TODO-хук в `commands.ts`).
- [How to Reduce opencode Token Usage](https://tokenade.net/en/articles/reduce-opencode-token-usage)
  — статья о снижении расхода токенов в opencode и разборе флагов
  `opencode stats` (созвучно с командой `/usage`).

## Лицензия

[MIT](LICENSE).

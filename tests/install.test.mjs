import { test, after } from "node:test"
import assert from "node:assert/strict"
import { mkdtempSync, rmSync, cpSync, writeFileSync, existsSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, dirname } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..")
const PACKAGE_NAME = "@diplatonib/opencode-commands"

const cleaned = []
after(() => {
  for (const dir of cleaned) rmSync(dir, { recursive: true, force: true })
})

// Создаёт tmp-проект с реальными файлами плагина в одной из раскладок:
//   npm  — файлы в node_modules/@diplatonib/opencode-commands (сценарий npm-установки)
//   git  — файлы в <project>/opencode-commands (сценарий локального клона/git-репозитория)
function makeFixture(kind) {
  const project = mkdtempSync(join(tmpdir(), "oc-commands-"))
  cleaned.push(project)

  const dest =
    kind === "npm"
      ? join(project, "node_modules", "@diplatonib", "opencode-commands")
      : join(project, "opencode-commands")

  cpSync(join(repoRoot, ".opencode"), join(dest, ".opencode"), { recursive: true })
  cpSync(join(repoRoot, "package.json"), join(dest, "package.json"))

  const spec =
    kind === "npm"
      ? PACKAGE_NAME
      : "./opencode-commands/.opencode/plugins/commands.ts"

  writeFileSync(
    join(project, "opencode.json"),
    JSON.stringify({ $schema: "https://opencode.ai/config.json", plugin: [spec] }, null, 2),
  )

  return { project, dest, entry: join(dest, ".opencode", "plugins", "internals", "commands.mjs") }
}

const scenarios = [
  { name: "npm (node_modules)", kind: "npm" },
  { name: "git-клон (локальный путь)", kind: "git" },
]

for (const { name, kind } of scenarios) {
  test(`регистрация команд и скиллов — ${name}`, async () => {
    const { project, dest, entry } = makeFixture(kind)

    // Моки контекста плагина и конфига opencode.
    const mockCtx = {
      worktree: project,
      directory: project,
      project: {},
      client: {},
      $: {},
    }
    const mockCfg = { command: {}, skills: {} }

    const mod = await import(pathToFileURL(entry).href)
    assert.equal(typeof mod.default, "function", "default экспорт должен быть функцией плагина")

    const hooks = await mod.default(mockCtx)
    assert.equal(typeof hooks.config, "function", "плагин должен регистрировать хук config")

    await hooks.config(mockCfg)

    // Команда /usage зарегистрирована и содержит ожидаемый макрос.
    assert.ok(mockCfg.command.usage, "команда usage не зарегистрирована")
    assert.ok(mockCfg.command.usage.description?.length > 0, "описание команды пустое")
    assert.match(mockCfg.command.usage.template, /opencode stats/)
    assert.match(mockCfg.command.usage.template, /--project/)
    assert.match(mockCfg.command.usage.template, /--days 7/)
    assert.match(mockCfg.command.usage.template, /--models/)

    // Каталог скиллов подключён ровно один раз и указывает внутрь сценария.
    assert.equal(mockCfg.skills.paths.length, 1, "ожидался ровно один путь скиллов")
    const skillsDir = mockCfg.skills.paths[0]
    assert.ok(
      skillsDir === join(dest, ".opencode", "skills"),
      `неожиданный путь скиллов: ${skillsDir}`,
    )
    assert.ok(
      existsSync(join(skillsDir, "opencode-runner", "SKILL.md")),
      "скилл opencode-runner не найден в каталоге скиллов",
    )
  })
}

test("не дублирует уже подключённый путь скиллов", async () => {
  const { dest, entry } = makeFixture("git")
  const mod = await import(pathToFileURL(entry).href)
  const hooks = await mod.default({ worktree: "", directory: "" })

  const skillsDir = join(dest, ".opencode", "skills")
  const mockCfg = { command: {}, skills: { paths: [skillsDir] } }
  await hooks.config(mockCfg)

  assert.equal(mockCfg.skills.paths.length, 1, "путь скиллов продублирован")
})

test("не затирает уже зарегистрированные команды", async () => {
  const { entry } = makeFixture("git")
  const mod = await import(pathToFileURL(entry).href)
  const hooks = await mod.default({ worktree: "", directory: "" })

  const mockCfg = { command: { existing: { description: "моя", template: "тело" } }, skills: {} }
  await hooks.config(mockCfg)

  assert.ok(mockCfg.command.existing, "пользовательская команда затёрта")
  assert.ok(mockCfg.command.usage, "команда usage не зарегистрирована")
})

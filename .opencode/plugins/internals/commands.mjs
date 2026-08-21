import { readdirSync, readFileSync } from "node:fs"
import { join, basename, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { parseCommand } from "./frontmatter.mjs"

const __dirname = dirname(fileURLToPath(import.meta.url))
const commandsDir = join(__dirname, "..", "..", "commands")
const skillsDir = join(__dirname, "..", "..", "skills")

// Реализация плагина вынесена в .mjs, чтобы тесты (node --test) могли
// импортировать её из любой раскладки, включая node_modules — Node не делает
// type-stripping для .ts под node_modules. Точка входа commands.ts оборачивает
// эту функцию и остаётся типизированной.
export default async function commandsPlugin() {
  return {
    // Регистрация slash-команд и каталога скиллов при инициализации конфига.
    // Пути считаются относительно самого плагина, поэтому пакет работает и из
    // node_modules, и из локального клона репозитория.
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

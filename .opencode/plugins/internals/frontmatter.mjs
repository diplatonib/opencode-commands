// Парсер frontmatter файлов slash-команд opencode.
//
// Вынесен в отдельный модуль (паттерн ponytail-frontmatter.cjs): legacy-загрузчик
// opencode воспринимает каждую функцию, экспортированную из модуля плагина, как
// плагин. Отдельный модуль оставляет на commands.ts ровно один экспорт — сам плагин.

export function parseCommand(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/)
  if (!match) return null
  const description = match[1].match(/description:\s*(.+)/)?.[1]?.trim()
  return { description, template: match[2].trim() }
}

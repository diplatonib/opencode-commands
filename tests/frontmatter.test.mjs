import { test } from "node:test"
import assert from "node:assert/strict"
import { parseCommand } from "../.opencode/plugins/internals/frontmatter.mjs"

test("разбирает description и template", () => {
  const parsed = parseCommand(
    "---\n" +
      "description: Статистика токенов\n" +
      "---\n" +
      "Выполни `opencode stats`\n" +
      "и покажи результат",
  )
  assert.equal(parsed?.description, "Статистика токенов")
  assert.equal(parsed?.template, "Выполни `opencode stats`\nи покажи результат")
})

test("терпит CRLF (Windows checkout)", () => {
  const parsed = parseCommand("---\r\ndescription: CRLF команда\r\n---\r\nТело команды")
  assert.equal(parsed?.description, "CRLF команда")
  assert.equal(parsed?.template, "Тело команды")
})

test("без frontmatter возвращает null", () => {
  assert.equal(parseCommand("просто текст без frontmatter"), null)
})

test("пустая строка возвращает null", () => {
  assert.equal(parseCommand(""), null)
})

import commands from "./internals/commands.mjs"
import type { Plugin } from "@opencode-ai/plugin"

// Типизированная точка входа плагина. Реализация — в commands.mjs,
// чтобы тесты могли грузить её из node_modules (Node не стрипует типы .ts
// под node_modules). Загрузчики opencode/bun исполняют .ts напрямую.
export default commands satisfies Plugin

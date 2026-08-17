export interface OpenUIExtraction {
  prose: string
  program: string
  hasOpenUI: boolean
  isComplete: boolean
}

/**
 * Normalizes OpenUI Lang programs to strip accidental Python-style keyword arguments
 * (e.g. `DataTable(columns=[...], data=[...])` -> `DataTable([...], [...])`)
 * and ensures the root program structure conforms to OpenUI Lang AST specifications.
 */
export function normalizeOpenUIProgram(rawProgram: string): string {
  if (!rawProgram) return ""

  let program = rawProgram.trim()

  // 1. Remove keyword argument names inside component calls like:
  // DataTable(columns=[...], data=[...]) -> DataTable([...], [...])
  // Content(title="...", subtitle="...") -> Content("...", "...")
  // MetricGroup(metrics=[...]) -> MetricGroup([...])
  program = program
    // Inside function call opening: e.g. DataTable(\n  columns=
    .replace(/([A-Za-z0-9_]+)\s*\(\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*/g, "$1(")
    // Inside function call arguments: e.g. ,\n  data=
    .replace(/,\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*/g, ", ")

  // 2. If program lacks "root =", wrap it in Stack
  if (!program.includes("root =") && !program.includes("root=")) {
    program = `root = Stack([${program}])`
  }

  return program
}

/** Extracts only fenced OpenUI blocks; ordinary markdown fences are untouched. */
export function extractOpenUI(source: string): OpenUIExtraction {
  const start = source.search(/```openui(?:\s|\r?\n|```)/i)
  if (start < 0)
    return { prose: source, program: "", hasOpenUI: false, isComplete: true }

  const opener = source.slice(start).match(/^```openui[ \t]*\r?\n?/i)
  if (!opener)
    return { prose: source, program: "", hasOpenUI: false, isComplete: true }
  const bodyStart = start + opener[0].length
  const close = source.indexOf("```", bodyStart)
  const complete = close >= 0
  const body = source.slice(bodyStart, complete ? close : undefined).trim()
  const after = complete ? source.slice(close + 3) : ""
  const normalizedProgram = normalizeOpenUIProgram(body)

  return {
    prose: [source.slice(0, start).trim(), after.trim()]
      .filter(Boolean)
      .join("\n")
      .trim(),
    program: normalizedProgram,
    hasOpenUI: true,
    isComplete: complete,
  }
}

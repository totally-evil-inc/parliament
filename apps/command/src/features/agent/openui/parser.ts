export interface OpenUIExtraction {
  prose: string
  program: string
  hasOpenUI: boolean
  isComplete: boolean
}

/** Supported fence tags for OpenUI code blocks */
const OPENUI_FENCE_TAGS = [
  "openui-lang",
  "openui_lang",
  "open-ui-lang",
  "openui",
  "open-ui",
  "openuilang",
  "ui",
]

/**
 * Normalizes OpenUI Lang programs defensively to strip accidental Python-style
 * or JS-style keyword arguments (e.g. `DataTable(columns=[...], data=[...])`
 * or `DataTable(columns: [...], data: [...])`) and ensures the root program
 * structure conforms to OpenUI Lang AST specifications.
 */
export function normalizeOpenUIProgram(rawProgram: string): string {
  if (!rawProgram || typeof rawProgram !== "string") return ""

  const program = rawProgram.trim()
  if (!program) return ""

  // Extract and mask all string literals to guarantee regexes never touch text inside quotes
  const stringLiterals: string[] = []
  const maskedProgram = program.replace(
    /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g,
    (str) => {
      const placeholder = `\uE000STR_${stringLiterals.length}\uE000`
      stringLiterals.push(str)
      return placeholder
    }
  )

  let normalized = maskedProgram

  // 1. Remove keyword argument names inside component call openings:
  // e.g. DataTable(columns=... -> DataTable(...
  // e.g. DataTable(columns: ... -> DataTable(...
  normalized = normalized.replace(
    /([A-Za-z0-9_]+)\s*\(\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*[:=]\s*/g,
    (_match, funcName) => `${funcName}(`
  )

  // 2. Remove keyword argument names after commas at argument boundaries:
  // e.g. , data=... -> , ...
  // e.g. , data: ... -> , ...
  normalized = normalized.replace(
    /,\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*[:=]\s*/g,
    () => ", "
  )

  // Restore all original string literals byte-identically
  normalized = normalized.replace(
    /\uE000STR_(\d+)\uE000/g,
    (_match, idx) => stringLiterals[Number(idx)] ?? ""
  )

  // 3. Handle programs missing `root =`
  const hasRootAssignment = /^root\s*=/m.test(normalized)
  if (!hasRootAssignment) {
    // Find all top-level component instantiations (e.g. `m1 = MetricGroup(...)`, `c1 = Callout(...)`)
    const assignedComponents: string[] = []
    const lines = normalized.split("\n")
    for (const line of lines) {
      const match = line.match(
        /^([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*([A-Z][a-zA-Z0-9_]*)\s*\(/
      )
      if (match?.[1] && match[1] !== "root") {
        assignedComponents.push(match[1])
      }
    }

    if (assignedComponents.length > 0) {
      // Multiple statements defined without root: synthesize root referencing all top-level components
      normalized = `root = Stack([${assignedComponents.join(", ")}])\n${normalized}`
    } else {
      // Single expression or inline component without assignment
      normalized = `root = Stack([${normalized}])`
    }
  }

  return normalized.trim()
}

/**
 * Extracts OpenUI code blocks from raw assistant content defensively.
 * Handles ````openui-lang`, ````openui`, ````open-ui`, and streaming unclosed fences.
 */
export function extractOpenUI(source: string): OpenUIExtraction {
  if (!source || typeof source !== "string") {
    return { prose: "", program: "", hasOpenUI: false, isComplete: true }
  }

  // 1. Check for explicit OpenUI fences first
  const fencePattern = new RegExp(
    `\`\`\`(?:${OPENUI_FENCE_TAGS.join("|")})(?:[ \\t]*\\r?\\n|[ \\t]+|$)`,
    "i"
  )
  const match = source.match(fencePattern)
  let start = match ? source.indexOf(match[0]) : -1
  let openerLength = match ? match[0].length : 0

  // 2. Fallback: check if an untagged or generic code fence contains OpenUI Lang indicators
  if (start < 0) {
    const genericFenceRegex =
      /```(?:[a-zA-Z0-9_-]*)[ \t]*\r?\n([\s\S]*?)(?:```|$)/g
    let gMatch = genericFenceRegex.exec(source)
    while (gMatch !== null) {
      const codeBody = gMatch[1] ?? ""
      const isLikelyOpenUI =
        /^root\s*=\s*(?:Stack|Layout)\(/m.test(codeBody) ||
        /\b(?:MetricGroup|DataTable|EventCard|DocumentSentCard|Callout|LinkCard)\s*\(/m.test(
          codeBody
        )
      if (isLikelyOpenUI) {
        start = gMatch.index
        const headerMatch = source.slice(start).match(/^```[^\n]*\n/)
        openerLength = headerMatch ? headerMatch[0].length : 3
        break
      }
      gMatch = genericFenceRegex.exec(source)
    }
  }

  if (start < 0) {
    return { prose: source, program: "", hasOpenUI: false, isComplete: true }
  }

  const bodyStart = start + openerLength
  const close = source.indexOf("```", bodyStart)
  const complete = close >= 0
  const body = source.slice(bodyStart, complete ? close : undefined).trim()
  const beforeProse = source.slice(0, start).trim()
  const afterProse = complete ? source.slice(close + 3).trim() : ""

  const proseParts = [beforeProse, afterProse].filter(Boolean)
  const prose = proseParts.join("\n\n").trim()
  const normalizedProgram = normalizeOpenUIProgram(body)

  return {
    prose,
    program: normalizedProgram,
    hasOpenUI: true,
    isComplete: complete,
  }
}

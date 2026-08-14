export interface OpenUIExtraction {
  prose: string
  program: string
  hasOpenUI: boolean
  isComplete: boolean
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
  return {
    prose: [source.slice(0, start).trim(), after.trim()]
      .filter(Boolean)
      .join("\n")
      .trim(),
    program: body,
    hasOpenUI: true,
    isComplete: complete,
  }
}

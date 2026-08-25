import { describe, expect, test } from "bun:test"
import { extractOpenUI, normalizeOpenUIProgram } from "./parser"

describe("extractOpenUI", () => {
  test("separates prose and a completed program with ```openui", () => {
    expect(
      extractOpenUI("Before\n```openui\nroot = Stack([card])\n```\nAfter")
    ).toEqual({
      prose: "Before\n\nAfter",
      program: "root = Stack([card])",
      hasOpenUI: true,
      isComplete: true,
    })
  })

  test("separates prose and a completed program with ```openui-lang", () => {
    expect(
      extractOpenUI(
        'Here is the overview:\n```openui-lang\nroot = Stack([m1])\nm1 = MetricGroup([{"label": "Pipeline", "value": "$500k"}])\n```\nLet me know if you need changes.'
      )
    ).toEqual({
      prose: "Here is the overview:\n\nLet me know if you need changes.",
      program:
        'root = Stack([m1])\nm1 = MetricGroup([{"label": "Pipeline", "value": "$500k"}])',
      hasOpenUI: true,
      isComplete: true,
    })
  })

  test("extracts program from ```open-ui and ```ui fence tags", () => {
    const res = extractOpenUI(
      'Report:\n```open-ui\nroot = Stack([c1])\nc1 = Content("Title")\n```'
    )
    expect(res.hasOpenUI).toBe(true)
    expect(res.program).toBe('root = Stack([c1])\nc1 = Content("Title")')
    expect(res.prose).toBe("Report:")
  })

  test("extracts program from generic fence containing OpenUI components", () => {
    const res = extractOpenUI(
      '```\nroot = Stack([m1])\nm1 = MetricGroup([{"label": "Won", "value": "10"}])\n```'
    )
    expect(res.hasOpenUI).toBe(true)
    expect(res.program).toContain("root = Stack([m1])")
  })

  test("retains an incomplete streaming fence for progressive rendering", () => {
    expect(
      extractOpenUI("Before\n```openui-lang\nroot = Stack([card])")
    ).toMatchObject({
      prose: "Before",
      program: "root = Stack([card])",
      hasOpenUI: true,
      isComplete: false,
    })
  })

  test("does not consume ordinary markdown code", () => {
    expect(extractOpenUI("```ts\nconst value = 1\n```")).toEqual({
      prose: "```ts\nconst value = 1\n```",
      program: "",
      hasOpenUI: false,
      isComplete: true,
    })
  })
})

describe("normalizeOpenUIProgram", () => {
  test("preserves dollar signs and currency formatting without regex capture group corruption", () => {
    const raw = `root = Stack([
  MetricGroup([
    {"label": "Total Pipeline", "value": "$1,500,000"},
    {"label": "Closed Won", "value": "$500,000"}
  ])
])`
    const normalized = normalizeOpenUIProgram(raw)
    expect(normalized).toContain('"$1,500,000"')
    expect(normalized).toContain('"$500,000"')
    expect(normalized).not.toContain('"00,000"')
    expect(normalized).not.toContain('"00k"')
  })

  test("normalizes Python kwargs (`=` syntax) in component calls", () => {
    const raw = `root = Stack([
  MetricGroup(metrics=[
    {"label": "Pipeline", "value": "$1,500,000"}
  ]),
  DataTable(
    columns=[{"key": "id", "header": "ID"}],
    data=[{"id": "1", "title": "Deal 1"}]
  )
])`
    const normalized = normalizeOpenUIProgram(raw)
    expect(normalized).not.toContain("metrics=")
    expect(normalized).not.toContain("columns=")
    expect(normalized).not.toContain("data=")
    expect(normalized).toContain("DataTable(")
    expect(normalized).toContain("MetricGroup(")
    expect(normalized).toContain('"$1,500,000"')
  })

  test("normalizes colon kwargs (`:` syntax) in component calls", () => {
    const raw = `root = Stack([
  DataTable(
    columns: [{"key": "name", "header": "Name"}],
    data: [{"name": "Acme Corp"}]
  ),
  Callout(
    title: "Notice",
    description: "Proposal ready",
    variant: "success"
  )
])`
    const normalized = normalizeOpenUIProgram(raw)
    expect(normalized).not.toContain("columns:")
    expect(normalized).not.toContain("data:")
    expect(normalized).not.toContain("title:")
    expect(normalized).not.toContain("description:")
    expect(normalized).not.toContain("variant:")
    expect(normalized).toContain(
      'Callout("Notice", "Proposal ready", "success"'
    )
  })

  test("synthesizes root Stack when root assignment is missing but statements exist", () => {
    const raw = `m1 = MetricGroup([{"label": "Won", "value": "$100k"}])
t1 = DataTable([{"key": "title", "header": "Title"}], [{"title": "Enterprise"}])`
    const normalized = normalizeOpenUIProgram(raw)
    expect(normalized).toMatch(/^root = Stack\(\[m1, t1\]\)/)
    expect(normalized).toContain("m1 = MetricGroup")
    expect(normalized).toContain("t1 = DataTable")
  })

  test("preserves commas, colons, and equals signs inside string literals without corruption", () => {
    const raw = `root = Stack([
  Callout("Notice", "Contact sales at support, email: team@example.com, code = 100", "info")
])`
    const normalized = normalizeOpenUIProgram(raw)
    expect(normalized).toContain(
      'Callout("Notice", "Contact sales at support, email: team@example.com, code = 100", "info")'
    )
  })

  test("synthesizes root Stack only for UI components when helper data variables exist", () => {
    const raw = `data_items = [{"label": "Deals", "value": "$250k"}]
m1 = MetricGroup(data_items)`
    const normalized = normalizeOpenUIProgram(raw)
    expect(normalized).toMatch(/^root = Stack\(\[m1\]\)/)
    expect(normalized).not.toContain("root = Stack([data_items, m1])")
  })

  test("wraps standalone expression when no assignment exists", () => {
    const raw = `Callout("Important", "Review requested", "warning")`
    const normalized = normalizeOpenUIProgram(raw)
    expect(normalized).toBe(
      `root = Stack([Callout("Important", "Review requested", "warning")])`
    )
  })
})

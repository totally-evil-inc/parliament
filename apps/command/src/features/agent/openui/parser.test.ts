import { describe, expect, test } from "bun:test"
import { extractOpenUI } from "./parser"

describe("extractOpenUI", () => {
  test("separates prose and a completed program", () => {
    expect(
      extractOpenUI("Before\n```openui\nroot = Stack([card])\n```\nAfter")
    ).toEqual({
      prose: "Before\nAfter",
      program: "root = Stack([card])",
      hasOpenUI: true,
      isComplete: true,
    })
  })

  test("retains an incomplete fence for progressive rendering", () => {
    expect(
      extractOpenUI("Before\n```openui\nroot = Stack([card])")
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

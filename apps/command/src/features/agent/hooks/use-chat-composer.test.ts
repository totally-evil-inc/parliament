import { describe, expect, test } from "bun:test"
import { useChatComposer } from "./use-chat-composer"

describe("useChatComposer", () => {
  test("exports composer helper functions and types", () => {
    expect(typeof useChatComposer).toBe("function")
  })
})

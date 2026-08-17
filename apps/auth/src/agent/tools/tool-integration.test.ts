import { describe, expect, test } from "bun:test"
import { chat, maxIterations } from "@tanstack/ai"
import type { AgentContext } from "../tool-ctx"
import { buildAgentTools } from "./catalog"

describe("Full TanStack AI chat turn simulation with tools", () => {
  const ctx: AgentContext = {
    organizationId: "00000000-0000-0000-0000-000000000001",
    userId: "00000000-0000-0000-0000-000000000002",
    userEmail: "test@example.com",
    orgName: "Acme Corp",
  }

  test("initializes chat and converts all tool schemas without throwing", async () => {
    const mockAdapter: any = {
      chatStream: async function* ({ tools }: any) {
        expect(tools.length).toBeGreaterThan(0)
        const qTool = tools?.find(
          (t: any) => t.name === "ask_clarifying_questions"
        )
        expect(qTool?.inputSchema).toBeDefined()
        expect(qTool?.inputSchema?.properties?.questions).toBeDefined()
        yield {
          type: "TEXT_MESSAGE_CONTENT",
          delta: "Hello",
        }
        yield {
          type: "TEXT_MESSAGE_END",
        }
      },
    }

    const tools = buildAgentTools(ctx)
    const stream = chat({
      adapter: mockAdapter,
      messages: [
        {
          role: "user",
          parts: [
            {
              type: "text",
              text: "Draft proposal",
              content: "Draft proposal",
            },
          ],
        },
      ] as any,
      tools,
      systemPrompts: ["You are an agent"],
      agentLoopStrategy: maxIterations(2),
    })

    const chunks: any[] = []
    for await (const chunk of stream) {
      chunks.push(chunk)
    }
    expect(chunks.length).toBeGreaterThan(0)
  })
})

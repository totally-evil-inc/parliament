import { EventType, type StreamChunk, type TextOptions } from "@tanstack/ai"
import { BaseTextAdapter } from "@tanstack/ai/adapters"

/**
 * Test-only TextAdapter fixture (never imported by production code).
 *
 * `tool-turn` simulates a real agent loop: the first `chatStream` call emits
 * a text preamble + a `verify_org_access` tool call (which the real engine
 * executes against the real tool impl), then a second call emits the final
 * text reply. `text-turn` skips the tool call. `failing` throws mid-stream to
 * exercise the `interrupted` persistence path.
 */
export type MockScenario = "tool-turn" | "text-turn" | "failing"

export class MockTextAdapter extends BaseTextAdapter<
  string,
  Record<string, never>,
  any,
  any,
  any
> {
  readonly name = "mock"
  private calls = 0
  private readonly scenario: MockScenario
  public readonly invokedMessages: unknown[][] = []
  private readonly threadId: string

  constructor(scenario: MockScenario, model = "mock/test-model") {
    super(undefined, model)
    this.scenario = scenario
    this.threadId = crypto.randomUUID()
  }

  override async *chatStream(
    options: TextOptions<Record<string, never>>
  ): AsyncIterable<StreamChunk> {
    this.calls += 1
    this.invokedMessages.push(options.messages)

    yield {
      type: EventType.RUN_STARTED,
      threadId: this.threadId,
      runId: "run-1",
    }

    if (this.scenario === "failing") {
      yield {
        type: EventType.TEXT_MESSAGE_START,
        messageId: "m-fail",
        role: "assistant",
      }
      throw new Error("mock adapter exploded")
    }

    if (this.calls === 1 && this.scenario === "tool-turn") {
      yield {
        type: EventType.TEXT_MESSAGE_START,
        messageId: "m-pre",
        role: "assistant",
      }
      yield {
        type: EventType.TEXT_MESSAGE_CONTENT,
        messageId: "m-pre",
        delta: "Let me verify access first.",
      }
      yield { type: EventType.TEXT_MESSAGE_END, messageId: "m-pre" }
      yield {
        type: EventType.TOOL_CALL_START,
        toolCallId: "tc-1",
        toolCallName: "verify_org_access",
        toolName: "verify_org_access",
      }
      yield {
        type: EventType.TOOL_CALL_ARGS,
        toolCallId: "tc-1",
        delta: "{}",
      }
      yield { type: EventType.TOOL_CALL_END, toolCallId: "tc-1" }
      yield {
        type: EventType.RUN_FINISHED,
        threadId: this.threadId,
        runId: "run-1",
        finishReason: "tool_calls",
      }
      return
    }

    yield {
      type: EventType.TEXT_MESSAGE_START,
      messageId: "m-reply",
      role: "assistant",
    }
    yield {
      type: EventType.TEXT_MESSAGE_CONTENT,
      messageId: "m-reply",
      delta: "Hello ",
    }
    yield {
      type: EventType.TEXT_MESSAGE_CONTENT,
      messageId: "m-reply",
      delta: "world!",
    }
    yield { type: EventType.TEXT_MESSAGE_END, messageId: "m-reply" }
    yield {
      type: EventType.RUN_FINISHED,
      threadId: this.threadId,
      runId: "run-2",
    }
  }

  override structuredOutput(): Promise<never> {
    throw new Error("structuredOutput not implemented in mock")
  }
}

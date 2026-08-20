import type { AgentEvent } from "@workspace/agent"
import { db, schema } from "@workspace/database"
import { logWideEvent } from "@workspace/logger"
import { type LanguageModel, type ModelMessage, streamText } from "ai"
import { ContextGovernor } from "./context-governor"
import { buildPrompt } from "./prompt"
import { ThinkTagDemuxer } from "./think-demuxer"
import type { AgentContext } from "./tool-ctx"
import { ToolDispatcher } from "./tool-dispatcher"

export interface AgentEngineConfig {
  maxSteps?: number
}

export class AgentEngine {
  private governor = new ContextGovernor()

  constructor(private config: AgentEngineConfig = { maxSteps: 8 }) {}

  /**
   * Runs the resilient agent loop as an AsyncGenerator emitting typed AgentEvents.
   */
  async *executeTurn(options: {
    ctx: AgentContext
    model: LanguageModel
    modelName: string
    conversationId: string
    messages: ModelMessage[]
    abortSignal?: AbortSignal
  }): AsyncGenerator<AgentEvent, void, void> {
    const { ctx, model, modelName, conversationId, messages, abortSignal } =
      options
    const maxSteps = this.config.maxSteps ?? 8

    yield {
      type: "turn:start",
      conversationId,
      model: modelName,
      timestamp: new Date().toISOString(),
    }

    const dispatcher = new ToolDispatcher(ctx)
    const activeMessages: ModelMessage[] = [...messages]
    let step = 0
    const lastToolCallsByName = new Map<
      string,
      { callId: string; isError: boolean; attempt: number }
    >()

    while (step < maxSteps) {
      if (abortSignal?.aborted) {
        yield {
          type: "turn:error",
          code: "aborted",
          message: "Agent turn was aborted by client request.",
          recoverable: false,
        }
        return
      }

      step++
      const systemPrompt = buildPrompt(ctx)
      const tools = dispatcher.getToolsForModel()
      const compactedMessages = this.governor.compactMessages(activeMessages)

      let result: ReturnType<typeof streamText>
      try {
        result = streamText({
          model,
          system: systemPrompt,
          messages: compactedMessages,
          tools,
          abortSignal,
        })
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err)
        yield {
          type: "turn:error",
          code: "model_init_failed",
          message: errorMsg,
          recoverable: true,
        }
        return
      }

      let assistantText = ""
      let _assistantThinking = ""
      const demuxer = new ThinkTagDemuxer()
      const toolCallsToProcess: Array<{
        id: string
        name: string
        args: Record<string, unknown>
        retryOf?: string
        attempt?: number
      }> = []

      try {
        const streamSource =
          (result as any).fullStream || (result as any).stream || result

        for await (const chunk of streamSource) {
          if (abortSignal?.aborted) break

          const chunkType = chunk.type

          if (
            chunkType === "reasoning-delta" ||
            chunkType === "reasoning" ||
            chunkType === "reasoning_content"
          ) {
            const text =
              (chunk as any).textDelta ??
              (chunk as any).text ??
              (chunk as any).delta ??
              (chunk as any).reasoning ??
              ""
            if (text) {
              _assistantThinking += text
              yield { type: "thinking:delta", text }
            }
            continue
          }

          if (chunkType === "text-delta" || chunkType === "text") {
            const raw = (chunk as any).text ?? (chunk as any).delta ?? ""
            if (!raw) continue

            const deltas = demuxer.process(raw)
            for (const delta of deltas) {
              if (delta.type === "content:delta") {
                assistantText += delta.text
                yield delta
              } else if (delta.type === "thinking:delta") {
                _assistantThinking += delta.text
                yield delta
              }
            }
            continue
          }

          if (chunkType === "tool-call") {
            const typedChunk = chunk as any
            const callId =
              typedChunk.toolCallId ?? typedChunk.id ?? crypto.randomUUID()
            const toolName = typedChunk.toolName ?? ""
            const args = (typedChunk.input ?? typedChunk.args ?? {}) as Record<
              string,
              unknown
            >

            const prevCall = lastToolCallsByName.get(toolName)
            const isRetry = Boolean(prevCall && prevCall.isError)
            const attempt = isRetry ? (prevCall!.attempt || 1) + 1 : 1
            const retryOf = isRetry ? prevCall!.callId : undefined

            toolCallsToProcess.push({
              id: callId,
              name: toolName,
              args,
              retryOf,
              attempt,
            })
            yield {
              type: "tool:called",
              callId,
              name: toolName,
              args,
              ...(retryOf ? { retryOf } : {}),
              ...(attempt > 1 ? { attempt } : {}),
            }
            continue
          }

          if (chunkType === "error") {
            const err = (chunk as any)?.error ?? chunk
            const message =
              typeof err === "string"
                ? err
                : err?.message ||
                  err?.errorText ||
                  String(err || "Stream failed")
            yield {
              type: "turn:error",
              code: "stream_error",
              message,
              recoverable: true,
            }
            return
          }
        }

        const flushed = demuxer.flush()
        for (const delta of flushed) {
          if (delta.type === "content:delta") {
            assistantText += delta.text
            yield delta
          } else if (delta.type === "thinking:delta") {
            _assistantThinking += delta.text
            yield delta
          }
        }
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err)
        yield {
          type: "turn:error",
          code: "stream_interrupted",
          message: errorMsg,
          recoverable: true,
        }
        return
      }

      if (abortSignal?.aborted) {
        yield {
          type: "turn:error",
          code: "aborted",
          message: "Agent turn was aborted by client request.",
          recoverable: false,
        }
        return
      }

      const hasQuestionnaire = toolCallsToProcess.some(
        (c) =>
          c.name === "ask_clarifying_questions" ||
          c.name === "askClarifyingQuestions" ||
          c.name.toLowerCase().includes("clarifying_question")
      )
      if (hasQuestionnaire && !assistantText.trim()) {
        const defaultPrompt =
          "Please answer the clarifying questions below so I can tailor this for you:"
        assistantText = defaultPrompt
        yield { type: "content:delta", text: defaultPrompt }
      }

      // Record assistant message with text and tool calls in model history for next turn
      const assistantContent: any[] = []
      if (assistantText.trim()) {
        assistantContent.push({ type: "text", text: assistantText })
      }
      for (const call of toolCallsToProcess) {
        assistantContent.push({
          type: "tool-call",
          toolCallId: call.id,
          toolName: call.name,
          input: call.args ?? {},
        })
      }

      if (assistantContent.length > 0) {
        activeMessages.push({
          role: "assistant",
          content: assistantContent as any,
        })
      }

      // 1. Termination condition: Model produced text with no tool calls
      if (toolCallsToProcess.length === 0) {
        yield {
          type: "turn:completed",
          totalSteps: step,
        }
        return
      }

      // 2. Process tool calls
      let hasApprovalSuspension = false
      const toolResults: Array<{
        callId: string
        name: string
        processedContent: string
        isError: boolean
      }> = []

      // Check for human-in-the-loop approval triggers
      for (const call of toolCallsToProcess) {
        yield {
          type: "tool:executing",
          callId: call.id,
          name: call.name,
          ...(call.retryOf ? { retryOf: call.retryOf } : {}),
          ...(call.attempt && call.attempt > 1
            ? { attempt: call.attempt }
            : {}),
        }

        const {
          result: rawResult,
          isError,
          approvalRequired,
        } = await dispatcher.executeTool(call.name, call.args)

        if (approvalRequired) {
          // Persist durable pending action approval to PostgreSQL
          const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
          const summary = `Action '${call.name}' awaiting approval`

          let approvalId: `${string}-${string}-${string}-${string}-${string}` =
            crypto.randomUUID()
          try {
            const [row] = await db
              .insert(schema.chatActionApproval)
              .values({
                id: approvalId,
                organizationId: ctx.organizationId,
                conversationId,
                toolName: call.name,
                toolArgs: call.args,
                summary,
                status: "pending",
                expiresAt,
              })
              .returning({ id: schema.chatActionApproval.id })

            if (row?.id)
              approvalId =
                row.id as `${string}-${string}-${string}-${string}-${string}`
          } catch (err) {
            logWideEvent({
              event: "agent.approval.persist_failed",
              outcome: "failure",
              organizationId: ctx.organizationId,
              metadata: { tool: call.name, error: String(err) },
            })
          }

          yield {
            type: "action:approval_required",
            approvalId,
            callId: call.id,
            toolName: call.name,
            args: call.args,
            summary,
            expiresAt: expiresAt.toISOString(),
          }

          yield {
            type: "turn:suspended",
            reason: "awaiting_approval",
            approvalId,
          }

          hasApprovalSuspension = true
          break
        }

        if (isError) {
          logWideEvent({
            event: "agent.turn.tool_result_error",
            outcome: "failure",
            organizationId: ctx.organizationId,
            userId: ctx.userId,
            entityId: conversationId,
            error: {
              code: "tool_execution_error",
              message:
                typeof rawResult === "string"
                  ? rawResult
                  : JSON.stringify(rawResult),
            },
            metadata: {
              step,
              tool: call.name,
              callId: call.id,
              args: call.args,
            },
          })
        }

        const { content } = await this.governor.processToolResult({
          toolName: call.name,
          rawResult,
          organizationId: ctx.organizationId,
          conversationId,
        })

        // If tool failed repeatedly, append explicit model guidance to break retry loops
        const finalModelFeedback =
          isError && step > 1
            ? `${content}\n\n[System Guidance]: Tool '${call.name}' returned an error. If parameters cannot be corrected, do not retry this tool call. Explain what information is missing to the user directly in your response.`
            : content

        yield {
          type: "tool:result",
          callId: call.id,
          name: call.name,
          result: rawResult,
          isError,
          ...(call.retryOf ? { retryOf: call.retryOf } : {}),
          ...(call.attempt && call.attempt > 1
            ? { attempt: call.attempt }
            : {}),
        }

        lastToolCallsByName.set(call.name, {
          callId: call.id,
          isError,
          attempt: call.attempt ?? 1,
        })

        toolResults.push({
          callId: call.id,
          name: call.name,
          processedContent: finalModelFeedback,
          isError,
        })
      }

      if (hasApprovalSuspension) {
        // Emit skipped results for any tool calls after the approval-gated one
        // so the client never leaves them stuck in "running".
        const processedIds = new Set(toolResults.map((tr) => tr.callId))
        for (const call of toolCallsToProcess) {
          if (processedIds.has(call.id)) continue
          yield {
            type: "tool:result",
            callId: call.id,
            name: call.name,
            result: {
              status: "skipped",
              message:
                "Tool call skipped: turn is suspended awaiting human approval for another action.",
            },
            isError: false,
          }
        }
        return
      }

      // Append tool results to message history for next turn iteration
      const toolMessage: ModelMessage = {
        role: "tool",
        content: toolResults.map((tr) => {
          const stringVal =
            typeof tr.processedContent === "string"
              ? tr.processedContent
              : JSON.stringify(tr.processedContent)
          return {
            type: "tool-result" as const,
            toolCallId: tr.callId,
            toolName: tr.name,
            output: tr.isError
              ? { type: "error-text" as const, value: stringVal }
              : { type: "text" as const, value: stringVal },
          }
        }) as any,
      }

      activeMessages.push(toolMessage)
    }

    yield {
      type: "turn:suspended",
      reason: "budget_cap",
    }
  }
}

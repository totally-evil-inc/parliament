import { toolDefinition } from "@tanstack/ai"
import {
  type AskClarifyingQuestionsInput,
  type AskClarifyingQuestionsOutput,
  askClarifyingQuestionsInput,
  askClarifyingQuestionsOutput,
} from "@workspace/agent"
import type { AgentContext } from "../tool-ctx"

export function askClarifyingQuestionsTool(_ctx: AgentContext) {
  return toolDefinition({
    name: "ask_clarifying_questions",
    description:
      "Present an interactive questionnaire form with multiple choice or text questions to the user when proposal scope, budget, timeline, deliverables, or customer requirements need clarification.",
    inputSchema: askClarifyingQuestionsInput,
    outputSchema: askClarifyingQuestionsOutput,
    needsApproval: false,
  }).server(async (args: unknown): Promise<AskClarifyingQuestionsOutput> => {
    const typedArgs = args as AskClarifyingQuestionsInput
    const questionsCount = Array.isArray(typedArgs?.questions)
      ? typedArgs.questions.length
      : 0
    return {
      status: "awaiting_user_input",
      message: `Presented ${questionsCount} clarifying question(s) to the user. Awaiting user response.`,
      questionsCount,
    }
  })
}

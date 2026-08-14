import { useCommandChatContext } from "../context/command-chat-context"

export type { AgentChatError } from "../context/command-chat-context"

export function useCommandChat(_options?: { initialThreadId?: string }) {
  return useCommandChatContext()
}

import { SparklesIcon } from "@heroicons/react/24/outline"
import { DitherShell, DitherStatusTag } from "@workspace/ui/components/dither"
import { cn } from "@workspace/ui/lib/utils"
import type React from "react"
import { useReasoningShell } from "../hooks/use-reasoning-shell"
import { ChatComposerField } from "./chat-composer-field"
import { ChatModelSelect } from "./chat-model-select"

export interface ChatInputProps {
  onSend: (text: string) => void
  onStop?: () => void
  isLoading?: boolean
  /** Live reasoning text from the latest assistant turn, if any. */
  thinking?: string
  selectedModel?: string
  onSelectModel?: (model: string) => void
  showPrompts?: boolean
  autoFocus?: boolean
}

const PROMPTS = Object.freeze([
  {
    text: "Pipeline Summary",
    prompt: "How is my pipeline looking this month?",
  },
  {
    text: "Active Proposals",
    prompt: "List active proposals & status",
  },
  {
    text: "Customer Analytics",
    prompt: "Show customer revenue analytics and top clients",
  },
  {
    text: "Schedule Sync",
    prompt: "Schedule a discovery call with Nexa tomorrow at 2pm",
  },
])

export const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  onStop,
  isLoading = false,
  thinking,
  selectedModel,
  onSelectModel,
  showPrompts = true,
  autoFocus = true,
}) => {
  const reasoning = useReasoningShell({ isLoading, thinking })

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
      {/* Reasoning Shell: dither canvas + live thinking strip + composer */}
      <DitherShell
        color="var(--primary)"
        bloom={reasoning.expanded ? "low" : "off"}
        intensity={reasoning.expanded ? 1 : 0}
        className="rounded-[20px] px-0.5 pt-1 pb-0.5"
      >
        {/* Live Reasoning Strip — expands while the run streams, slides back on completion */}
        <div
          aria-hidden={!reasoning.expanded}
          className={cn(
            "relative z-10 grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none",
            reasoning.expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          )}
        >
          <div className="min-h-0 overflow-hidden">
            <DitherStatusTag
              status={reasoning.statusText}
              live={reasoning.expanded}
              className="px-3 pt-1.5 pb-1"
            />
          </div>
        </div>

        {/* Modular Composer Field isolating typing state */}
        <ChatComposerField
          onSend={onSend}
          onStop={onStop}
          isLoading={isLoading}
          autoFocus={autoFocus}
        >
          <ChatModelSelect
            selectedModel={selectedModel}
            onSelectModel={onSelectModel}
          />
        </ChatComposerField>
      </DitherShell>

      {/* Prompt Suggestions */}
      {showPrompts ? (
        <div className="flex flex-wrap justify-center gap-2">
          {PROMPTS.map((p) => (
            <button
              key={p.text}
              type="button"
              className="flex cursor-pointer items-center gap-1.5 rounded-full border border-border/60 bg-card/60 px-3 py-1.5 font-sans text-muted-foreground text-xs transition-colors hover:border-border hover:bg-muted hover:text-foreground"
              onClick={() => onSend(p.prompt)}
            >
              <SparklesIcon className="size-3 shrink-0 text-muted-foreground/60" />
              <span>{p.text}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

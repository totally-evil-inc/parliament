import { ArrowUpIcon, PlusIcon } from "@heroicons/react/24/outline"
import { StopIcon } from "@heroicons/react/24/solid"
import { Button } from "@workspace/ui/components/button"
import { Textarea } from "@workspace/ui/components/textarea"
import { cn } from "@workspace/ui/lib/utils"
import type React from "react"
import { useChatComposer } from "../hooks/use-chat-composer"

interface ChatComposerFieldProps {
  onSend: (text: string) => void
  onStop?: () => void
  isLoading?: boolean
  autoFocus?: boolean
  children?: React.ReactNode
}

export const ChatComposerField: React.FC<ChatComposerFieldProps> = ({
  onSend,
  onStop,
  isLoading = false,
  autoFocus = true,
  children,
}) => {
  const composer = useChatComposer({ autoFocus, isLoading, onSend, onStop })
  const hasInput = composer.inputValue.trim().length > 0

  return (
    <div className="relative z-10 flex min-h-[100px] cursor-text flex-col rounded-[17px] border border-border/60 bg-card/95 p-2.5 shadow-2xs transition-all focus-within:border-ring/40 dark:border-white/[0.06] dark:bg-[#0c0d0e] dark:focus-within:border-white/15">
      {/* Text Area */}
      <div className="relative max-h-[220px] flex-1 overflow-y-auto">
        <Textarea
          className="min-h-[44px] w-full resize-none whitespace-pre-wrap break-words border-0 bg-transparent! p-0 font-sans text-foreground text-sm shadow-none outline-none placeholder:text-muted-foreground/60 focus-visible:ring-0 focus-visible:ring-offset-0"
          onChange={(e) => composer.setInputValue(e.target.value)}
          onKeyDown={composer.handleKeyDown}
          placeholder="Ask anything, or / for a command"
          ref={composer.inputRef}
          value={composer.inputValue}
          disabled={isLoading}
        />
      </div>

      {/* Bottom Actions Row */}
      <div className="mt-auto flex min-h-[36px] items-center gap-2.5 pt-2">
        {/* Plus / Attach Button */}
        <button
          type="button"
          aria-label="Add context or attachment"
          className="flex size-5 cursor-pointer items-center justify-center text-muted-foreground/60 transition-colors hover:text-foreground focus-visible:outline-none"
        >
          <PlusIcon className="size-4 stroke-[1.5]" />
        </button>

        {/* Model & Provider Dropdowns Slot */}
        {children}

        {/* Right Action: Send / Stop */}
        <div className="ml-auto flex items-center gap-2">
          {isLoading ? (
            <Button
              type="button"
              variant="destructive"
              size="icon"
              aria-label="Stop generation"
              className="size-7 rounded-full shadow-xs"
              onClick={composer.stop}
            >
              <StopIcon className="size-3.5" />
            </Button>
          ) : (
            <button
              type="button"
              aria-label="Send message"
              disabled={!hasInput}
              onClick={() => composer.submit()}
              className={cn(
                "flex size-7 cursor-pointer items-center justify-center rounded-full bg-foreground/10 text-muted-foreground transition-all hover:bg-foreground/15 hover:text-foreground focus-visible:outline-none disabled:pointer-events-none disabled:opacity-30",
                hasInput
                  ? "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90"
                  : ""
              )}
            >
              <ArrowUpIcon className="size-3.5 stroke-[2.5]" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

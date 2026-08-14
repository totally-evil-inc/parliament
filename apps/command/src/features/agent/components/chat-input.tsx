import {
  ArrowUpIcon,
  BuildingLibraryIcon,
  SparklesIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline"
import { StopIcon } from "@heroicons/react/24/solid"
import { Button } from "@workspace/ui/components/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Textarea } from "@workspace/ui/components/textarea"
import { cn } from "@workspace/ui/lib/utils"
import type React from "react"
import { useEffect, useRef, useState } from "react"
import { useConfirm } from "@/components/confirm-dialog-provider"
import { useAIModels } from "../hooks/use-ai-models"

interface ChatInputProps {
  onSend: (text: string) => void
  onStop?: () => void
  isLoading?: boolean
  selectedModel?: string
  onSelectModel?: (model: string) => void
  showPrompts?: boolean
  autoFocus?: boolean
}

const PROMPTS = [
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
]

export const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  onStop,
  isLoading,
  selectedModel,
  onSelectModel,
  showPrompts = true,
  autoFocus = true,
}) => {
  const [inputValue, setInputValue] = useState("")
  const [customModelInput, setCustomModelInput] = useState("")
  const [isAddingCustom, setIsAddingCustom] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const prevLoadingRef = useRef(isLoading)
  const confirm = useConfirm()

  const { data: modelsData, isLoading: isModelsLoading } = useAIModels()

  const defaultModel = modelsData?.defaultModel || ""
  const activeModel = selectedModel || defaultModel

  // Dynamic models list fetched from provider API or active default
  const dynamicModels = modelsData?.models || []

  // Ensure current active model is present in the list
  const modelOptions = [...dynamicModels]
  if (activeModel && !modelOptions.some((m) => m.id === activeModel)) {
    modelOptions.unshift({ id: activeModel, name: activeModel })
  }

  // Focus handling on mount / visibility
  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus()
    }
  }, [autoFocus])

  // Refocus when agent finishes responding
  useEffect(() => {
    if (prevLoadingRef.current && !isLoading) {
      inputRef.current?.focus()
    }
    prevLoadingRef.current = isLoading
  }, [isLoading])

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!inputValue.trim() || isLoading) return
    const text = inputValue.trim()
    setInputValue("")
    onSend(text)
    requestAnimationFrame(() => {
      inputRef.current?.focus()
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handlePromptClick = (prompt: string) => {
    onSend(prompt)
    requestAnimationFrame(() => {
      inputRef.current?.focus()
    })
  }

  const handleAddCustomModel = (e: React.FormEvent) => {
    e.preventDefault()
    if (customModelInput.trim() && onSelectModel) {
      onSelectModel(customModelInput.trim())
      setCustomModelInput("")
      setIsAddingCustom(false)
    }
  }

  const handleStop = async () => {
    if (!onStop) return
    const confirmed = await confirm({
      title: "Stop generation?",
      description:
        "Are you sure you want to stop the agent from generating a response?",
      confirmLabel: "Stop",
      cancelLabel: "Cancel",
      variant: "destructive",
    })
    if (confirmed) {
      onStop()
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-3">
      {/* Input Box (ai-02 design) */}
      <div className="flex min-h-[120px] cursor-text flex-col rounded-2xl border border-border bg-card shadow-lg transition-all focus-within:border-primary/50">
        <div className="relative max-h-[240px] flex-1 overflow-y-auto">
          <Textarea
            className="min-h-[50px] w-full resize-none whitespace-pre-wrap break-words border-0 bg-transparent! p-3 text-foreground text-sm shadow-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Parliament command agent or instruct actions..."
            ref={inputRef}
            value={inputValue}
            disabled={isLoading}
          />
        </div>

        <div className="flex min-h-[40px] items-center gap-2 border-border/40 border-t p-2.5 pt-1">
          <div className="flex items-center gap-1.5 rounded-full bg-muted/60 px-2.5 py-1 text-xs">
            <BuildingLibraryIcon className="size-3.5 text-primary" />
            <span className="font-semibold text-[11px] text-primary">
              Agent
            </span>
          </div>

          <div className="relative flex items-center gap-2">
            {isAddingCustom ? (
              <form
                onSubmit={handleAddCustomModel}
                className="flex items-center gap-1.5"
              >
                <input
                  type="text"
                  placeholder="Enter model ID..."
                  className="h-7 w-36 rounded border border-border bg-background px-2 text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  value={customModelInput}
                  onChange={(e) => setCustomModelInput(e.target.value)}
                />
                <Button
                  type="submit"
                  size="sm"
                  variant="default"
                  className="h-7 px-2 py-0 text-[11px]"
                >
                  Set
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 px-1.5 py-0 text-[11px]"
                  onClick={() => setIsAddingCustom(false)}
                >
                  <XMarkIcon className="size-3" />
                </Button>
              </form>
            ) : (
              <Select
                onValueChange={(val) => {
                  if (val === "__custom__") {
                    setIsAddingCustom(true)
                  } else if (val && onSelectModel) {
                    onSelectModel(val)
                  }
                }}
                value={activeModel}
                disabled={isModelsLoading}
              >
                <SelectTrigger className="h-8 w-[220px] max-w-[42vw] border-none bg-transparent! p-0 text-muted-foreground text-xs shadow-none hover:text-foreground focus:ring-0 sm:w-[280px]">
                  <SelectValue>
                    <span className="block min-w-0 text-left">
                      <span className="block truncate font-medium text-xs">
                        {modelOptions.find((m) => m.id === activeModel)?.name ||
                          activeModel}
                      </span>
                      {modelOptions.find((m) => m.id === activeModel)
                        ?.provider && (
                        <span className="block truncate text-[10px] text-muted-foreground">
                          {
                            modelOptions.find((m) => m.id === activeModel)
                              ?.provider
                          }
                        </span>
                      )}
                    </span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="w-[280px] max-w-[calc(100vw-2rem)]">
                  {modelOptions.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      <span className="block min-w-0 max-w-[240px]">
                        <span className="block break-all font-medium text-xs leading-4">
                          {model.name}
                        </span>
                        {model.provider && (
                          <span className="block truncate text-[10px] text-muted-foreground leading-3">
                            {model.provider}
                          </span>
                        )}
                      </span>
                    </SelectItem>
                  ))}
                  <SelectItem value="__custom__">
                    <span className="text-muted-foreground text-xs italic">
                      + Enter custom model ID...
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="ml-auto flex items-center gap-2">
            {isLoading ? (
              <Button
                type="button"
                variant="destructive"
                size="icon"
                aria-label="Stop generation"
                className="h-8 w-8 rounded-full shadow-xs"
                onClick={handleStop}
              >
                <StopIcon className="size-4" />
              </Button>
            ) : (
              <Button
                type="button"
                variant="default"
                size="icon"
                aria-label="Send message"
                className={cn(
                  "h-8 w-8 rounded-full transition-all",
                  inputValue.trim() && "shadow-md hover:bg-primary/90"
                )}
                disabled={!inputValue.trim()}
                onClick={() => handleSubmit()}
              >
                <ArrowUpIcon className="size-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Prompt Suggestions */}
      {showPrompts && (
        <div className="flex flex-wrap justify-center gap-2">
          {PROMPTS.map((p) => (
            <Button
              key={p.text}
              className="flex h-auto cursor-pointer items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-foreground text-xs transition-colors hover:bg-muted"
              onClick={() => handlePromptClick(p.prompt)}
              variant="ghost"
            >
              <SparklesIcon className="size-3 shrink-0 text-primary/80" />
              <span>{p.text}</span>
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}

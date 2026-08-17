import {
  ArrowUpIcon,
  PlusIcon,
  SparklesIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline"
import { StopIcon } from "@heroicons/react/24/solid"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Button } from "@workspace/ui/components/button"
import { DitherShell, DitherStatusTag } from "@workspace/ui/components/dither"
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
import { useState } from "react"
import { useAIModels } from "../hooks/use-ai-models"
import { useChatComposer } from "../hooks/use-chat-composer"
import { useReasoningShell } from "../hooks/use-reasoning-shell"

interface AIProvider {
  id: string
  name: string
  isActive: boolean
  defaultModel: string
}

interface AIProvidersResponse {
  providers: AIProvider[]
  activeProvider: AIProvider | null
}

interface ChatInputProps {
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
  isLoading = false,
  thinking,
  selectedModel,
  onSelectModel,
  showPrompts = true,
  autoFocus = true,
}) => {
  const [customModelInput, setCustomModelInput] = useState("")
  const [isAddingCustom, setIsAddingCustom] = useState(false)

  const composer = useChatComposer({ autoFocus, isLoading, onSend, onStop })
  const reasoning = useReasoningShell({ isLoading, thinking })

  const queryClient = useQueryClient()
  const authUrl =
    import.meta.env.VITE_BETTER_AUTH_URL ?? "http://localhost:4000"

  const { data: modelsData, isLoading: isModelsLoading } = useAIModels()
  const { data: providersData, isLoading: isProvidersLoading } =
    useQuery<AIProvidersResponse>({
      queryKey: ["agent", "settings", "ai"],
      queryFn: async () => {
        const response = await fetch(`${authUrl}/api/agent/settings/ai`, {
          credentials: "include",
        })
        if (!response.ok) throw new Error("Failed to load AI providers")
        return response.json()
      },
      staleTime: 30_000,
    })

  const selectProvider = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`${authUrl}/api/agent/settings/ai/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: true }),
      })
      if (!response.ok) throw new Error("Failed to switch AI provider")
      return id
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ["agent", "settings", "ai"] })
      queryClient.invalidateQueries({ queryKey: ["agent", "models"] })
      const provider = providersData?.providers.find((item) => item.id === id)
      if (provider?.defaultModel) onSelectModel?.(provider.defaultModel)
    },
  })

  const defaultModel = modelsData?.defaultModel || ""
  const activeModel = selectedModel || defaultModel

  // Dynamic models list fetched from provider API or active default
  const dynamicModels = modelsData?.models || []

  const modelOptions = [...dynamicModels]
  if (activeModel && !modelOptions.some((m) => m.id === activeModel)) {
    modelOptions.unshift({ id: activeModel, name: activeModel })
  }

  const handleAddCustomModel = (e: React.FormEvent) => {
    e.preventDefault()
    if (!customModelInput.trim()) return
    const newModel = customModelInput.trim()
    onSelectModel?.(newModel)
    setCustomModelInput("")
    setIsAddingCustom(false)
  }

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

        {/* Inner Chat Input Container */}
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

          {/* Bottom Actions Row with Provider & Model Dropdowns */}
          <div className="mt-auto flex min-h-[36px] items-center gap-2.5 pt-2">
            {/* Plus / Attach Button */}
            <button
              type="button"
              aria-label="Add context or attachment"
              className="flex size-5 cursor-pointer items-center justify-center text-muted-foreground/60 transition-colors hover:text-foreground focus-visible:outline-none"
            >
              <PlusIcon className="size-4 stroke-[1.5]" />
            </button>

            {/* AI Provider Dropdown */}
            <div className="relative flex items-center gap-2">
              <Select
                value={providersData?.activeProvider?.id ?? ""}
                onValueChange={(id) => {
                  if (id) selectProvider.mutate(id)
                }}
                disabled={
                  isProvidersLoading ||
                  selectProvider.isPending ||
                  !providersData?.providers.length
                }
              >
                <SelectTrigger
                  aria-label="Select AI provider"
                  className="h-7 w-[120px] max-w-[28vw] border-none bg-transparent! p-0 text-muted-foreground text-xs shadow-none hover:text-foreground focus:ring-0"
                >
                  <SelectValue placeholder="Provider">
                    <span className="block truncate text-left font-medium text-xs">
                      {providersData?.providers.find(
                        (provider) =>
                          provider.id === providersData.activeProvider?.id
                      )?.name ?? "Provider"}
                    </span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {providersData?.providers.map((provider) => (
                    <SelectItem key={provider.id} value={provider.id}>
                      {provider.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Model Dropdown / Custom Model Form */}
              {isAddingCustom ? (
                <form
                  onSubmit={handleAddCustomModel}
                  className="flex items-center gap-1.5"
                >
                  <input
                    type="text"
                    placeholder="Enter model ID..."
                    className="h-7 w-32 rounded border border-border bg-background px-2 text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
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
                  <SelectTrigger className="h-7 w-[180px] max-w-[38vw] border-none bg-transparent! p-0 text-muted-foreground text-xs shadow-none hover:text-foreground focus:ring-0 sm:w-[220px]">
                    <SelectValue>
                      <span className="block min-w-0 text-left">
                        <span className="block truncate font-medium text-xs">
                          {modelOptions.find((m) => m.id === activeModel)
                            ?.name || activeModel}
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
                  <SelectContent className="w-[260px] max-w-[calc(100vw-2rem)]">
                    {modelOptions.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        <span className="block min-w-0 max-w-[220px]">
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
                  disabled={!composer.inputValue.trim()}
                  onClick={() => composer.submit()}
                  className={cn(
                    "flex size-7 cursor-pointer items-center justify-center rounded-full bg-foreground/10 text-muted-foreground transition-all hover:bg-foreground/15 hover:text-foreground focus-visible:outline-none disabled:pointer-events-none disabled:opacity-30",
                    composer.inputValue.trim() &&
                      "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90"
                  )}
                >
                  <ArrowUpIcon className="size-3.5 stroke-[2.5]" />
                </button>
              )}
            </div>
          </div>
        </div>
      </DitherShell>

      {/* Prompt Suggestions */}
      {showPrompts && (
        <div className="flex flex-wrap justify-center gap-2">
          {PROMPTS.map((p) => (
            <button
              key={p.text}
              type="button"
              className="flex cursor-pointer items-center gap-1.5 rounded-full border border-border/60 bg-card/60 px-3 py-1.5 font-sans text-muted-foreground text-xs transition-colors hover:border-border hover:bg-muted hover:text-foreground"
              onClick={() => composer.sendPrompt(p.prompt)}
            >
              <SparklesIcon className="size-3 shrink-0 text-muted-foreground/60" />
              <span>{p.text}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

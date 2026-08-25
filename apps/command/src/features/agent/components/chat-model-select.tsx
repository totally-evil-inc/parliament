import { XMarkIcon } from "@heroicons/react/24/outline"
import { Button } from "@workspace/ui/components/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import type React from "react"
import { memo, useMemo, useState } from "react"
import { useAIModels } from "../hooks/use-ai-models"
import { useAIProviders, useSwitchAIProvider } from "../hooks/use-ai-providers"

interface ChatModelSelectProps {
  selectedModel?: string
  onSelectModel?: (model: string) => void
}

export const ChatModelSelect: React.FC<ChatModelSelectProps> = memo(
  ({ selectedModel, onSelectModel }) => {
    const [customModelInput, setCustomModelInput] = useState("")
    const [isAddingCustom, setIsAddingCustom] = useState(false)

    const { data: modelsData, isLoading: isModelsLoading } = useAIModels()
    const { data: providersData, isLoading: isProvidersLoading } =
      useAIProviders()

    const switchProvider = useSwitchAIProvider({
      onProviderSwitched: (defaultModel) => {
        if (defaultModel && onSelectModel) {
          onSelectModel(defaultModel)
        }
      },
    })

    const defaultModel = modelsData?.defaultModel || ""
    const activeModel = selectedModel || defaultModel

    const modelOptions = useMemo(() => {
      const dynamicModels = modelsData?.models || []
      const options = [...dynamicModels]
      if (activeModel && !options.some((m) => m.id === activeModel)) {
        options.unshift({ id: activeModel, name: activeModel })
      }
      return options
    }, [modelsData?.models, activeModel])

    const handleAddCustomModel = (e: React.FormEvent) => {
      e.preventDefault()
      const trimmed = customModelInput.trim()
      if (!trimmed) return
      onSelectModel?.(trimmed)
      setCustomModelInput("")
      setIsAddingCustom(false)
    }

    const activeProviderName = useMemo(() => {
      if (!providersData?.providers.length) return "Provider"
      return (
        providersData.providers.find(
          (p) => p.id === providersData.activeProvider?.id
        )?.name ?? "Provider"
      )
    }, [providersData])

    const activeModelItem = useMemo(() => {
      return modelOptions.find((m) => m.id === activeModel)
    }, [modelOptions, activeModel])

    return (
      <div className="relative flex items-center gap-2">
        {/* AI Provider Dropdown */}
        <Select
          value={providersData?.activeProvider?.id ?? ""}
          onValueChange={(id) => {
            if (id) switchProvider.mutate(id)
          }}
          disabled={
            isProvidersLoading ||
            switchProvider.isPending ||
            !providersData?.providers?.length
          }
        >
          <SelectTrigger
            aria-label="Select AI provider"
            className="h-7 w-[120px] max-w-[28vw] border-none bg-transparent! p-0 text-muted-foreground text-xs shadow-none hover:text-foreground focus:ring-0"
          >
            <SelectValue placeholder="Provider">
              <span className="block truncate text-left font-medium text-xs">
                {activeProviderName}
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
              aria-label="Cancel custom model"
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
                    {activeModelItem?.name || activeModel}
                  </span>
                  {activeModelItem?.provider ? (
                    <span className="block truncate text-[10px] text-muted-foreground">
                      {activeModelItem.provider}
                    </span>
                  ) : null}
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
                    {model.provider ? (
                      <span className="block truncate text-[10px] text-muted-foreground leading-3">
                        {model.provider}
                      </span>
                    ) : null}
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
    )
  }
)

ChatModelSelect.displayName = "ChatModelSelect"

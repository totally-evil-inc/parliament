import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline"
import { Button } from "@workspace/ui/components/button"
import { DitherSlider } from "@workspace/ui/components/dither"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover"
import { ScrollArea } from "@workspace/ui/components/scroll-area"
import { cn } from "@workspace/ui/lib/utils"
import type React from "react"
import { useMemo, useState } from "react"

export interface ModelOption {
  id: string
  name: string
  provider?: string
}

export interface ModelConfig {
  speed: "Slow" | "Balanced" | "Fast"
  effort: "Low" | "Medium" | "Max"
}

interface ModelConfigPopoverProps {
  models: ModelOption[]
  selectedModel: string
  onSelectModel: (modelId: string, config?: ModelConfig) => void
  disabled?: boolean
}

const SPEED_OPTIONS = ["Slow", "Balanced", "Fast"]
const EFFORT_OPTIONS = ["Low", "Medium", "Max"]

export const ModelConfigPopover: React.FC<ModelConfigPopoverProps> = ({
  models,
  selectedModel,
  onSelectModel,
  disabled = false,
}) => {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [activeConfigModel, setActiveConfigModel] =
    useState<ModelOption | null>(null)
  const [config, setConfig] = useState<ModelConfig>({
    speed: "Balanced",
    effort: "Medium",
  })

  const currentModelName = useMemo(() => {
    return (
      models.find((m) => m.id === selectedModel)?.name ||
      selectedModel ||
      "Model"
    )
  }, [models, selectedModel])

  const filteredModels = useMemo(() => {
    if (!search.trim()) return models
    const query = search.toLowerCase()
    return models.filter(
      (m) =>
        m.name.toLowerCase().includes(query) ||
        m.id.toLowerCase().includes(query) ||
        m.provider?.toLowerCase().includes(query)
    )
  }, [models, search])

  const handleOpenConfig = (model: ModelOption) => {
    setActiveConfigModel(model)
  }

  const handleApply = () => {
    if (activeConfigModel) {
      onSelectModel(activeConfigModel.id, config)
    }
    setOpen(false)
    setActiveConfigModel(null)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            className="inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-full px-2 font-sans text-muted-foreground text-xs transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40 disabled:pointer-events-none disabled:opacity-40"
            disabled={disabled}
          />
        }
      >
        <span className="text-[#ff6b6b] text-sm leading-none">✳</span>
        <span className="max-w-[160px] truncate font-medium text-foreground/90">
          {currentModelName}
        </span>
        {config.effort === "Max" && (
          <span className="text-[10px] text-amber-400">Max</span>
        )}
        <span className="text-[10px] opacity-60">▾</span>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        side="top"
        sideOffset={8}
        className="w-72 border-border/80 bg-popover/95 p-3 shadow-xl backdrop-blur-md"
      >
        {activeConfigModel ? (
          /* Sub-View: Model Parameter Configuration */
          <div className="flex flex-col gap-3 font-sans text-xs">
            <div className="flex items-center gap-2 border-border/60 border-b pb-2">
              <button
                type="button"
                onClick={() => setActiveConfigModel(null)}
                className="flex size-5 cursor-pointer items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <ChevronLeftIcon className="size-3.5" />
              </button>
              <span className="truncate font-semibold text-foreground text-xs">
                {activeConfigModel.name}
              </span>
            </div>

            <div className="flex flex-col gap-3.5 py-1">
              <DitherSlider
                label="Speed"
                options={SPEED_OPTIONS}
                value={config.speed}
                onChange={(val) =>
                  setConfig((prev) => ({
                    ...prev,
                    speed: val as ModelConfig["speed"],
                  }))
                }
                color="blue"
                bloom="low"
              />

              <DitherSlider
                label="Effort"
                options={EFFORT_OPTIONS}
                value={config.effort}
                onChange={(val) =>
                  setConfig((prev) => ({
                    ...prev,
                    effort: val as ModelConfig["effort"],
                  }))
                }
                color="amber"
                bloom="low"
              />
            </div>

            <Button
              type="button"
              size="sm"
              onClick={handleApply}
              className="mt-1 h-8 w-full text-xs"
            >
              Apply
            </Button>
          </div>
        ) : (
          /* Main View: Search & Model List */
          <div className="flex flex-col gap-2 font-sans text-xs">
            {/* Search Box */}
            <div className="relative flex items-center">
              <MagnifyingGlassIcon className="absolute left-2.5 size-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search models..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 w-full rounded-md border border-border/60 bg-background/60 pr-2 pl-8 text-foreground text-xs placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none"
              />
            </div>

            {/* Model List with ScrollArea */}
            <ScrollArea className="max-h-56 pr-1">
              {filteredModels.length === 0 ? (
                <div className="py-4 text-center text-muted-foreground text-xs">
                  No models found
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  {filteredModels.map((model) => {
                    const isCurrent = model.id === selectedModel
                    return (
                      <div
                        key={model.id}
                        className={cn(
                          "group flex items-center justify-between rounded-md transition-colors hover:bg-muted",
                          isCurrent && "bg-muted/70"
                        )}
                      >
                        <button
                          type="button"
                          className="flex min-w-0 flex-1 cursor-pointer flex-col rounded-l-md px-2 py-1.5 text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40"
                          onClick={() => {
                            onSelectModel(model.id, config)
                            setOpen(false)
                          }}
                        >
                          <span className="truncate font-medium text-foreground text-xs">
                            {model.name}
                          </span>
                          {model.provider && (
                            <span className="truncate text-[10px] text-muted-foreground">
                              {model.provider}
                            </span>
                          )}
                        </button>

                        <button
                          type="button"
                          title="Configure model parameters"
                          onClick={() => handleOpenConfig(model)}
                          className="mr-1 flex size-6 cursor-pointer items-center justify-center rounded text-muted-foreground opacity-60 transition-opacity hover:bg-muted-foreground/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40 group-hover:opacity-100"
                        >
                          <ChevronRightIcon className="size-3.5" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </ScrollArea>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

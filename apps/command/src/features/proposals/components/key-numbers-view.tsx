import { NodeViewWrapper } from "@tiptap/react"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { HugeiconsIcon } from "@hugeicons/react"
import { Delete02Icon, PlusSignIcon } from "@hugeicons/core-free-icons"
import type { NodeViewProps } from "@tiptap/react"

export function KeyNumbersView({ node, updateAttributes }: NodeViewProps) {
  const { metrics, columns } = node.attrs

  const updateMetric = (index: number, key: string, value: string) => {
    const newMetrics = [...metrics]
    newMetrics[index] = { ...newMetrics[index], [key]: value }
    updateAttributes({ metrics: newMetrics })
  }

  const addMetric = () => {
    updateAttributes({
      metrics: [...metrics, { label: "New Metric", value: "0" }],
    })
  }

  const removeMetric = (index: number) => {
    updateAttributes({
      metrics: metrics.filter((_: any, i: number) => i !== index),
    })
  }

  return (
    <NodeViewWrapper className="key-numbers my-12 rounded-xl border-2 border-dashed border-muted-foreground/20 p-8 transition-colors hover:border-primary/30">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-sm font-bold tracking-widest text-muted-foreground uppercase">
          Key Numbers
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={addMetric}
          className="h-8 gap-1.5 text-xs"
        >
          <HugeiconsIcon icon={PlusSignIcon} className="h-3.5 w-3.5" />
          Add Metric
        </Button>
      </div>

      <div className={`grid gap-8 grid-cols-${columns}`}>
        {metrics.map((metric: any, index: number) => (
          <div
            key={index}
            className="group relative flex flex-col items-center justify-center gap-1 text-center"
          >
            <Input
              className="h-auto rounded-none border-x-0 border-t-0 border-b border-transparent bg-transparent p-0 text-center text-4xl font-black tracking-tight shadow-none hover:border-border focus-visible:border-border focus-visible:ring-0"
              value={metric.value}
              onChange={(e) => updateMetric(index, "value", e.target.value)}
            />
            <Input
              className="h-auto rounded-none border-x-0 border-t-0 border-b border-transparent bg-transparent p-0 text-center text-xs font-bold tracking-widest text-muted-foreground uppercase shadow-none hover:border-border focus-visible:border-border focus-visible:ring-0"
              value={metric.label}
              onChange={(e) => updateMetric(index, "label", e.target.value)}
            />

            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => removeMetric(index)}
              className="absolute -top-2 -right-2 text-destructive opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive/80"
              aria-label="Remove metric"
            >
              <HugeiconsIcon icon={Delete02Icon} className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </NodeViewWrapper>
  )
}

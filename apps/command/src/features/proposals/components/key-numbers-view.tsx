import { NodeViewWrapper } from "@tiptap/react"
import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"
import type { NodeViewProps } from "@tiptap/react"

const inputClassName =
  "h-auto rounded-none !border-0 !bg-transparent !p-0 text-center shadow-none !outline-none !ring-0 hover:!border-transparent focus-visible:!border-transparent focus-visible:!ring-0 dark:!bg-transparent"

export function KeyNumbersView({ node, updateAttributes }: NodeViewProps) {
  const { metrics, columns } = node.attrs

  const updateMetric = (index: number, key: string, value: string) => {
    const newMetrics = [...metrics]
    newMetrics[index] = { ...newMetrics[index], [key]: value }
    updateAttributes({ metrics: newMetrics })
  }

  const gridColumns =
    columns === 1
      ? "grid-cols-1"
      : columns === 2
        ? "grid-cols-1 md:grid-cols-2"
        : "grid-cols-1 md:grid-cols-3"

  return (
    <NodeViewWrapper className="key-numbers my-12">
      <div className={`grid gap-x-16 gap-y-14 ${gridColumns}`}>
        {metrics.map((metric: any, index: number) => (
          <div
            key={index}
            className="flex flex-col items-center justify-start text-center"
          >
            <Input
              aria-label="Metric value"
              spellCheck={false}
              className={`${inputClassName} text-5xl font-black tracking-tight md:text-6xl`}
              value={metric.value}
              onChange={(e) => updateMetric(index, "value", e.target.value)}
            />
            <Input
              aria-label="Metric summary"
              spellCheck={false}
              className={`${inputClassName} mt-4 text-lg font-bold tracking-tight md:text-xl`}
              value={metric.label}
              onChange={(e) => updateMetric(index, "label", e.target.value)}
            />
            <Textarea
              aria-label="Metric description"
              rows={2}
              spellCheck={false}
              className={`${inputClassName} mt-4 min-h-0 resize-none overflow-hidden text-lg leading-relaxed text-muted-foreground md:text-xl`}
              value={metric.detail ?? ""}
              onChange={(e) => updateMetric(index, "detail", e.target.value)}
            />
          </div>
        ))}
      </div>
    </NodeViewWrapper>
  )
}

import { NodeViewWrapper } from "@tiptap/react"
import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"
import type { NodeViewProps } from "@tiptap/react"
import type { KeyNumberMetric } from "@/features/proposals/types"
import { getArrayAttr, getColumnCount } from "@/features/proposals/types"

const inputClassName =
  "h-auto rounded-none !border-0 !bg-transparent !p-0 text-center shadow-none !outline-none !ring-0 hover:!border-transparent focus-visible:!border-transparent focus-visible:!ring-0 dark:!bg-transparent"

function getMetricKey(metric: KeyNumberMetric) {
  return metric.id || `metric-${metric.value}-${metric.label}-${metric.detail}`
}

export function KeyNumbersView({ node, updateAttributes }: NodeViewProps) {
  const metrics = getArrayAttr<KeyNumberMetric>(node.attrs.metrics)
  const columns = getColumnCount(node.attrs.columns)

  const updateMetric = (
    index: number,
    key: keyof KeyNumberMetric,
    value: string
  ) => {
    const newMetrics = [...metrics]
    newMetrics[index] = {
      ...newMetrics[index],
      id: getMetricKey(newMetrics[index]),
      [key]: value,
    }
    updateAttributes({ metrics: newMetrics })
  }

  const gridColumns =
    columns === 1
      ? "grid-cols-1"
      : columns === 2
        ? "grid-cols-1 md:grid-cols-2"
        : "grid-cols-1 md:grid-cols-3"

  return (
    <NodeViewWrapper className="key-numbers my-[var(--document-section-spacing)]">
      <div className={`grid gap-x-16 gap-y-14 ${gridColumns}`}>
        {metrics.map((metric, index) => (
          <div
            key={getMetricKey(metric)}
            className="flex flex-col items-center justify-start text-center"
          >
            <Input
              aria-label="Metric value"
              spellCheck={false}
              className={`${inputClassName} text-3xl font-black tracking-tight text-[var(--document-accent)] md:text-5xl`}
              value={metric.value}
              onChange={(e) => updateMetric(index, "value", e.target.value)}
            />
            <Input
              aria-label="Metric summary"
              spellCheck={false}
              className={`${inputClassName} text-base font-bold tracking-tight text-[var(--document-foreground)] md:text-lg`}
              value={metric.label}
              onChange={(e) => updateMetric(index, "label", e.target.value)}
            />
            <Textarea
              aria-label="Metric description"
              rows={2}
              spellCheck={false}
              className={`${inputClassName} min-h-0 resize-none overflow-hidden text-base leading-relaxed text-[var(--document-muted-foreground)] md:text-lg`}
              value={metric.detail ?? ""}
              onChange={(e) => updateMetric(index, "detail", e.target.value)}
            />
          </div>
        ))}
      </div>
    </NodeViewWrapper>
  )
}

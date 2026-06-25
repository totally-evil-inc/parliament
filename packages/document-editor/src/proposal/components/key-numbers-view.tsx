import { NodeViewWrapper } from "@tiptap/react"
import type { NodeViewProps } from "@tiptap/react"
import { EmbeddedCardEditor } from "./embedded-card-editor"
import {
  KeyNumbersValue,
  KeyNumbersLabel,
  KeyNumbersDetail,
} from "../extensions/key-numbers"

export function KeyNumbersView({ node, updateAttributes }: NodeViewProps) {
  const columns = node.attrs.columns ?? 3
  const items = node.attrs.items ?? []

  const updateItem = (index: number, updatedItem: any) => {
    const newItems = [...items]
    newItems[index] = updatedItem
    updateAttributes({ items: newItems })
  }

  const gridStyles = {
    display: "flex",
    flexWrap: "wrap" as const,
    justifyContent: "center",
    gap: "3rem 2.5rem",
    width: "100%",
    margin: "2.5rem 0",
  }

  const cardWidth =
    columns === 1
      ? "100%"
      : columns === 2
        ? "calc(50% - 1.25rem)"
        : "calc(33.333% - 1.666rem)"

  return (
    <NodeViewWrapper
      className="key-numbers my-[var(--document-section-spacing)] outline-none"
      data-drag-handle=""
    >
      <div style={gridStyles}>
        {items.map((item: any, index: number) => (
          <div
            key={item.id || index}
            style={{ flex: `0 0 ${cardWidth}`, maxWidth: cardWidth }}
            className="rounded-xl p-6"
          >
            <EmbeddedCardEditor
              extensions={[KeyNumbersValue, KeyNumbersLabel, KeyNumbersDetail]}
              fields={[
                { key: "value", nodeType: "keyNumbersValue" },
                { key: "label", nodeType: "keyNumbersLabel" },
                { key: "detail", nodeType: "keyNumbersDetail" },
              ]}
              item={item}
              onUpdate={(updated) => updateItem(index, updated)}
            />
          </div>
        ))}
      </div>
    </NodeViewWrapper>
  )
}

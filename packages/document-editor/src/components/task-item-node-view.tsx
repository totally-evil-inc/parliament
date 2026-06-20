import { NodeViewContent, NodeViewWrapper } from "@tiptap/react"
import { Checkbox } from "@workspace/ui/components/checkbox"
import type { NodeViewProps } from "@tiptap/react"

export function TaskItemNodeView({ node, updateAttributes }: NodeViewProps) {
  const checked = Boolean(node.attrs.checked)

  return (
    <NodeViewWrapper
      as="li"
      className="flex list-none items-start gap-2 py-1 pl-0"
      data-checked={checked ? "true" : "false"}
      data-type="taskItem"
    >
      <Checkbox
        aria-label={
          checked ? "Mark task as incomplete" : "Mark task as complete"
        }
        checked={checked}
        className="mt-1"
        contentEditable={false}
        onCheckedChange={(nextChecked) => {
          updateAttributes({ checked: nextChecked === true })
        }}
      />
      <NodeViewContent className="min-w-0 flex-1 [&_p]:m-0" />
    </NodeViewWrapper>
  )
}

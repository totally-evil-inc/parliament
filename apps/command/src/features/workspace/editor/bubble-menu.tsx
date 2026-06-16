import { BubbleMenu } from "@tiptap/react/menus"
import { Toggle } from "@workspace/ui/components/toggle"
import { HugeiconsIcon } from "@hugeicons/react"
import type { Editor } from "@tiptap/react"
import { bubbleMenuCommands } from "@/lib/editor/commands"

export const EditorBubbleMenu = ({ editor }: { editor: Editor }) => {
  return (
    <BubbleMenu
      editor={editor}
      className="flex items-center gap-1 rounded-md border bg-popover p-1 shadow-md"
    >
      {bubbleMenuCommands.map((command) => (
        <div key={command.id} className="flex items-center gap-1">
          <Toggle
            size="sm"
            pressed={command.isActive?.(editor) ?? false}
            onPressedChange={() => command.command({ editor })}
          >
            <HugeiconsIcon icon={command.icon} className="h-4 w-4" />
          </Toggle>
        </div>
      ))}
    </BubbleMenu>
  )
}

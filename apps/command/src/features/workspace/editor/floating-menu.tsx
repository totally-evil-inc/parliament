import { FloatingMenu } from "@tiptap/react/menus"
import { Plus } from "@hugeicons/core-free-icons"
import { Button } from "@workspace/ui/components/button"
import { HugeiconsIcon } from "@hugeicons/react"
import type { Editor } from "@tiptap/react"

export const EditorFloatingMenu = ({ editor }: { editor: Editor }) => {
  return (
    <FloatingMenu editor={editor} className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 rounded-full border bg-background p-0 shadow-sm hover:bg-accent"
        onClick={() => {
          editor.chain().focus().insertContent("/").run()
        }}
      >
        <HugeiconsIcon icon={Plus} className="h-4 w-4 text-muted-foreground" />
      </Button>
    </FloatingMenu>
  )
}

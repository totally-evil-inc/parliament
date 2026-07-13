import { HugeiconsIcon } from "@hugeicons/react"
import "@tiptap/extension-table/table"
import type { Editor } from "@tiptap/react"
import { useEditorState } from "@tiptap/react"
import { BubbleMenu } from "@tiptap/react/menus"
import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { Toggle } from "@workspace/ui/components/toggle"
import type { EditorCommand } from "../../commands/types"

type BubbleVisibilityState = Pick<Editor, "isEditable" | "isFocused"> & {
  state: {
    selection: {
      empty: boolean
      node?: unknown
      $anchorCell?: unknown
      $from?: { parent?: { inlineContent?: boolean } }
      $to?: { parent?: { inlineContent?: boolean } }
    }
  }
}

export function shouldShowEditorBubbleMenu(editor: BubbleVisibilityState) {
  const selection = editor.state.selection
  const isNodeSelection = "node" in selection && Boolean(selection.node)
  const isCellSelection = "$anchorCell" in selection
  const isTextSelection =
    selection.$from?.parent?.inlineContent === true ||
    selection.$to?.parent?.inlineContent === true

  return (
    editor.isFocused &&
    editor.isEditable &&
    !selection.empty &&
    !isNodeSelection &&
    !isCellSelection &&
    isTextSelection
  )
}

export function EditorBubbleMenu({
  editor,
  pluginKey,
  commands,
}: {
  editor: Editor
  pluginKey: string
  commands: Array<EditorCommand>
}) {
  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      active: Object.fromEntries(
        commands.map((command) => [
          command.id,
          command.isActive?.(current) ?? false,
        ])
      ),
    }),
  })

  if (commands.length === 0) return null

  return (
    <BubbleMenu
      editor={editor}
      pluginKey={pluginKey}
      appendTo={() => document.body}
      options={{
        strategy: "fixed",
        placement: "top",
        offset: 8,
        flip: true,
        shift: true,
        inline: true,
      }}
      shouldShow={({ editor: current }) => shouldShowEditorBubbleMenu(current)}
      className="no-scrollbar z-50 flex max-w-[90vw] items-center gap-1 overflow-x-auto rounded-md border bg-popover p-1 shadow-md"
    >
      {commands.map((command) => (
        <Toggle
          key={command.id}
          size="sm"
          pressed={Boolean(state.active[command.id])}
          onPressedChange={() => command.command({ editor })}
        >
          <HugeiconsIcon icon={command.icon} className="h-4 w-4" />
        </Toggle>
      ))}
    </BubbleMenu>
  )
}

type TableMenuItem = {
  id: string
  label: string
  destructive?: boolean
  description?: string
  run: (editor: Editor) => void
}

const groups: Array<{ label: string; items: Array<TableMenuItem> }> = [
  {
    label: "Rows",
    items: [
      {
        id: "add-row-before",
        label: "Add row above",
        run: (editor) => editor.chain().focus().addRowBefore().run(),
      },
      {
        id: "add-row-after",
        label: "Add row below",
        run: (editor) => editor.chain().focus().addRowAfter().run(),
      },
      {
        id: "delete-row",
        label: "Delete row",
        destructive: true,
        description: "This will remove the selected table row.",
        run: (editor) => editor.chain().focus().deleteRow().run(),
      },
    ],
  },
  {
    label: "Columns",
    items: [
      {
        id: "add-column-before",
        label: "Add column before",
        run: (editor) => editor.chain().focus().addColumnBefore().run(),
      },
      {
        id: "add-column-after",
        label: "Add column after",
        run: (editor) => editor.chain().focus().addColumnAfter().run(),
      },
      {
        id: "delete-column",
        label: "Delete column",
        destructive: true,
        description: "This will remove the selected table column.",
        run: (editor) => editor.chain().focus().deleteColumn().run(),
      },
    ],
  },
  {
    label: "Cells",
    items: [
      {
        id: "toggle-header-row",
        label: "Toggle header row",
        run: (editor) => editor.chain().focus().toggleHeaderRow().run(),
      },
      {
        id: "toggle-header-column",
        label: "Toggle header column",
        run: (editor) => editor.chain().focus().toggleHeaderColumn().run(),
      },
      {
        id: "toggle-header-cell",
        label: "Toggle header cell",
        run: (editor) => editor.chain().focus().toggleHeaderCell().run(),
      },
      {
        id: "merge-or-split",
        label: "Merge or split cells",
        run: (editor) => editor.chain().focus().mergeOrSplit().run(),
      },
    ],
  },
]

const deleteTable: TableMenuItem = {
  id: "delete-table",
  label: "Delete table",
  destructive: true,
  description: "This will remove the entire table from the document.",
  run: (editor) => editor.chain().focus().deleteTable().run(),
}

export type ConfirmEditorAction = (options: {
  title: string
  description?: string
  confirmLabel: string
  variant: "destructive"
}) => Promise<boolean>

export function EditorTableMenu({
  editor,
  confirm,
}: {
  editor: Editor
  confirm: ConfirmEditorAction
}) {
  const select = async (item: TableMenuItem) => {
    if (
      item.destructive &&
      !(await confirm({
        title: `${item.label}?`,
        description: item.description,
        confirmLabel: item.label,
        variant: "destructive",
      }))
    )
      return
    item.run(editor)
  }

  const renderItem = (item: TableMenuItem) => (
    <DropdownMenuItem
      key={item.id}
      variant={item.destructive ? "destructive" : "default"}
      onClick={() => void select(item)}
    >
      {item.label}
    </DropdownMenuItem>
  )

  return (
    <BubbleMenu
      editor={editor}
      appendTo={() => document.body}
      options={{
        strategy: "fixed",
        placement: "top",
        offset: 8,
        flip: true,
        shift: true,
        inline: true,
      }}
      shouldShow={({ editor: current }) =>
        current.isFocused && current.isActive("table")
      }
      className="z-50 flex items-center gap-1 rounded-md border bg-popover p-1 shadow-md"
    >
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button type="button" variant="ghost" size="sm">
              Table
            </Button>
          }
        />
        <DropdownMenuContent align="start" className="w-48">
          {groups.map((group, index) => (
            <div key={group.label}>
              {index > 0 ? <DropdownMenuSeparator /> : null}
              <DropdownMenuGroup>
                <DropdownMenuLabel>{group.label}</DropdownMenuLabel>
                {group.items.map(renderItem)}
              </DropdownMenuGroup>
            </div>
          ))}
          <DropdownMenuSeparator />
          {renderItem(deleteTable)}
        </DropdownMenuContent>
      </DropdownMenu>
    </BubbleMenu>
  )
}

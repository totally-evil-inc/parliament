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
import type { Editor } from "@tiptap/react"

type TableMenuItem = {
  id: string
  label: string
  variant?: "default" | "destructive"
  command: (editor: Editor) => void
}

const rowCommands: Array<TableMenuItem> = [
  {
    id: "add-row-before",
    label: "Add row above",
    command: (editor) => editor.chain().focus().addRowBefore().run(),
  },
  {
    id: "add-row-after",
    label: "Add row below",
    command: (editor) => editor.chain().focus().addRowAfter().run(),
  },
  {
    id: "delete-row",
    label: "Delete row",
    command: (editor) => editor.chain().focus().deleteRow().run(),
  },
]

const columnCommands: Array<TableMenuItem> = [
  {
    id: "add-column-before",
    label: "Add column before",
    command: (editor) => editor.chain().focus().addColumnBefore().run(),
  },
  {
    id: "add-column-after",
    label: "Add column after",
    command: (editor) => editor.chain().focus().addColumnAfter().run(),
  },
  {
    id: "delete-column",
    label: "Delete column",
    command: (editor) => editor.chain().focus().deleteColumn().run(),
  },
]

const tableCommands: Array<TableMenuItem> = [
  {
    id: "toggle-header-row",
    label: "Toggle header row",
    command: (editor) => editor.chain().focus().toggleHeaderRow().run(),
  },
  {
    id: "toggle-header-column",
    label: "Toggle header column",
    command: (editor) => editor.chain().focus().toggleHeaderColumn().run(),
  },
  {
    id: "toggle-header-cell",
    label: "Toggle header cell",
    command: (editor) => editor.chain().focus().toggleHeaderCell().run(),
  },
  {
    id: "merge-or-split",
    label: "Merge or split cells",
    command: (editor) => editor.chain().focus().mergeOrSplit().run(),
  },
]

const destructiveCommands: Array<TableMenuItem> = [
  {
    id: "delete-table",
    label: "Delete table",
    variant: "destructive",
    command: (editor) => editor.chain().focus().deleteTable().run(),
  },
]

const renderMenuItems = (items: Array<TableMenuItem>, editor: Editor) =>
  items.map((item) => (
    <DropdownMenuItem
      key={item.id}
      variant={item.variant}
      onClick={() => item.command(editor)}
    >
      {item.label}
    </DropdownMenuItem>
  ))

export const EditorTableMenu = ({ editor }: { editor: Editor }) => {
  return (
    <BubbleMenu
      editor={editor}
      shouldShow={({ editor: currentEditor }) =>
        currentEditor.isActive("table")
      }
      className="flex items-center gap-1 rounded-md border bg-popover p-1 shadow-md"
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
          <DropdownMenuGroup>
            <DropdownMenuLabel>Rows</DropdownMenuLabel>
            {renderMenuItems(rowCommands, editor)}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuLabel>Columns</DropdownMenuLabel>
            {renderMenuItems(columnCommands, editor)}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuLabel>Cells</DropdownMenuLabel>
            {renderMenuItems(tableCommands, editor)}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          {renderMenuItems(destructiveCommands, editor)}
        </DropdownMenuContent>
      </DropdownMenu>
    </BubbleMenu>
  )
}

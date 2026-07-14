import { HugeiconsIcon } from "@hugeicons/react"
import type { Range } from "@tiptap/core"
import { Extension } from "@tiptap/core"
import type { Editor } from "@tiptap/react"
import { ReactRenderer } from "@tiptap/react"
import Suggestion from "@tiptap/suggestion"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@workspace/ui/components/command"
import type { Ref } from "react"
import { useEffect, useImperativeHandle, useRef, useState } from "react"
import type { Instance, Props as TippyProps } from "tippy.js"
import tippy from "tippy.js"
import type { EditorCommand } from "../../commands/types"

import {
  editorCommandsForSurface,
  filterEditorCommands,
} from "../../commands/types"

type SlashCommandListProps = {
  items: Array<EditorCommand>
  command: (item: EditorCommand) => void
  ref?: Ref<SlashCommandListRef>
}

export type SlashCommandListRef = {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean
}

export function SlashCommandList({
  items,
  command,
  ref,
}: SlashCommandListProps) {
  const [selection, setSelection] = useState({ items, index: 0 })
  const selectedIndex =
    selection.items === items
      ? Math.min(selection.index, Math.max(items.length - 1, 0))
      : 0
  const selectedIndexRef = useRef(selectedIndex)

  selectedIndexRef.current = selectedIndex

  useEffect(() => {
    setSelection({ items, index: 0 })
  }, [items])

  const selectItem = (index: number) => {
    const item = items[index]
    if (item) command(item)
  }

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (!items.length) return false
      if (event.key === "ArrowUp" || event.key === "ArrowDown") {
        const direction = event.key === "ArrowUp" ? -1 : 1
        setSelection((current) => ({
          items,
          index:
            current.items === items
              ? (current.index + direction + items.length) % items.length
              : direction < 0
                ? items.length - 1
                : 0,
        }))
        return true
      }
      if (event.key === "Enter") {
        selectItem(selectedIndexRef.current)
        return true
      }
      return false
    },
  }))

  return (
    <Command
      shouldFilter={false}
      className="w-75 rounded-lg border bg-popover text-popover-foreground shadow-md"
    >
      <CommandList>
        {items.length === 0 ? (
          <CommandEmpty>No results found.</CommandEmpty>
        ) : (
          <CommandGroup heading="Commands">
            {items.map((item, index) => (
              <CommandItem
                key={item.id}
                value={item.id}
                onMouseEnter={() => setSelection({ items, index })}
                onSelect={() => selectItem(index)}
                className={`flex cursor-pointer items-center gap-2 px-2 py-1 ${index === selectedIndex ? "bg-accent text-accent-foreground" : ""}`}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border bg-background">
                  <HugeiconsIcon
                    icon={item.icon as never}
                    className="h-4 w-4"
                  />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium text-sm">{item.title}</p>
                  <p className="truncate text-muted-foreground text-xs">
                    {item.description}
                  </p>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </Command>
  )
}

type RendererProps = {
  editor: Editor
  clientRect?: (() => DOMRect | null) | null
  items: Array<EditorCommand>
  command: (item: EditorCommand) => void
  range: Range
}

function renderSlashCommandItems() {
  let component: ReactRenderer<SlashCommandListRef> | null = null
  let popup: Array<Instance<TippyProps>> | null = null
  return {
    onStart: (props: RendererProps) => {
      if (!props.clientRect) return
      component = new ReactRenderer(SlashCommandList, {
        props,
        editor: props.editor,
      })
      popup = tippy("body", {
        getReferenceClientRect: () => props.clientRect?.() ?? new DOMRect(),
        appendTo: () => document.body,
        content: component.element,
        showOnCreate: true,
        interactive: true,
        trigger: "manual",
        placement: "bottom-start",
      })
    },
    onUpdate: (props: RendererProps) => {
      component?.updateProps(props)
      if (props.clientRect)
        popup?.[0]?.setProps({
          getReferenceClientRect: () => props.clientRect?.() ?? new DOMRect(),
        })
    },
    onKeyDown: (props: { event: KeyboardEvent }) => {
      if (props.event.key === "Escape") {
        popup?.[0]?.hide()
        return true
      }
      return component?.ref?.onKeyDown(props) ?? false
    },
    onExit: () => {
      popup?.[0]?.destroy()
      component?.destroy()
      popup = null
      component = null
    },
  }
}

export const SlashCommand = Extension.create<{
  commands: Array<EditorCommand>
}>({
  name: "slashCommand",
  addOptions: () => ({ commands: [] }),
  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        char: "/",
        startOfLine: true,
        allow: ({ editor, range }) => {
          const $from = editor.state.doc.resolve(range.from)
          return (
            editor.isEditable &&
            $from.parent.isTextblock &&
            range.from === $from.start()
          )
        },
        items: ({ query }) =>
          filterEditorCommands(
            query,
            editorCommandsForSurface(this.options.commands, "slash")
          ),
        render: renderSlashCommandItems,
        command: ({ editor, range, props }) => props.command({ editor, range }),
      }),
    ]
  },
})

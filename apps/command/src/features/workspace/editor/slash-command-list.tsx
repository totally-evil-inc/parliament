import { useImperativeHandle, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@workspace/ui/components/command"
import type { Ref } from "react"
import type { EditorCommand } from "@/lib/editor/commands"

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

  let selectedIndex = selection.index

  if (selection.items !== items) {
    selectedIndex = 0
    setSelection({ items, index: 0 })
  }

  const selectItem = (index: number) => {
    if (index < 0 || index >= items.length) {
      return
    }

    command(items[index])
  }

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (!items.length) {
        return false
      }

      if (event.key === "ArrowUp") {
        setSelection((current) =>
          current.items === items
            ? {
                items,
                index: (current.index + items.length - 1) % items.length,
              }
            : { items, index: items.length - 1 }
        )
        return true
      }

      if (event.key === "ArrowDown") {
        setSelection((current) =>
          current.items === items
            ? { items, index: (current.index + 1) % items.length }
            : { items, index: 0 }
        )
        return true
      }

      if (event.key === "Enter") {
        selectItem(selectedIndex)
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
            {items.map((item, index) => {
              const isSelected = index === selectedIndex

              return (
                <CommandItem
                  key={item.id}
                  value={item.id}
                  onMouseEnter={() => setSelection({ items, index })}
                  onSelect={() => selectItem(index)}
                  className={[
                    "flex cursor-pointer items-center gap-2 px-2 py-1",
                    isSelected ? "bg-accent text-accent-foreground" : "",
                  ].join(" ")}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border bg-background">
                    <HugeiconsIcon icon={item.icon} className="h-4 w-4" />
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{item.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </CommandItem>
              )
            })}
          </CommandGroup>
        )}
      </CommandList>
    </Command>
  )
}

SlashCommandList.displayName = "SlashCommandList"

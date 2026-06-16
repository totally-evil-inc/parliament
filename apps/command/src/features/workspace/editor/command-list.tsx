import {
  forwardRef,
  useImperativeHandle,
  useState
} from "react"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList
} from "@workspace/ui/components/command"
import { HugeiconsIcon } from "@hugeicons/react"

export const SuggestionList = forwardRef((props: any, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0)

  const selectItem = (index: number) => {
    const item = props.items[index]
    if (item) {
      props.command(item)
    }
  }

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === "ArrowUp") {
        setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length)
        return true
      }
      if (event.key === "ArrowDown") {
        setSelectedIndex((selectedIndex + 1) % props.items.length)
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
    <Command className="rounded-lg border shadow-md bg-popover text-popover-foreground w-75">
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Commands">
          {props.items.map((item: any, index: number) => (
            <CommandItem
              key={index}
              onSelect={() => selectItem(index)}
              className="flex items-center gap-2 px-2 py-1"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-md border bg-background">
                <HugeiconsIcon icon={item.icon} className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </div>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  )
})
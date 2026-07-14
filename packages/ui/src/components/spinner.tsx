import { cn } from "@workspace/ui/lib/utils"
import { IconLoader } from "nucleo-glass"

function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <IconLoader
      {...props}
      role="status"
      aria-label="Loading"
      className={cn("size-4 animate-spin", className)}
    />
  )
}

export { Spinner }

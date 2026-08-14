import { ArrowPathIcon } from "@heroicons/react/24/outline"
import { cn } from "@workspace/ui/lib/utils"

function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <ArrowPathIcon
      {...props}
      role="status"
      aria-label="Loading"
      className={cn("size-4 animate-spin", className)}
    />
  )
}

export { Spinner }

import { Separator } from "@workspace/ui/components/separator"

export function AuthSeparator() {
  return (
    <div className="my-6 flex items-center gap-3">
      <Separator className="flex-1" />
      <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.3em]">
        or
      </span>
      <Separator className="flex-1" />
    </div>
  )
}

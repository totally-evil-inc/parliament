import { Button } from "@workspace/ui/components/button"

type SettingsActionsProps = {
  dirty: boolean
  onDiscard: () => void
  onSave: () => void
}

export function SettingsActions({
  dirty,
  onDiscard,
  onSave,
}: SettingsActionsProps) {
  return (
    <div className="sticky bottom-0 z-10 border-border/60 border-t bg-background/90 px-6 py-3 backdrop-blur md:px-8">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
        <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.3em]">
          {dirty ? "Unsaved changes" : "All saved"}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={onDiscard}
            disabled={!dirty}
          >
            Discard
          </Button>
          <Button size="sm" type="button" onClick={onSave} disabled={!dirty}>
            Save changes
          </Button>
        </div>
      </div>
    </div>
  )
}

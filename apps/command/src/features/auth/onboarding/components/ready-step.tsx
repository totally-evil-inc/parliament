import { Button } from "@workspace/ui/components/button"

export function ReadyStep({
  organization,
  count,
  onEnter,
}: {
  organization: string
  count: number
  onEnter: () => void
}) {
  return (
    <>
      <div className="mt-8 font-mono text-[11px] tracking-[0.3em] text-muted-foreground uppercase">
        You're set
      </div>
      <h1 className="mt-2 font-heading text-3xl leading-tight">
        Welcome to {organization}.
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        {count === 0
          ? "Quiet for now. Invite people from settings when you're ready."
          : `We've sent ${count} invite${count === 1 ? "" : "s"}. They'll show up once accepted.`}
      </p>

      <div className="mt-8 grid grid-cols-3 gap-2">
        <FactCard label="Organization" value={organization} />
        <FactCard label="Members" value={String(count + 1)} />
        <FactCard label="Plan" value="Free" />
      </div>

      <Button size="lg" className="mt-8 w-full" type="button" onClick={onEnter}>
        Take me in
      </Button>
    </>
  )
}

function FactCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/70 bg-background/40 px-3 py-3">
      <div className="font-mono text-[10px] tracking-[0.25em] text-muted-foreground uppercase">
        {label}
      </div>
      <div className="mt-1 truncate font-heading text-sm">{value}</div>
    </div>
  )
}

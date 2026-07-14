import { InviteTeammatesForm } from "@/features/workspace/components/invite-teammates-form"

export function InviteStep({
  organizationId,
  onSuccess,
  onBack,
}: {
  organizationId: string
  onSuccess: () => void
  onBack: () => void
}) {
  return (
    <>
      <div className="mt-8 font-mono text-[11px] text-muted-foreground uppercase tracking-[0.3em]">
        Bring people with you
      </div>
      <h1 className="mt-2 font-heading text-3xl leading-tight">
        Invite teammates
      </h1>
      <p className="mt-2 text-muted-foreground text-sm">
        Optional. You can add anyone from settings later.
      </p>

      <div className="mt-8">
        <InviteTeammatesForm
          organizationId={organizationId}
          onSuccess={onSuccess}
          onSkip={onSuccess}
        />
      </div>

      <button
        type="button"
        onClick={onBack}
        className="mt-4 font-mono text-[10px] text-muted-foreground uppercase tracking-[0.25em] hover:text-foreground"
      >
        ← Back
      </button>
    </>
  )
}

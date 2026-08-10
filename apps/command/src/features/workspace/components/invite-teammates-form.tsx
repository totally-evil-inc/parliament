import { useForm } from "@tanstack/react-form"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { cn } from "@workspace/ui/lib/utils"
import { IconArrowBoldRight, IconCircleCheck, IconDeleteX } from "nucleo-glass"
import type { ClipboardEvent, KeyboardEvent } from "react"
import { useRef, useState } from "react"

type Role = "admin" | "member"

const ROLES: Array<{ value: Role; label: string; description: string }> = [
  {
    value: "admin",
    label: "Admin",
    description: "Manage workspace and members.",
  },
  { value: "member", label: "Member", description: "Create and edit content." },
]

type Invitee = { email: string; role: Role }

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const SPLIT_RE = /[\s,;]+/

let _uid = 0
const nextUid = () => ++_uid

type InternalChip = Invitee & { uid: number }

type Props = {
  organizationId: string
  onSuccess?: () => void
  onSkip?: () => void
}

export function InviteTeammatesForm({
  organizationId,
  onSuccess,
  onSkip,
}: Props) {
  const queryClient = useQueryClient()
  const [chips, setChips] = useState<Array<InternalChip>>([])
  const [draft, setDraft] = useState("")
  const [defaultRole, setDefaultRole] = useState<Role>("member")
  const [serverError, setServerError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const validChips = chips.filter((c) => EMAIL_RE.test(c.email))
  const invalidCount = chips.length - validChips.length

  const inviteMutation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: Role }) => {
      const authUrl =
        import.meta.env.VITE_BETTER_AUTH_URL || "http://localhost:4000"
      const response = await fetch(`${authUrl}/auth/invite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          role,
          organizationId,
        }),
        credentials: "include",
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || `Could not invite ${email}.`)
      }
      return response.json()
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["org-invitations", organizationId],
      })
      void queryClient.invalidateQueries({
        queryKey: ["org-members", organizationId],
      })
    },
  })

  const form = useForm({
    defaultValues: {},
    onSubmit: async () => {
      setServerError(null)

      try {
        const results = await Promise.allSettled(
          validChips.map(async (chip) => {
            await inviteMutation.mutateAsync({
              email: chip.email,
              role: chip.role,
            })
            return chip.uid
          })
        )

        const successfulUids = results
          .filter(
            (r): r is PromiseFulfilledResult<number> => r.status === "fulfilled"
          )
          .map((r) => r.value)

        setChips((prev) => prev.filter((c) => !successfulUids.includes(c.uid)))

        const failedCount = results.filter(
          (r) => r.status === "rejected"
        ).length
        if (failedCount > 0) {
          throw new Error(`Failed to send ${failedCount} invitation(s).`)
        }
        onSuccess?.()
      } catch (err: any) {
        setServerError(err.message || "Failed to send invitations.")
      }
    },
  })

  const addEmails = (raw: string) => {
    const parts = raw.split(SPLIT_RE).flatMap((s) => {
      const email = s.trim().toLowerCase()
      return email ? [email] : []
    })

    if (!parts.length) return

    setChips((prev) => {
      const seen = new Set(prev.map((c) => c.email))
      const next = [...prev]

      for (const email of parts) {
        if (seen.has(email)) continue
        seen.add(email)
        next.push({ uid: nextUid(), email, role: defaultRole })
      }

      return next
    })
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (
      e.key === "Enter" ||
      e.key === "," ||
      e.key === ";" ||
      e.key === "Tab"
    ) {
      if (!draft.trim()) return
      e.preventDefault()
      addEmails(draft)
      setDraft("")
    } else if (
      e.key === "Backspace" &&
      draft.length === 0 &&
      chips.length > 0
    ) {
      e.preventDefault()
      setChips((prev) => prev.slice(0, -1))
    }
  }

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text")
    if (!SPLIT_RE.test(text)) return
    e.preventDefault()
    addEmails(`${draft} ${text}`)
    setDraft("")
  }

  const onBlur = () => {
    if (!draft.trim()) return
    addEmails(draft)
    setDraft("")
  }

  const removeChip = (uid: number) =>
    setChips((prev) => prev.filter((c) => c.uid !== uid))

  const setChipRole = (uid: number, role: Role) =>
    setChips((prev) => prev.map((c) => (c.uid === uid ? { ...c, role } : c)))

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        e.stopPropagation()
        void form.handleSubmit()
      }}
      className="flex flex-col gap-5"
    >
      {serverError ? (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-destructive text-sm">
          {serverError}
        </p>
      ) : null}

      <div className="rounded-xl border border-border/60 bg-background/40 p-5">
        <div className="flex items-center justify-between gap-3">
          <label
            htmlFor="invite-teammates-email"
            className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.25em]"
          >
            Invitees
          </label>
          <div className="flex items-center gap-2">
            <span className="hidden font-mono text-[10px] text-muted-foreground uppercase tracking-[0.25em] sm:inline">
              Default role
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button
                    type="button"
                    className="flex h-8 w-28 items-center justify-between rounded-md border border-input bg-background px-3 text-foreground text-sm"
                  >
                    {ROLES.find((r) => r.value === defaultRole)?.label}
                    <svg
                      viewBox="0 0 12 12"
                      className="size-3 text-muted-foreground"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <title>Dropdown icon</title>
                      <polyline points="3 5 6 8 9 5" />
                    </svg>
                  </button>
                }
              />
              <DropdownMenuContent align="end" className="w-48">
                {ROLES.map((r) => (
                  <DropdownMenuItem
                    key={r.value}
                    onClick={() => setDefaultRole(r.value)}
                    className="flex items-start gap-2"
                  >
                    <IconCircleCheck
                      className={cn(
                        "mt-0.5 size-3.5 shrink-0",
                        defaultRole === r.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span>{r.label}</span>
                      <span className="text-muted-foreground text-xs">
                        {r.description}
                      </span>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="mt-3 flex w-full cursor-text flex-wrap items-center gap-1.5 rounded-lg border border-input bg-background p-2 text-left transition-shadow focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/24">
          {chips.map((chip) => (
            <EmailChip
              key={chip.uid}
              chip={chip}
              onRemove={() => removeChip(chip.uid)}
              onRoleChange={(role) => setChipRole(chip.uid, role)}
            />
          ))}
          <input
            id="invite-teammates-email"
            ref={inputRef}
            type="email"
            aria-label="Invitee email"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            onPaste={onPaste}
            onBlur={onBlur}
            placeholder={
              chips.length === 0
                ? "name@example.com, another@example.com…"
                : "Add another"
            }
            className="min-w-[12ch] flex-1 bg-transparent px-1.5 py-1 text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>

        <div className="mt-2 flex items-center gap-3 font-mono text-[10px] text-muted-foreground uppercase tracking-[0.25em]">
          <span>
            <span className="text-foreground">{validChips.length}</span> to
            invite
          </span>
          {invalidCount > 0 ? (
            <span className="text-destructive">{invalidCount} invalid</span>
          ) : null}
        </div>
      </div>

      <form.Subscribe
        selector={(state) => ({ isSubmitting: state.isSubmitting })}
      >
        {({ isSubmitting }) => (
          <div className="flex items-center justify-between gap-2">
            {onSkip ? (
              <Button
                type="button"
                variant="ghost"
                onClick={onSkip}
                disabled={isSubmitting}
              >
                Skip for now
              </Button>
            ) : null}
            <Button
              type="submit"
              disabled={isSubmitting || validChips.length === 0}
              className="ml-auto"
            >
              {isSubmitting
                ? "Sending..."
                : validChips.length > 0
                  ? `Send ${validChips.length} invite${validChips.length === 1 ? "" : "s"}`
                  : "Send invites"}
              <IconArrowBoldRight />
            </Button>
          </div>
        )}
      </form.Subscribe>
    </form>
  )
}

function EmailChip({
  chip,
  onRemove,
  onRoleChange,
}: {
  chip: InternalChip
  onRemove: () => void
  onRoleChange: (role: Role) => void
}) {
  const valid = EMAIL_RE.test(chip.email)
  const initials = chip.email.split("@")[0]?.slice(0, 2).toUpperCase() ?? "??"

  return (
    <span
      className={cn(
        "group inline-flex h-7 items-center gap-1.5 rounded-full border pr-1 pl-1 text-xs",
        valid
          ? "border-border bg-foreground/[0.03] text-foreground"
          : "border-destructive/50 bg-destructive/8 text-destructive"
      )}
    >
      <span
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-full font-mono text-[9px] uppercase",
          valid
            ? "bg-foreground/[0.06] text-muted-foreground"
            : "bg-destructive/15 text-destructive"
        )}
        aria-hidden
      >
        {valid ? initials : "!"}
      </span>
      <span className="max-w-[12ch] truncate">{chip.email}</span>

      {valid ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                className="flex h-5 items-center gap-0.5 rounded-full px-1.5 font-mono text-[10px] text-muted-foreground uppercase tracking-[0.18em] transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
              >
                {ROLES.find((r) => r.value === chip.role)?.label}
                <svg
                  viewBox="0 0 12 12"
                  className="size-2.5"
                  aria-hidden
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <title>Dropdown icon</title>
                  <polyline points="3 5 6 8 9 5" />
                </svg>
              </button>
            }
            aria-label={`Change role for ${chip.email}`}
          />
          <DropdownMenuContent className="w-52 p-1">
            {ROLES.map((r) => (
              <DropdownMenuItem
                key={r.value}
                onClick={() => onRoleChange(r.value)}
                className="flex items-start gap-2"
              >
                <IconCircleCheck
                  className={cn(
                    "mt-0.5 size-3.5 shrink-0",
                    chip.role === r.value ? "opacity-100" : "opacity-0"
                  )}
                />
                <div className="flex flex-col">
                  <span>{r.label}</span>
                  <span className="text-muted-foreground text-xs">
                    {r.description}
                  </span>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <span className="font-mono text-[9px] uppercase tracking-[0.2em]">
          Invalid
        </span>
      )}

      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${chip.email}`}
        className="flex size-5 items-center justify-center rounded-full opacity-50 hover:bg-foreground/[0.06] hover:opacity-100"
      >
        <IconDeleteX className="size-3" />
      </button>
    </span>
  )
}

import { XMarkIcon } from "@heroicons/react/20/solid"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar"
import * as React from "react"
import type { ComposerRecipient } from "./composer-types"

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function getInitials(emailOrName: string): string {
  if (!emailOrName) return "?"
  const namePart = emailOrName.includes("@")
    ? emailOrName.split("@")[0]
    : emailOrName
  const parts = namePart.split(/[._\-\s]+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  }
  return (parts[0]?.slice(0, 2) || "?").toUpperCase()
}

export function createRecipientFromEmail(
  email: string,
  name?: string
): ComposerRecipient {
  const trimmed = email.trim()
  return {
    id: `rec-${trimmed.toLowerCase()}-${Math.random().toString(36).slice(2, 7)}`,
    email: trimmed,
    name:
      name ||
      trimmed
        .split("@")[0]
        .replace(/[._-]/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase()),
  }
}

interface RecipientRowProps {
  label: string
  recipients: ComposerRecipient[]
  onAddRecipient: (recipient: ComposerRecipient) => void
  onRemoveRecipient: (id: string) => void
  showCcToggle?: boolean
  showBccToggle?: boolean
  isCcOpen?: boolean
  isBccOpen?: boolean
  onToggleCc?: () => void
  onToggleBcc?: () => void
  placeholder?: string
}

export function RecipientRow({
  label,
  recipients,
  onAddRecipient,
  onRemoveRecipient,
  showCcToggle = false,
  showBccToggle = false,
  isCcOpen = false,
  isBccOpen = false,
  onToggleCc,
  onToggleBcc,
  placeholder = "Add recipient email...",
}: RecipientRowProps) {
  const [inputValue, setInputValue] = React.useState("")
  const inputRef = React.useRef<HTMLInputElement>(null)

  const handleCommitInput = () => {
    const raw = inputValue.trim()
    if (!raw) return

    // Support comma or semicolon separated multiple emails
    const candidateEmails = raw.split(/[,;\s]+/).filter(Boolean)
    let addedCount = 0

    for (const email of candidateEmails) {
      if (EMAIL_REGEX.test(email)) {
        if (
          !recipients.some((r) => r.email.toLowerCase() === email.toLowerCase())
        ) {
          onAddRecipient(createRecipientFromEmail(email))
          addedCount++
        }
      }
    }

    if (addedCount > 0 || candidateEmails.length === 1) {
      setInputValue("")
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "," || e.key === "Tab") {
      if (inputValue.trim()) {
        e.preventDefault()
        handleCommitInput()
      }
    } else if (e.key === "Backspace" && !inputValue && recipients.length > 0) {
      onRemoveRecipient(recipients[recipients.length - 1].id)
    }
  }

  return (
    <div className="group relative flex min-h-[42px] w-full flex-wrap items-center gap-1.5 border-border/40 border-b px-3 py-2 text-xs transition-colors hover:border-border">
      <span className="w-10 shrink-0 select-none font-medium text-muted-foreground">
        {label}
      </span>

      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
        {recipients.map((recipient) => (
          <div
            key={recipient.id}
            className="inline-flex h-7 items-center gap-1.5 rounded-full border border-border/80 bg-muted/40 py-0.5 pr-1.5 pl-1 text-foreground text-xs shadow-2xs transition-all hover:bg-muted/70"
          >
            <Avatar size="sm" className="size-5 shrink-0 text-[10px]">
              {recipient.avatarUrl ? (
                <AvatarImage
                  src={recipient.avatarUrl}
                  alt={recipient.name || recipient.email}
                />
              ) : null}
              <AvatarFallback className="bg-primary/10 font-medium text-[10px] text-primary">
                {getInitials(recipient.name || recipient.email)}
              </AvatarFallback>
            </Avatar>
            <span className="max-w-[200px] truncate font-medium">
              {recipient.email}
            </span>
            <button
              type="button"
              onClick={() => onRemoveRecipient(recipient.id)}
              className="flex size-4 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
              aria-label={`Remove ${recipient.email}`}
            >
              <XMarkIcon className="size-3" />
            </button>
          </div>
        ))}

        <input
          ref={inputRef}
          type="email"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleCommitInput}
          placeholder={recipients.length === 0 ? placeholder : ""}
          className="min-w-[140px] flex-1 bg-transparent py-1 text-foreground text-xs outline-none placeholder:text-muted-foreground/60"
        />
      </div>

      {(showCcToggle || showBccToggle) && (
        <div className="flex shrink-0 items-center gap-1 font-medium text-[11px] text-muted-foreground">
          {showCcToggle && !isCcOpen && (
            <button
              type="button"
              onClick={onToggleCc}
              className="cursor-pointer rounded px-1.5 py-0.5 transition-colors hover:bg-accent hover:text-foreground"
            >
              Cc
            </button>
          )}
          {showBccToggle && !isBccOpen && (
            <button
              type="button"
              onClick={onToggleBcc}
              className="cursor-pointer rounded px-1.5 py-0.5 transition-colors hover:bg-accent hover:text-foreground"
            >
              Bcc
            </button>
          )}
        </div>
      )}
    </div>
  )
}

interface SenderRowProps {
  user?: {
    name?: string | null
    email?: string | null
    image?: string | null
  } | null
}

export function SenderRow({ user }: SenderRowProps) {
  const email = user?.email || "sender@parliament.dev"
  const name = user?.name || email.split("@")[0]

  return (
    <div className="flex min-h-[42px] w-full items-center gap-1.5 border-border/40 border-b px-3 py-2 text-xs">
      <span className="w-10 shrink-0 select-none font-medium text-muted-foreground">
        From
      </span>
      <div className="inline-flex h-7 items-center gap-1.5 rounded-full border border-border/80 bg-muted/40 py-0.5 pr-2.5 pl-1 text-foreground text-xs shadow-2xs">
        <Avatar size="sm" className="size-5 shrink-0 text-[10px]">
          {user?.image ? <AvatarImage src={user.image} alt={name} /> : null}
          <AvatarFallback className="bg-primary/10 font-medium text-[10px] text-primary">
            {getInitials(name || email)}
          </AvatarFallback>
        </Avatar>
        <span className="max-w-[240px] truncate font-medium text-foreground">
          {email}
        </span>
      </div>
    </div>
  )
}

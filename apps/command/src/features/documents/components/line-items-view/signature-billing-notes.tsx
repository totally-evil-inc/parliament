import { Input } from "@workspace/ui/components/input"

export function SignatureBillingNotes() {
  return (
    <div className="space-y-3 text-sm text-[var(--document-muted-foreground)]">
      <p className="font-medium text-[var(--document-foreground)]">
        Billing notes
      </p>
      <p>
        Use this section to confirm the services, quantities, pricing,
        discounts, and taxes included in this document.
      </p>
    </div>
  )
}

export function Signature({
  onSignerNameChange,
  onSignerTitleChange,
  signerName,
  signerTitle,
}: {
  onSignerNameChange?: (value: string) => void
  onSignerTitleChange?: (value: string) => void
  signerName: string
  signerTitle?: string
}) {
  return (
    <div className="text-right">
      {onSignerNameChange ? (
        <Input
          className="ml-auto h-auto w-full rounded-none border-x-0 border-t-0 border-b border-transparent bg-transparent px-0 py-0 text-right font-[cursive] text-3xl leading-none text-[var(--document-foreground)] shadow-none hover:border-[var(--document-border)] focus-visible:border-[var(--document-border)] focus-visible:ring-0"
          placeholder="Signer name"
          value={signerName}
          onChange={(event) => onSignerNameChange(event.target.value)}
        />
      ) : (
        <p className="font-[cursive] text-3xl leading-none text-[var(--document-foreground)]">
          {signerName || "Signer name"}
        </p>
      )}
      {onSignerTitleChange ? (
        <Input
          className="mt-2 ml-auto h-auto w-full rounded-none border-x-0 border-t-0 border-b border-transparent bg-transparent px-0 py-0 text-right text-[10px] font-bold tracking-widest text-[var(--document-muted-foreground)] uppercase shadow-none hover:border-[var(--document-border)] focus-visible:border-[var(--document-border)] focus-visible:ring-0"
          placeholder="Signature"
          value={signerTitle || ""}
          onChange={(event) => onSignerTitleChange(event.target.value)}
        />
      ) : (
        <p className="mt-2 text-[10px] font-bold tracking-widest text-[var(--document-muted-foreground)] uppercase">
          {signerTitle || "Signature"}
        </p>
      )}
    </div>
  )
}

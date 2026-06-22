import { CanvasTextField } from "../canvas-fields"

export function SignatureBillingNotes() {
  return (
    <div className="space-y-2">
      <h4 className="text-[10px] font-bold tracking-widest text-[var(--document-muted-foreground)] uppercase">
        Billing notes
      </h4>
      <p className="text-xs leading-relaxed text-[var(--document-muted-foreground)]">
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
        <CanvasTextField
          aria-label="Signer name"
          className="ml-auto h-10 text-right font-[cursive] text-3xl leading-10"
          placeholder="Signer name"
          value={signerName}
          onValueChange={onSignerNameChange}
        />
      ) : (
        <p className="font-[cursive] text-3xl leading-none text-[var(--document-foreground)]">
          {signerName || "Signer name"}
        </p>
      )}
      {onSignerTitleChange ? (
        <CanvasTextField
          aria-label="Signer title"
          className="mt-2 ml-auto h-5 text-right text-[10px] leading-5 font-bold tracking-widest text-[var(--document-muted-foreground)] uppercase"
          placeholder="Signature"
          value={signerTitle || ""}
          onValueChange={onSignerTitleChange}
        />
      ) : (
        <p className="mt-2 text-[10px] font-bold tracking-widest text-[var(--document-muted-foreground)] uppercase">
          {signerTitle || "Signature"}
        </p>
      )}
    </div>
  )
}

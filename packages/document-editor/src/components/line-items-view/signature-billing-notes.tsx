import { CanvasTextField } from "../canvas-fields"

export function SignatureBillingNotes() {
  return (
    <div className="space-y-2">
      <h4 className="font-bold text-[10px] text-[var(--document-muted-foreground)] uppercase tracking-widest">
        Billing notes
      </h4>
      <p className="text-[var(--document-muted-foreground)] text-xs leading-relaxed">
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
        <p className="font-[cursive] text-3xl text-[var(--document-foreground)] leading-none">
          {signerName || "Signer name"}
        </p>
      )}
      {onSignerTitleChange ? (
        <CanvasTextField
          aria-label="Signer title"
          className="mt-2 ml-auto h-5 text-right font-bold text-[10px] text-[var(--document-muted-foreground)] uppercase leading-5 tracking-widest"
          placeholder="Signer title"
          value={signerTitle || ""}
          onValueChange={onSignerTitleChange}
        />
      ) : (
        <p className="mt-2 font-bold text-[10px] text-[var(--document-muted-foreground)] uppercase tracking-widest">
          {signerTitle || "Signer title"}
        </p>
      )}
    </div>
  )
}

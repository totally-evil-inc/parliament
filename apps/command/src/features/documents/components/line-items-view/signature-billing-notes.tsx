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

export function Signature({ signedInUserName }: { signedInUserName: string }) {
  return (
    <div className="text-right">
      <p className="font-[cursive] text-3xl leading-none text-[var(--document-foreground)]">
        {signedInUserName || "Signed in user"}
      </p>
      <p className="mt-2 text-[10px] font-bold tracking-widest text-[var(--document-muted-foreground)] uppercase">
        Signature
      </p>
    </div>
  )
}

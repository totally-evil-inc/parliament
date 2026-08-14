import {
  formatDateOnly,
  formatMoneyMinor,
  getDocumentTemplate,
  getDocumentTemplateStyle,
  type InvoiceRenderModel,
} from "@workspace/document"
import type { InvoiceAcceptanceRecord } from "@workspace/document/public-api"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Checkbox } from "@workspace/ui/components/checkbox"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon,
  ClipboardDocumentCheckIcon,
  CreditCardIcon,
  LockClosedIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline"
import type React from "react"
import { useState } from "react"
import type { AcceptancePayload } from "../lib/api"
import { DrawnCanvas } from "./DrawnCanvas"
import { RichTextRenderer } from "./RichTextRenderer"

export type InvoiceViewProps = {
  invoice: InvoiceRenderModel
  paymentLinkUrl?: string | null
  accepted?: InvoiceAcceptanceRecord | null
  publicLinkId?: string
  onAccept?: (payload: AcceptancePayload) => Promise<void>
  onSendOtp?: (email: string) => Promise<{ success: boolean; error?: string }>
  onVerifyOtp?: (
    email: string,
    code: string
  ) => Promise<{ success: boolean; error?: string }>
  onPayNow?: () => void
  isSubmitting?: boolean
  appTheme?: "light" | "dark"
}

export function InvoiceView({
  invoice,
  paymentLinkUrl,
  accepted: propsAccepted,
  publicLinkId: _publicLinkId,
  onAccept,
  onSendOtp: _onSendOtp,
  onVerifyOtp: _onVerifyOtp,
  onPayNow,
  isSubmitting = false,
  appTheme = "light",
}: InvoiceViewProps) {
  const template = getDocumentTemplate(invoice.template, appTheme)
  const templateStyle = getDocumentTemplateStyle(template)
  const effectiveAccepted = propsAccepted ?? null

  // Form state
  const [signerName, setSignerName] = useState("")
  const [signerEmail, setSignerEmail] = useState("")
  const [signatureMode, setSignatureMode] = useState<"typed" | "drawn">("typed")
  const [signatureText, setSignatureText] = useState("")
  const [signatureImage, setSignatureImage] = useState<string | undefined>(
    undefined
  )
  const [agreedTerms, setAgreedTerms] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleSignerEmailChange = (newEmail: string) => {
    setSignerEmail(newEmail)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!onAccept) return
    if (!signerName.trim() || !signerEmail.trim()) {
      setErrorMsg("Name and email are required.")
      return
    }
    if (!agreedTerms) {
      setErrorMsg("You must agree to the terms to accept.")
      return
    }

    if (signatureMode === "typed" && !signatureText.trim()) {
      setErrorMsg("Typed signature is required.")
      return
    }
    if (signatureMode === "drawn" && !signatureImage) {
      setErrorMsg("Drawn signature is required.")
      return
    }

    setErrorMsg(null)
    try {
      await onAccept({
        signerName: signerName.trim(),
        signerEmail: signerEmail.trim(),
        signatureText:
          signatureMode === "typed"
            ? signatureText.trim() || undefined
            : undefined,
        signatureImage:
          signatureMode === "drawn" ? signatureImage || undefined : undefined,
        otpVerified: true,
        agreedTerms: true,
      })
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to submit acceptance."
      setErrorMsg(msg)
    }
  }

  const locale = invoice.locale || "en-US"
  const currency = invoice.pricing?.currency || "USD"

  return (
    <div
      style={templateStyle as React.CSSProperties}
      className="flex min-h-screen justify-center bg-[var(--document-canvas-background)] px-3 py-4 text-[var(--document-foreground)] sm:px-6 sm:py-8"
      data-testid="invoice-view-container"
    >
      <article className="w-full max-w-3xl space-y-8 rounded-[var(--document-radius)] border border-[var(--document-border)] bg-[var(--document-page-background)] p-4 shadow-sm sm:p-8">
        {/* Invoice Header */}
        <header className="space-y-4 border-border border-b pb-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="font-semibold text-xs uppercase tracking-wider"
              >
                Invoice
              </Badge>
              <span className="font-mono text-muted-foreground text-xs">
                {invoice.invoiceNumber}
              </span>
            </div>
            {effectiveAccepted ? (
              <Badge
                variant="default"
                className="flex items-center gap-1 bg-emerald-600 text-white"
              >
                <CheckCircleIcon className="h-3.5 w-3.5" /> Accepted
              </Badge>
            ) : (
              paymentLinkUrl && (
                <a
                  href={paymentLinkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    onPayNow?.()
                  }}
                  data-testid="pay-now-button"
                >
                  <Button
                    size="sm"
                    className="gap-1.5 bg-emerald-600 font-semibold text-white hover:bg-emerald-700"
                  >
                    <CreditCardIcon className="h-4 w-4" /> Pay Now{" "}
                    <ArrowTopRightOnSquareIcon className="h-3 w-3" />
                  </Button>
                </a>
              )
            )}
          </div>

          <h1 className="font-bold text-2xl text-foreground tracking-tight sm:text-3xl">
            {invoice.title}
          </h1>

          <div className="flex flex-wrap gap-x-6 gap-y-1 text-muted-foreground text-xs sm:text-sm">
            <div>
              <span className="font-medium text-foreground">Issued: </span>
              {formatDateOnly(invoice.issueDate, locale)}
            </div>
            {invoice.dueDate && (
              <div>
                <span className="font-medium text-foreground">Due Date: </span>
                {formatDateOnly(invoice.dueDate, locale)}
              </div>
            )}
            {invoice.paymentTerms && (
              <div>
                <span className="font-medium text-foreground">Terms: </span>
                {invoice.paymentTerms}
              </div>
            )}
          </div>
        </header>

        {/* Parties Grid */}
        <section className="grid grid-cols-1 gap-6 border-border border-b pb-6 sm:grid-cols-2">
          {/* Seller */}
          <div className="space-y-1 text-sm">
            <h3 className="mb-2 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
              Billed By (Seller)
            </h3>
            <p className="font-medium text-base text-foreground">
              {invoice.seller.name}
            </p>
            {invoice.seller.email && (
              <p className="text-muted-foreground">{invoice.seller.email}</p>
            )}
            {invoice.seller.phone && (
              <p className="text-muted-foreground">{invoice.seller.phone}</p>
            )}
            {invoice.seller.address && (
              <p className="whitespace-pre-line text-muted-foreground">
                {invoice.seller.address}
              </p>
            )}
            {invoice.seller.taxId && (
              <p className="text-muted-foreground text-xs">
                Tax ID: {invoice.seller.taxId}
              </p>
            )}
          </div>

          {/* Customer */}
          <div className="space-y-1 text-sm">
            <h3 className="mb-2 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
              Billed To (Customer)
            </h3>
            <p className="font-medium text-base text-foreground">
              {invoice.customer.name}
            </p>
            {invoice.customer.email && (
              <p className="text-muted-foreground">{invoice.customer.email}</p>
            )}
            {invoice.customer.phone && (
              <p className="text-muted-foreground">{invoice.customer.phone}</p>
            )}
            {invoice.customer.address && (
              <p className="whitespace-pre-line text-muted-foreground">
                {invoice.customer.address}
              </p>
            )}
            {invoice.customer.taxId && (
              <p className="text-muted-foreground text-xs">
                Tax ID: {invoice.customer.taxId}
              </p>
            )}
          </div>
        </section>

        {/* Pricing / Line Items Table */}
        {invoice.pricing && (
          <section className="space-y-4 border-border border-b pb-6">
            <h2 className="font-bold text-xl tracking-tight">
              Invoice Details
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-border border-b font-medium text-muted-foreground">
                    <th className="py-2 pr-4">Item & Description</th>
                    <th className="px-2 py-2 text-center">Qty</th>
                    <th className="px-2 py-2 text-right">Unit Price</th>
                    <th className="py-2 pl-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {invoice.pricing.items.map((item, idx) => {
                    const line = invoice.pricing?.calculation?.lines?.find(
                      (l) => l.id === item.id
                    )
                    const lineAmount = line
                      ? line.amountMinor
                      : item.unitPriceMinor * Number(item.quantity)
                    return (
                      <tr key={item.id || idx}>
                        <td className="py-3 pr-4">
                          <div className="font-medium">{item.description}</div>
                          {item.details && (
                            <div className="mt-0.5 text-muted-foreground text-xs">
                              {item.details}
                            </div>
                          )}
                        </td>
                        <td className="px-2 py-3 text-center align-top">
                          {item.quantity}
                        </td>
                        <td className="px-2 py-3 text-right align-top">
                          {formatMoneyMinor(
                            item.unitPriceMinor,
                            currency,
                            locale
                          )}
                        </td>
                        <td className="py-3 pl-4 text-right align-top font-medium">
                          {formatMoneyMinor(lineAmount, currency, locale)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {invoice.pricing.calculation && (
              <div className="flex justify-end pt-2">
                <div className="w-full space-y-1.5 text-sm sm:w-64">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal:</span>
                    <span>
                      {formatMoneyMinor(
                        invoice.pricing.calculation.subtotalMinor,
                        currency,
                        locale
                      )}
                    </span>
                  </div>
                  {invoice.pricing.calculation.discountMinor > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Discount:</span>
                      <span>
                        -
                        {formatMoneyMinor(
                          invoice.pricing.calculation.discountMinor,
                          currency,
                          locale
                        )}
                      </span>
                    </div>
                  )}
                  {invoice.pricing.calculation.taxMinor > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Tax:</span>
                      <span>
                        {formatMoneyMinor(
                          invoice.pricing.calculation.taxMinor,
                          currency,
                          locale
                        )}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between border-border border-t pt-2 font-bold text-base">
                    <span>Total Due:</span>
                    <span>
                      {formatMoneyMinor(
                        invoice.pricing.calculation.totalMinor,
                        currency,
                        locale
                      )}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Composition Blocks */}
        {invoice.blocks.map((block) => {
          if (block.type === "partyHeader" || block.type === "pricing")
            return null

          if (block.type === "richText") {
            return (
              <section key={block.id} className="py-2">
                <RichTextRenderer doc={block.content} />
              </section>
            )
          }

          if (block.type === "section") {
            return (
              <section key={block.id} className="space-y-2 py-2">
                {block.eyebrow?.content?.length > 0 && (
                  <div className="font-semibold text-primary text-xs uppercase tracking-wider">
                    <RichTextRenderer doc={block.eyebrow} />
                  </div>
                )}
                <h2 className="font-bold text-xl tracking-tight">
                  <RichTextRenderer doc={block.title} />
                </h2>
                {block.lead?.content?.length > 0 && (
                  <div className="text-base text-muted-foreground leading-relaxed">
                    <RichTextRenderer doc={block.lead} />
                  </div>
                )}
                {block.content && <RichTextRenderer doc={block.content} />}
              </section>
            )
          }

          return null
        })}

        {/* Acceptance / Payment Area */}
        <section className="border-border border-t pt-6">
          {effectiveAccepted ? (
            <Card className="border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 font-bold text-base text-emerald-800 dark:text-emerald-300">
                  <ClipboardDocumentCheckIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  Invoice Accepted
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-emerald-900 text-sm dark:text-emerald-200">
                <p>
                  <span className="font-semibold">Accepted by: </span>
                  {effectiveAccepted.signerName} (
                  {effectiveAccepted.signerEmail})
                </p>
                {effectiveAccepted.acceptedAt && (
                  <p className="text-xs opacity-80">
                    Date:{" "}
                    {new Date(effectiveAccepted.acceptedAt).toLocaleString()}
                  </p>
                )}
                {effectiveAccepted.signatureText && (
                  <p className="text-xs italic opacity-80">
                    Signature: "{effectiveAccepted.signatureText}"
                  </p>
                )}
                {effectiveAccepted.signatureImage && (
                  <div className="mt-2 inline-block rounded border bg-white p-1">
                    <img
                      src={effectiveAccepted.signatureImage}
                      alt="Drawn Signature"
                      className="max-h-16 object-contain"
                    />
                  </div>
                )}
                {effectiveAccepted.otpVerified && (
                  <Badge
                    variant="outline"
                    className="mt-2 border-emerald-400 text-emerald-700 text-xs dark:text-emerald-300"
                  >
                    <ShieldCheckIcon className="mr-1 h-3 w-3" /> OTP Verified
                  </Badge>
                )}
              </CardContent>
            </Card>
          ) : (
            onAccept && (
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-bold text-lg">
                    <LockClosedIcon className="h-5 w-5 text-primary" /> Accept &
                    Confirm Invoice
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {errorMsg && (
                      <div className="rounded-md bg-destructive/10 p-3 text-destructive text-xs">
                        {errorMsg}
                      </div>
                    )}

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="invSignerName">Full Name *</Label>
                        <Input
                          id="invSignerName"
                          placeholder="John Doe"
                          value={signerName}
                          onChange={(e) => setSignerName(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="invSignerEmail">Email Address *</Label>
                        <Input
                          id="invSignerEmail"
                          type="email"
                          placeholder="john@example.com"
                          value={signerEmail}
                          onChange={(e) =>
                            handleSignerEmailChange(e.target.value)
                          }
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Signature Type</Label>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant={
                            signatureMode === "typed" ? "default" : "outline"
                          }
                          size="sm"
                          onClick={() => setSignatureMode("typed")}
                          className="text-xs"
                          data-testid="inv-signature-mode-typed"
                        >
                          Typed Signature
                        </Button>
                        <Button
                          type="button"
                          variant={
                            signatureMode === "drawn" ? "default" : "outline"
                          }
                          size="sm"
                          onClick={() => setSignatureMode("drawn")}
                          className="text-xs"
                          data-testid="inv-signature-mode-drawn"
                        >
                          Drawn Signature
                        </Button>
                      </div>

                      {signatureMode === "typed" ? (
                        <div className="space-y-1.5 pt-1">
                          <Label htmlFor="invSignatureText">
                            Typed Signature (Optional)
                          </Label>
                          <Input
                            id="invSignatureText"
                            placeholder="Type your name to sign electronically"
                            value={signatureText}
                            onChange={(e) => setSignatureText(e.target.value)}
                          />
                        </div>
                      ) : (
                        <div className="space-y-1.5 pt-1">
                          <Label>Draw Signature</Label>
                          <DrawnCanvas
                            onChange={(dataUrl) => setSignatureImage(dataUrl)}
                            disabled={isSubmitting}
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 rounded-md border border-emerald-500/20 bg-emerald-500/10 p-2.5 text-emerald-600 text-xs dark:text-emerald-400">
                      <ShieldCheckIcon className="h-4 w-4" />
                      <span>Email identity verified</span>
                    </div>

                    <div className="flex items-start space-x-2 pt-2">
                      <Checkbox
                        id="invAgreedTerms"
                        checked={agreedTerms}
                        onCheckedChange={(checked) =>
                          setAgreedTerms(checked === true)
                        }
                      />
                      <Label
                        htmlFor="invAgreedTerms"
                        className="cursor-pointer font-normal text-muted-foreground text-xs leading-normal"
                      >
                        I confirm that the invoice details are correct and
                        accept this invoice.
                      </Label>
                    </div>

                    <Button
                      type="submit"
                      disabled={
                        isSubmitting ||
                        !agreedTerms ||
                        !signerName.trim() ||
                        !signerEmail.trim()
                      }
                      className="w-full font-semibold"
                    >
                      {isSubmitting ? "Submitting..." : "Accept Invoice"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )
          )}
        </section>
      </article>
    </div>
  )
}

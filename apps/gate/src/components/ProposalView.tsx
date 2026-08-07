import {
  formatDateOnly,
  formatMoneyMinor,
  getDocumentTemplate,
  getDocumentTemplateStyle,
  type ProposalRenderModel,
} from "@workspace/document"
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
import { CheckCircle2, FileCheck, Lock, Send, ShieldCheck } from "lucide-react"
import type React from "react"
import { useState } from "react"
import type { AcceptancePayload } from "../lib/api"
import type { ProposalAcceptanceRecord } from "../server/proposals"
import { DrawnCanvas } from "./DrawnCanvas"
import { RichTextRenderer } from "./RichTextRenderer"

export type ProposalViewProps = {
  proposal: ProposalRenderModel
  accepted?: ProposalAcceptanceRecord | null
  publicLinkId?: string
  onAccept?: (payload: AcceptancePayload) => Promise<void>
  onSendOtp?: (email: string) => Promise<{ success: boolean; error?: string }>
  onVerifyOtp?: (
    email: string,
    code: string
  ) => Promise<{ success: boolean; error?: string }>
  isSubmitting?: boolean
  appTheme?: "light" | "dark"
}

export function ProposalView({
  proposal,
  accepted: propsAccepted,
  publicLinkId: _publicLinkId,
  onAccept,
  onSendOtp,
  onVerifyOtp,
  isSubmitting = false,
  appTheme = "light",
}: ProposalViewProps) {
  const template = getDocumentTemplate(proposal.template, appTheme)
  const templateStyle = getDocumentTemplateStyle(template)

  // Form states
  const [signerName, setSignerName] = useState(propsAccepted?.signerName ?? "")
  const [signerEmail, setSignerEmail] = useState(
    propsAccepted?.signerEmail ?? ""
  )
  const [signatureMode, setSignatureMode] = useState<"typed" | "drawn">("typed")
  const [signatureText, setSignatureText] = useState("")
  const [signatureImage, setSignatureImage] = useState<string | undefined>(
    undefined
  )
  const [agreedTerms, setAgreedTerms] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // OTP state
  const [otpSent, setOtpSent] = useState(false)
  const [otpCode, setOtpCode] = useState("")
  const [otpVerified, setOtpVerified] = useState(
    propsAccepted?.otpVerified ?? false
  )
  const [otpLoading, setOtpLoading] = useState(false)
  const [otpMsg, setOtpMsg] = useState<string | null>(null)

  const handleSignerEmailChange = (newEmail: string) => {
    setSignerEmail(newEmail)
    setOtpSent(false)
    setOtpVerified(false)
    setOtpCode("")
    setOtpMsg(null)
  }

  const effectiveAccepted = propsAccepted ?? null

  const handleSendOtp = async () => {
    if (!signerEmail.trim()) {
      setOtpMsg("Please enter signer email first")
      return
    }
    if (!onSendOtp) return
    setOtpLoading(true)
    setOtpMsg(null)
    try {
      const res = await onSendOtp(signerEmail.trim())
      if (res.success) {
        setOtpSent(true)
        setOtpMsg("Verification code sent to your email")
      } else {
        setOtpMsg(res.error || "Failed to send verification code")
      }
    } catch {
      setOtpMsg("Failed to send verification code")
    } finally {
      setOtpLoading(false)
    }
  }

  const handleVerifyOtp = async () => {
    if (!otpCode.trim() || !onVerifyOtp) return
    setOtpLoading(true)
    setOtpMsg(null)
    try {
      const res = await onVerifyOtp(signerEmail.trim(), otpCode.trim())
      if (res.success) {
        setOtpVerified(true)
        setOtpMsg("Email verified successfully!")
      } else {
        setOtpMsg(res.error || "Invalid or expired code")
      }
    } catch {
      setOtpMsg("Verification failed")
    } finally {
      setOtpLoading(false)
    }
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

    if (onVerifyOtp && !otpVerified) {
      setErrorMsg("Email verification is required before accepting.")
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
        otpVerified,
        agreedTerms: true,
      })
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to submit acceptance."
      setErrorMsg(msg)
    }
  }

  const locale = proposal.locale || "en-US"
  const currency = proposal.pricing?.currency || "USD"

  return (
    <div
      style={templateStyle as React.CSSProperties}
      className="flex min-h-screen justify-center bg-[var(--document-canvas-background)] px-3 py-4 text-[var(--document-foreground)] sm:px-6 sm:py-8"
      data-testid="proposal-view-container"
    >
      <article className="w-full max-w-3xl space-y-8 rounded-[var(--document-radius)] border border-[var(--document-border)] bg-[var(--document-page-background)] p-4 shadow-sm sm:p-8">
        {/* Proposal Header */}
        <header className="space-y-3 border-border border-b pb-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Badge
              variant="outline"
              className="font-semibold text-xs uppercase tracking-wider"
            >
              Proposal
            </Badge>
            {effectiveAccepted && (
              <Badge
                variant="default"
                className="flex items-center gap-1 bg-emerald-600 text-white"
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> Accepted
              </Badge>
            )}
          </div>
          <h1 className="font-bold text-2xl text-foreground tracking-tight sm:text-3xl">
            {proposal.title}
          </h1>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-muted-foreground text-xs sm:text-sm">
            <div>
              <span className="font-medium text-foreground">Date: </span>
              {formatDateOnly(proposal.issueDate, locale)}
            </div>
            {proposal.validUntil && (
              <div>
                <span className="font-medium text-foreground">
                  Valid Until:{" "}
                </span>
                {formatDateOnly(proposal.validUntil, locale)}
              </div>
            )}
          </div>
        </header>

        {/* Parties Grid */}
        <section className="grid grid-cols-1 gap-6 border-border border-b pb-6 sm:grid-cols-2">
          {/* Seller */}
          <div className="space-y-1 text-sm">
            <h3 className="mb-2 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
              From (Provider)
            </h3>
            <p className="font-medium text-base text-foreground">
              {proposal.seller.name}
            </p>
            {proposal.seller.email && (
              <p className="text-muted-foreground">{proposal.seller.email}</p>
            )}
            {proposal.seller.phone && (
              <p className="text-muted-foreground">{proposal.seller.phone}</p>
            )}
            {proposal.seller.address && (
              <p className="whitespace-pre-line text-muted-foreground">
                {proposal.seller.address}
              </p>
            )}
            {proposal.seller.taxId && (
              <p className="text-muted-foreground text-xs">
                Tax ID: {proposal.seller.taxId}
              </p>
            )}
          </div>

          {/* Customer */}
          <div className="space-y-1 text-sm">
            <h3 className="mb-2 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
              To (Client)
            </h3>
            <p className="font-medium text-base text-foreground">
              {proposal.customer.name}
            </p>
            {proposal.customer.email && (
              <p className="text-muted-foreground">{proposal.customer.email}</p>
            )}
            {proposal.customer.phone && (
              <p className="text-muted-foreground">{proposal.customer.phone}</p>
            )}
            {proposal.customer.address && (
              <p className="whitespace-pre-line text-muted-foreground">
                {proposal.customer.address}
              </p>
            )}
            {proposal.customer.taxId && (
              <p className="text-muted-foreground text-xs">
                Tax ID: {proposal.customer.taxId}
              </p>
            )}
          </div>
        </section>

        {/* Composition Blocks */}
        {proposal.blocks.map((block) => {
          if (block.type === "partyHeader") return null

          if (block.type === "pricing" && proposal.pricing) {
            const { items, calculation } = proposal.pricing
            return (
              <section
                key={block.id}
                className="space-y-4 border-border border-b pb-6"
              >
                <h2 className="font-bold text-xl tracking-tight">
                  {block.config?.title || "Pricing Breakdown"}
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-border border-b font-medium text-muted-foreground">
                        <th className="py-2 pr-4">Description</th>
                        <th className="px-2 py-2 text-center">Qty</th>
                        <th className="px-2 py-2 text-right">Price</th>
                        <th className="py-2 pl-4 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {items.map((item, idx) => {
                        const line = calculation?.lines?.find(
                          (l) => l.id === item.id
                        )
                        const lineAmount = line
                          ? line.amountMinor
                          : item.unitPriceMinor * Number(item.quantity)
                        return (
                          <tr key={item.id || idx}>
                            <td className="py-3 pr-4">
                              <div className="font-medium">
                                {item.description}
                              </div>
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

                {calculation && (
                  <div className="flex justify-end pt-2">
                    <div className="w-full space-y-1.5 text-sm sm:w-64">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Subtotal:</span>
                        <span>
                          {formatMoneyMinor(
                            calculation.subtotalMinor,
                            currency,
                            locale
                          )}
                        </span>
                      </div>
                      {calculation.discountMinor > 0 && (
                        <div className="flex justify-between text-muted-foreground">
                          <span>Discount:</span>
                          <span>
                            -
                            {formatMoneyMinor(
                              calculation.discountMinor,
                              currency,
                              locale
                            )}
                          </span>
                        </div>
                      )}
                      {calculation.taxMinor > 0 && (
                        <div className="flex justify-between text-muted-foreground">
                          <span>Tax:</span>
                          <span>
                            {formatMoneyMinor(
                              calculation.taxMinor,
                              currency,
                              locale
                            )}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between border-border border-t pt-2 font-bold text-base">
                        <span>Total:</span>
                        <span>
                          {formatMoneyMinor(
                            calculation.totalMinor,
                            currency,
                            locale
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </section>
            )
          }

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

          if (block.type === "cover") {
            return (
              <section
                key={block.id}
                className="space-y-3 rounded-lg bg-muted/30 p-6 py-4"
              >
                {block.eyebrow?.content?.length > 0 && (
                  <div className="font-semibold text-primary text-xs uppercase tracking-wider">
                    <RichTextRenderer doc={block.eyebrow} />
                  </div>
                )}
                <h2 className="font-bold text-2xl">
                  <RichTextRenderer doc={block.title} />
                </h2>
                {block.subtitle?.content?.length > 0 && (
                  <div className="text-muted-foreground">
                    <RichTextRenderer doc={block.subtitle} />
                  </div>
                )}
              </section>
            )
          }

          if (block.type === "columns") {
            return (
              <section key={block.id} className="space-y-4 py-2">
                {block.title && (
                  <h3 className="font-bold text-lg">
                    <RichTextRenderer doc={block.title} />
                  </h3>
                )}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                  {block.items.map((item) => (
                    <div
                      key={item.id}
                      className="space-y-2 rounded-md border border-border p-4"
                    >
                      <h4 className="font-semibold text-sm">
                        <RichTextRenderer doc={item.heading} />
                      </h4>
                      <RichTextRenderer
                        doc={item.body}
                        className="text-muted-foreground text-xs"
                      />
                    </div>
                  ))}
                </div>
              </section>
            )
          }

          if (block.type === "metrics") {
            return (
              <section
                key={block.id}
                className="grid grid-cols-1 gap-4 py-4 sm:grid-cols-2 md:grid-cols-3"
              >
                {block.items.map((item) => (
                  <div
                    key={item.id}
                    className="space-y-1 rounded-lg bg-muted/40 p-4 text-center"
                  >
                    <div className="font-bold text-2xl text-primary">
                      <RichTextRenderer doc={item.value} />
                    </div>
                    <div className="font-medium text-sm">
                      <RichTextRenderer doc={item.label} />
                    </div>
                    {item.detail && (
                      <div className="text-muted-foreground text-xs">
                        <RichTextRenderer doc={item.detail} />
                      </div>
                    )}
                  </div>
                ))}
              </section>
            )
          }

          if (block.type === "faq") {
            return (
              <section key={block.id} className="space-y-4 py-2">
                <h3 className="font-bold text-lg">
                  Frequently Asked Questions
                </h3>
                <div className="space-y-3">
                  {block.items.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="space-y-1 rounded-md border border-border p-4"
                    >
                      <h4 className="font-semibold text-sm">
                        <RichTextRenderer doc={item.question} />
                      </h4>
                      <RichTextRenderer
                        doc={item.answer}
                        className="text-muted-foreground text-xs"
                      />
                    </div>
                  ))}
                </div>
              </section>
            )
          }

          if (block.type === "signature") {
            return (
              <section
                key={block.id}
                className="space-y-3 border-border border-t py-4"
              >
                <h3 className="font-bold text-lg">
                  <RichTextRenderer doc={block.title} />
                </h3>
                <RichTextRenderer
                  doc={block.terms}
                  className="text-muted-foreground text-xs"
                />
              </section>
            )
          }

          return null
        })}

        {/* Acceptance / Signature Area */}
        <section className="border-border border-t pt-6">
          {effectiveAccepted ? (
            <Card className="border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 font-bold text-base text-emerald-800 dark:text-emerald-300">
                  <FileCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  Proposal Accepted
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
                    <ShieldCheck className="mr-1 h-3 w-3" /> OTP Verified
                  </Badge>
                )}
              </CardContent>
            </Card>
          ) : (
            onAccept && (
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-bold text-lg">
                    <Lock className="h-5 w-5 text-primary" /> Accept & Sign
                    Proposal
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
                        <Label htmlFor="signerName">Full Name *</Label>
                        <Input
                          id="signerName"
                          placeholder="John Doe"
                          value={signerName}
                          onChange={(e) => setSignerName(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="signerEmail">Email Address *</Label>
                        <Input
                          id="signerEmail"
                          type="email"
                          placeholder="john@example.com"
                          value={signerEmail}
                          onChange={(e) => handleSignerEmailChange(e.target.value)}
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
                          data-testid="signature-mode-typed"
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
                          data-testid="signature-mode-drawn"
                        >
                          Drawn Signature
                        </Button>
                      </div>

                      {signatureMode === "typed" ? (
                        <div className="space-y-1.5 pt-1">
                          <Label htmlFor="signatureText">
                            Typed Signature (Optional)
                          </Label>
                          <Input
                            id="signatureText"
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

                    {/* OTP verification widget if onSendOtp provided */}
                    {onSendOtp && (
                      <div className="space-y-2 rounded-md border border-border bg-muted/20 p-3">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1 font-semibold text-muted-foreground text-xs">
                            <ShieldCheck className="h-3.5 w-3.5" /> Email
                            Verification (OTP)
                          </span>
                          {otpVerified && (
                            <Badge className="bg-emerald-600 text-white text-xs">
                              Verified
                            </Badge>
                          )}
                        </div>

                        {!otpVerified && (
                          <div className="space-y-2">
                            {!otpSent ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleSendOtp}
                                disabled={otpLoading || !signerEmail.trim()}
                                className="gap-1.5 text-xs"
                              >
                                <Send className="h-3 w-3" /> Send Verification
                                Code
                              </Button>
                            ) : (
                              <div className="flex items-center gap-2">
                                <Input
                                  aria-label="Verification code"
                                  placeholder="6-digit code"
                                  value={otpCode}
                                  onChange={(e) => setOtpCode(e.target.value)}
                                  className="max-w-[140px] text-xs"
                                />
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={handleVerifyOtp}
                                  disabled={otpLoading || !otpCode.trim()}
                                  className="text-xs"
                                >
                                  Verify Code
                                </Button>
                              </div>
                            )}
                          </div>
                        )}

                        {otpMsg && (
                          <p className="text-muted-foreground text-xs">
                            {otpMsg}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="flex items-start space-x-2 pt-2">
                      <Checkbox
                        id="agreedTerms"
                        checked={agreedTerms}
                        onCheckedChange={(checked) =>
                          setAgreedTerms(checked === true)
                        }
                      />
                      <Label
                        htmlFor="agreedTerms"
                        className="cursor-pointer font-normal text-muted-foreground text-xs leading-normal"
                      >
                        I agree to the terms and conditions outlined in this
                        proposal.
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
                      {isSubmitting ? "Submitting..." : "Accept Proposal"}
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

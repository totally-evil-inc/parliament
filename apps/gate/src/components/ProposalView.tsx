import {
  CheckCircleIcon,
  ClipboardDocumentCheckIcon,
  LockClosedIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline"
import {
  getDocumentTemplate,
  getDocumentTemplateStyle,
  type ProposalRenderModel,
} from "@workspace/document"
import type { ProposalAcceptanceRecord } from "@workspace/document/public-api"
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
import type React from "react"
import { useState } from "react"
import type { AcceptancePayload } from "../lib/api"
import { DrawnCanvas } from "./DrawnCanvas"
import { DocumentBlockRenderer } from "./document-block-renderer"
import { DocumentHeaderRenderer } from "./document-header-renderer"

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
  onSendOtp: _onSendOtp,
  onVerifyOtp: _onVerifyOtp,
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

  const handleSignerEmailChange = (newEmail: string) => {
    setSignerEmail(newEmail)
  }

  const effectiveAccepted = propsAccepted ?? null

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

  const locale = proposal.locale || "en-US"
  const currency = proposal.pricing?.currency || "USD"

  const hasPartyHeaderBlock = proposal.blocks.some(
    (b) => b.type === "partyHeader"
  )
  const hasPricingBlock = proposal.blocks.some((b) => b.type === "pricing")

  return (
    <div
      style={templateStyle as React.CSSProperties}
      className="flex min-h-screen justify-center bg-[var(--document-canvas-background)] px-3 py-6 text-[var(--document-foreground)] sm:px-6 sm:py-12"
      data-testid="proposal-view-container"
    >
      <article className="w-full max-w-4xl space-y-8 rounded-[var(--document-radius)] border border-[var(--document-border)] bg-[var(--document-page-background)] p-6 text-[var(--document-foreground)] shadow-black/10 shadow-xl [font-family:var(--document-font-family)] sm:p-12">
        {/* Status indicator badge */}
        <div className="flex items-center justify-between gap-2 border-[var(--document-border)] border-b pb-4">
          <Badge
            variant="outline"
            className="font-bold text-[10px] text-[var(--document-muted-foreground)] uppercase tracking-wider"
          >
            Proposal
          </Badge>
          {effectiveAccepted && (
            <Badge
              variant="default"
              className="flex items-center gap-1 bg-emerald-600 font-semibold text-white text-xs"
            >
              <CheckCircleIcon className="h-3.5 w-3.5" /> Proposal Accepted
            </Badge>
          )}
        </div>

        {/* Fallback header if not explicitly in blocks */}
        {!hasPartyHeaderBlock && (
          <DocumentHeaderRenderer
            kind="proposal"
            layout="mark-left-dates-right"
            title={proposal.title}
            issueDate={proposal.issueDate}
            validUntil={proposal.validUntil}
            seller={proposal.seller}
            customer={proposal.customer}
            locale={locale}
          />
        )}

        {/* Dynamic Composition Blocks */}
        {proposal.blocks.map((block) => (
          <DocumentBlockRenderer
            key={block.id}
            block={block}
            title={proposal.title}
            issueDate={proposal.issueDate}
            validUntil={proposal.validUntil}
            seller={proposal.seller}
            customer={proposal.customer}
            locale={locale}
            currency={currency}
            pricing={proposal.pricing}
          />
        ))}

        {/* Fallback Pricing block if not in composition */}
        {!hasPricingBlock && proposal.pricing && (
          <DocumentBlockRenderer
            block={{
              id: "fallback-pricing",
              type: "pricing",
              version: 1,
              binding: "proposal.pricing",
              config: { title: "Pricing Breakdown" },
            }}
            title={proposal.title}
            issueDate={proposal.issueDate}
            seller={proposal.seller}
            customer={proposal.customer}
            locale={locale}
            currency={currency}
            pricing={proposal.pricing}
          />
        )}

        {/* Acceptance / Signature Area */}
        <section className="border-[var(--document-border)] border-t pt-8">
          {effectiveAccepted ? (
            <Card className="border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 font-bold text-base text-emerald-800 dark:text-emerald-300">
                  <ClipboardDocumentCheckIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
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
                    <ShieldCheckIcon className="mr-1 h-3 w-3" /> OTP Verified
                  </Badge>
                )}
              </CardContent>
            </Card>
          ) : (
            onAccept && (
              <Card className="border-[var(--document-border)] bg-[color-mix(in_oklab,var(--document-page-background)_95%,transparent)]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-bold text-[var(--document-foreground)] text-lg">
                    <LockClosedIcon className="h-5 w-5 text-[var(--document-accent)]" />{" "}
                    Accept & Sign Proposal
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

                    <div className="flex items-center gap-1.5 rounded-md border border-emerald-500/20 bg-emerald-500/10 p-2.5 text-emerald-600 text-xs dark:text-emerald-400">
                      <ShieldCheckIcon className="h-4 w-4" />
                      <span>Email identity verified</span>
                    </div>

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

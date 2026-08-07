import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  ArrowRight,
  CheckCircle2,
  KeyRound,
  Loader2,
  Mail,
  Shield,
} from "lucide-react"
import type React from "react"
import { useState } from "react"
import { gateAuthClient } from "../lib/auth-client"

export type GateChallengeProps = {
  title?: string
  sellerName?: string
  boundEmail?: string | null
  documentType?: "proposal" | "invoice"
  onVerified: () => void
}

export function GateChallenge({
  title = "Document",
  sellerName,
  boundEmail,
  documentType = "proposal",
  onVerified,
}: GateChallengeProps) {
  const [email, setEmail] = useState(boundEmail ?? "")
  const [otpCode, setOtpCode] = useState("")
  const [step, setStep] = useState<"email" | "otp">("email")
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const handleSendCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const targetEmail = email.trim()
    if (!targetEmail) {
      setErrorMsg("Please enter a valid email address.")
      return
    }

    if (boundEmail && boundEmail.toLowerCase() !== targetEmail.toLowerCase()) {
      setErrorMsg(
        `This ${documentType} was sent to ${boundEmail}. Please enter that email.`
      )
      return
    }

    setLoading(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    try {
      const { error } = await gateAuthClient.emailOtp.sendVerificationOtp({
        email: targetEmail,
        type: "sign-in",
      })

      if (error) {
        setErrorMsg(error.message || "Failed to send verification code.")
      } else {
        setStep("otp")
        setSuccessMsg(`A 6-digit verification code was sent to ${targetEmail}`)
      }
    } catch (_err) {
      setErrorMsg("Network error sending verification code.")
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    const code = otpCode.trim()
    if (!code) {
      setErrorMsg("Please enter the 6-digit verification code.")
      return
    }

    setLoading(true)
    setErrorMsg(null)

    try {
      const { error } = await gateAuthClient.signIn.emailOtp({
        email: email.trim(),
        otp: code,
      })

      if (error) {
        setErrorMsg(error.message || "Invalid or expired verification code.")
      } else {
        onVerified()
      }
    } catch (_err) {
      setErrorMsg("Failed to verify code. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 text-foreground">
      <Card className="w-full max-w-md border-border shadow-md">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Shield className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl font-bold tracking-tight">
            Verification Required
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            {sellerName ? (
              <>
                <span className="font-semibold text-foreground">
                  {sellerName}
                </span>{" "}
                has shared a {documentType}{" "}
                <span className="italic">"{title}"</span> with you.
              </>
            ) : (
              <>
                Please verify your identity to access this secure {documentType}
                .
              </>
            )}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 pt-2">
          {errorMsg && (
            <div className="rounded-md bg-destructive/10 p-3 text-xs text-destructive">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 rounded-md bg-emerald-500/10 p-3 text-xs text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {step === "email" ? (
            <form onSubmit={handleSendCode} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-medium">
                  Recipient Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading || Boolean(boundEmail)}
                    className="pl-9 text-xs"
                    required
                  />
                </div>
                {boundEmail && (
                  <p className="text-[11px] text-muted-foreground">
                    This link is restricted to {boundEmail}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full text-xs font-semibold"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    Sending Code...
                  </>
                ) : (
                  <>
                    Send Verification Code
                    <ArrowRight className="ml-2 h-3.5 w-3.5" />
                  </>
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="otpCode" className="text-xs font-medium">
                    6-Digit Verification Code
                  </Label>
                  <button
                    type="button"
                    onClick={() => {
                      setStep("email")
                      setErrorMsg(null)
                      setSuccessMsg(null)
                    }}
                    className="text-[11px] text-primary hover:underline"
                  >
                    Change email
                  </button>
                </div>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="otpCode"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="123456"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    disabled={loading}
                    className="pl-9 text-xs tracking-widest font-mono text-center"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading || otpCode.trim().length !== 6}
                className="w-full text-xs font-semibold"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify & Access Document"
                )}
              </Button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => handleSendCode()}
                  disabled={loading}
                  className="text-xs text-muted-foreground hover:text-foreground underline"
                >
                  Resend code
                </button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@workspace/ui/components/input-otp"
import { Label } from "@workspace/ui/components/label"
import { Spinner } from "@workspace/ui/components/spinner"
import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  Lock,
  Mail,
  Shield,
} from "lucide-react"
import type React from "react"
import { useEffect, useState } from "react"
import { gateAuthClient } from "../lib/auth-client"

const RESEND_SECONDS = 45

export type GateChallengeProps = {
  title?: string
  sellerName?: string
  boundEmail?: string | null
  documentType?: "proposal" | "invoice"
  onVerified: () => void
}

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, "0")}`
}

export function GateChallenge({
  title = "Document",
  sellerName,
  boundEmail,
  documentType = "proposal",
  onVerified,
}: GateChallengeProps) {
  const targetEmail = boundEmail?.trim() ?? ""
  const [otpCode, setOtpCode] = useState("")
  const [step, setStep] = useState<"email" | "otp">("email")
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(0)

  useEffect(() => {
    if (secondsLeft <= 0) return
    const timer = window.setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [secondsLeft])

  const handleSendCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()

    if (!targetEmail) {
      setErrorMsg(
        "No recipient email address is bound to this link. Please request an updated link from the sender."
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
        setSecondsLeft(RESEND_SECONDS)
        setSuccessMsg(`A 6-digit verification code was sent to ${targetEmail}`)
      }
    } catch (_err) {
      setErrorMsg("Network error sending verification code.")
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const code = otpCode.trim()
    if (code.length !== 6) {
      setErrorMsg("Please enter the complete 6-digit verification code.")
      return
    }

    if (!targetEmail) {
      setErrorMsg("No recipient email bound to this link.")
      return
    }

    setLoading(true)
    setErrorMsg(null)

    try {
      const { error } = await gateAuthClient.signIn.emailOtp({
        email: targetEmail,
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
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Shield className="h-6 w-6" />
          </div>
          <CardTitle className="font-bold text-xl tracking-tight">
            {step === "email"
              ? "Verification Required"
              : "Enter Verification Code"}
          </CardTitle>
          <CardDescription className="text-muted-foreground text-sm">
            {step === "email" ? (
              sellerName ? (
                <>
                  <span className="font-semibold text-foreground">
                    {sellerName}
                  </span>{" "}
                  has shared a {documentType}{" "}
                  <span className="italic">"{title}"</span> with you.
                </>
              ) : (
                <>
                  Please verify your identity to access this secure{" "}
                  {documentType}.
                </>
              )
            ) : (
              <>
                We sent a 6-digit code to{" "}
                <span className="font-medium text-foreground">
                  {targetEmail}
                </span>
              </>
            )}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 pt-2">
          {errorMsg && (
            <div className="rounded-md bg-destructive/10 p-3 text-destructive text-xs">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 rounded-md bg-emerald-500/10 p-3 text-emerald-600 text-xs dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {step === "email" ? (
            <form onSubmit={handleSendCode} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="flex items-center justify-between font-medium text-muted-foreground text-xs">
                  <span>Recipient Email Address</span>
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Lock className="h-3 w-3" /> Unchangeable
                  </span>
                </Label>
                <div className="flex items-center gap-2 rounded-md border border-input bg-muted/40 px-3 py-2 text-foreground text-xs shadow-xs">
                  <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate font-medium">
                    {targetEmail || "No recipient email bound"}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  This document is securely locked to this recipient email.
                </p>
              </div>

              <Button
                type="submit"
                disabled={loading || !targetEmail}
                className="w-full font-semibold text-xs"
              >
                {loading ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    Sending Code...
                  </>
                ) : (
                  <>
                    Request OTP
                    <ArrowRight className="ml-2 h-3.5 w-3.5" />
                  </>
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyCode} className="space-y-5">
              <div className="flex justify-center py-2">
                <InputOTP
                  maxLength={6}
                  value={otpCode}
                  onChange={(val) => setOtpCode(val)}
                  disabled={loading}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                  </InputOTPGroup>
                  <InputOTPSeparator />
                  <InputOTPGroup>
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <div className="flex justify-center text-xs">
                {secondsLeft > 0 ? (
                  <span className="text-muted-foreground">
                    Resend in {formatTime(secondsLeft)}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSendCode()}
                    disabled={loading}
                    className="font-medium text-foreground underline-offset-4 transition-colors hover:underline"
                  >
                    Resend code
                  </button>
                )}
              </div>

              <Button
                type="submit"
                size="lg"
                disabled={loading || otpCode.trim().length !== 6}
                className="w-full font-semibold text-xs"
              >
                {loading ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    Verifying...
                  </>
                ) : (
                  "Verify & Access Document"
                )}
              </Button>

              <div className="flex justify-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setStep("email")
                    setErrorMsg(null)
                    setSuccessMsg(null)
                  }}
                  className="inline-flex items-center gap-1 text-muted-foreground text-xs transition-colors hover:text-foreground"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Back to request OTP
                </button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

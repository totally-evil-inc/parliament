import type { ReactNode } from "react"
import { AuthSplitLayout } from "@/components/auth-split-layout"

type Variant = "welcome" | "request-access" | "onboarding"

export function AuthShell({
  children,
  variant = "welcome",
}: {
  children: ReactNode
  variant?: Variant
}) {
  return (
    <AuthSplitLayout
      rightClassName="lg:w-[620px]"
      left={
        <div className="flex h-full flex-col justify-between p-12">
          <div className="flex items-center gap-2 font-mono text-sm">
            <span className="inline-block h-2 w-2 rounded-full bg-foreground" />
            <span className="tracking-[0.2em] uppercase">
              Sean's scratch pad
            </span>
          </div>
          {variant === "request-access" ? (
            <div className="max-w-md">
              <div className="font-mono text-[11px] tracking-[0.3em] text-muted-foreground uppercase">
                Quiet onboarding
              </div>
              <p className="mt-3 font-heading text-xl leading-snug md:text-2xl">
                A focused waitlist screen with one clear action for invite-only
                entry points.
              </p>
            </div>
          ) : variant === "onboarding" ? (
            <div className="max-w-md">
              <div className="font-mono text-[11px] tracking-[0.3em] text-muted-foreground uppercase">
                First steps
              </div>
              <p className="mt-3 font-heading text-xl leading-snug md:text-2xl">
                A guided multi-step setup, paced so each screen carries one
                decision at a time.
              </p>
            </div>
          ) : (
            <div className="max-w-md">
              <div className="font-mono text-[11px] tracking-[0.3em] text-muted-foreground uppercase">
                Sign-in design
              </div>
              <p className="mt-3 font-heading text-xl leading-snug md:text-2xl">
                Split layout with a quiet brand panel and a single centered
                form.
              </p>
            </div>
          )}
        </div>
      }
      right={children}
    />
  )
}

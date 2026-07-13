import { createFileRoute } from "@tanstack/react-router"
import { AuthSeparator } from "@/features/auth/components/auth-separator"
import { SocialAuthButtons } from "@/features/auth/components/social-auth-buttons"
import { MagicLinkForm } from "@/features/auth/sign-in/components/magic-link-form"

export const Route = createFileRoute("/auth/sign-in/")({
  component: SignInPage,
})

function SignInPage() {
  return (
    <>
      <div className="absolute top-6 left-6 flex items-center gap-2 font-mono text-sm lg:hidden">
        <span className="inline-block h-2 w-2 rounded-full bg-foreground" />
        <span className="uppercase tracking-[0.2em]">
          Sean&apos;s scratch pad
        </span>
      </div>

      <div className="w-full max-w-lg">
        <div className="font-mono text-[11px] text-muted-foreground uppercase tracking-[0.3em]">
          Welcome back
        </div>
        <h1 className="mt-2 font-heading text-3xl leading-tight">
          Enter your command center
        </h1>
        <p className="mt-2 text-muted-foreground text-sm">
          Sign in to continue.
        </p>

        <MagicLinkForm />
        <AuthSeparator />
        <SocialAuthButtons />
      </div>
    </>
  )
}

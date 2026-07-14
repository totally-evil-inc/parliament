import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router"
import { AuthShell } from "@/layouts/auth-shell"

export const Route = createFileRoute("/auth")({
  component: AuthLayout,
})

function AuthLayout() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const copy = pathname.includes("/onboarding")
    ? {
        label: "Organization setup",
        body: "Create your organization, secure your account, and bring teammates in when you're ready.",
      }
    : {
        label: "Sign-in design",
        body: "Split layout with a quiet brand panel and a single centered form.",
      }

  return (
    <AuthShell
      left={
        <div className="flex h-full flex-col justify-between p-12">
          <div className="flex items-center gap-2 font-mono text-sm">
            <span className="inline-block h-2 w-2 rounded-full bg-foreground" />
            <span className="uppercase tracking-[0.2em]">
              Sean&apos;s scratch pad
            </span>
          </div>
          <div className="max-w-md">
            <div className="font-mono text-[11px] text-muted-foreground uppercase tracking-[0.3em]">
              {copy.label}
            </div>
            <p className="mt-3 font-heading text-xl leading-snug md:text-2xl">
              {copy.body}
            </p>
          </div>
        </div>
      }
      right={<Outlet />}
    />
  )
}

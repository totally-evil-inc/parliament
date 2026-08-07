import type { ErrorComponentProps } from "@tanstack/react-router"
import { Link, useNavigate } from "@tanstack/react-router"
import { Button } from "@workspace/ui/components/button"

export function DefaultNotFound() {
  const navigate = useNavigate()

  return (
    <div className="relative min-h-svh overflow-hidden bg-background text-foreground">
      <BackgroundGrid />
      <div className="relative mx-auto flex min-h-svh max-w-3xl flex-col items-center justify-center px-6 text-center">
        <div className="mb-6 font-mono text-[10px] text-muted-foreground uppercase tracking-[0.4em]">
          Status · 404
        </div>

        <BigNumerals number="404" />

        <h1 className="mt-10 max-w-md font-heading font-semibold text-2xl leading-tight md:text-3xl">
          We can't find that page.
        </h1>
        <p className="mt-2 max-w-sm text-balance text-muted-foreground text-sm">
          The link may be old, or the page may have moved. Check the URL or
          head back to somewhere you know.
        </p>

        <div className="mt-8 flex items-center gap-2">
          <Button
            variant="outline"
            size="default"
            onClick={() => {
              if (typeof window !== "undefined" && window.history.length > 1) {
                window.history.back()
              } else {
                void navigate({ to: "/" })
              }
            }}
          >
            <ArrowLeftIcon />
            Go back
          </Button>
          <Link to="/">
            <Button size="default">
              <HomeIcon />
              Take me home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

export function DefaultErrorComponent({ error, reset }: ErrorComponentProps) {
  const errorMessage =
    error instanceof Error ? error.message : "An unexpected error occurred."

  return (
    <div className="relative min-h-svh overflow-hidden bg-background text-foreground">
      <BackgroundGrid />
      <div className="relative mx-auto flex min-h-svh max-w-3xl flex-col items-center justify-center px-6 text-center">
        <div className="mb-6 font-mono text-[10px] text-destructive uppercase tracking-[0.4em]">
          Status · Error
        </div>

        <BigNumerals number="500" />

        <h1 className="mt-10 max-w-md font-heading font-semibold text-2xl leading-tight md:text-3xl">
          Something went wrong.
        </h1>
        <p className="mt-2 max-w-md text-balance text-muted-foreground text-sm">
          {errorMessage}
        </p>

        <div className="mt-8 flex items-center gap-2">
          {reset ? (
            <Button variant="outline" size="default" onClick={() => reset()}>
              <RotateCcwIcon />
              Try again
            </Button>
          ) : (
            <Button
              variant="outline"
              size="default"
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.location.reload()
                }
              }}
            >
              <RotateCcwIcon />
              Reload page
            </Button>
          )}
          <Link to="/">
            <Button size="default">
              <HomeIcon />
              Take me home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

function ArrowLeftIcon() {
  return (
    <svg
      className="mr-2 size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </svg>
  )
}

function HomeIcon() {
  return (
    <svg
      className="mr-2 size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
      <path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </svg>
  )
}

function RotateCcwIcon() {
  return (
    <svg
      className="mr-2 size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  )
}

function BigNumerals({ number }: { number: string }) {
  return (
    <div className="relative font-heading font-bold text-[clamp(8rem,22vw,16rem)] leading-none tracking-tighter">
      <span className="bg-gradient-to-b from-foreground to-foreground/30 bg-clip-text text-transparent">
        {number}
      </span>
      <div
        aria-hidden
        className="-bottom-2 pointer-events-none absolute inset-x-0 h-1/2"
        style={{
          background:
            "radial-gradient(60% 100% at 50% 100%, color-mix(in srgb, var(--background) 80%, transparent) 50%, transparent 100%)",
        }}
      />
    </div>
  )
}

function BackgroundGrid() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 opacity-[0.35]"
      style={{
        backgroundImage:
          "linear-gradient(to right, color-mix(in srgb, var(--foreground) 8%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in srgb, var(--foreground) 8%, transparent) 1px, transparent 1px)",
        backgroundSize: "48px 48px",
        maskImage:
          "radial-gradient(ellipse at center, black 35%, transparent 75%)",
      }}
    />
  )
}

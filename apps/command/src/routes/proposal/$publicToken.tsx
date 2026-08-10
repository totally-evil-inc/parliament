import { createFileRoute } from "@tanstack/react-router"
import * as React from "react"

export const Route = createFileRoute("/proposal/$publicToken")({
  component: PublicProposalRoute,
})

function PublicProposalRoute() {
  const { publicToken } = Route.useParams()

  React.useEffect(() => {
    const gateBaseUrl =
      (import.meta.env.VITE_GATE_URL as string | undefined) ||
      "http://localhost:4100"
    window.location.replace(`${gateBaseUrl}/p/${publicToken}`)
  }, [publicToken])

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <section className="w-full max-w-md rounded-md border bg-background p-6 text-center shadow-sm">
        <h1 className="font-semibold text-lg">Redirecting to Client Gate...</h1>
        <p className="mt-2 text-muted-foreground text-sm">
          Please wait while we transfer you to the proposal viewer.
        </p>
      </section>
    </main>
  )
}

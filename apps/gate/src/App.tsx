import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import {
  buildInvoiceRenderModel,
  buildProposalRenderModel,
} from "@workspace/document"
import "@workspace/ui/globals.css"
import { Loader2 } from "lucide-react"
import { useEffect, useState } from "react"
import { InvoiceView } from "./components/InvoiceView"
import { ProposalView } from "./components/ProposalView"
import { StatusScreen } from "./components/StatusScreen"
import {
  type AcceptancePayload,
  fetchPublicInvoice,
  fetchPublicProposal,
  recordClientEvent,
  sendOtp,
  submitInvoiceAcceptance,
  submitProposalAcceptance,
  verifyOtp,
} from "./lib/api"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
})

export type ParsedRoute =
  | { type: "proposal"; token: string }
  | { type: "invoice"; token: string }
  | { type: "unknown" }

export function parsePathname(pathname: string): ParsedRoute {
  const proposalMatch = pathname.match(/^\/p\/([^/]+)/)
  if (proposalMatch?.[1]) {
    return { type: "proposal", token: decodeURIComponent(proposalMatch[1]) }
  }

  const invoiceMatch = pathname.match(/^\/i\/([^/]+)/)
  if (invoiceMatch?.[1]) {
    return { type: "invoice", token: decodeURIComponent(invoiceMatch[1]) }
  }

  return { type: "unknown" }
}

function GateRouter() {
  const [pathname, setPathname] = useState(() => window.location.pathname)
  const queryClientInstance = useQueryClient()

  useEffect(() => {
    const onPopState = () => setPathname(window.location.pathname)
    window.addEventListener("popstate", onPopState)
    return () => window.removeEventListener("popstate", onPopState)
  }, [])

  const route = parsePathname(pathname)

  if (route.type === "proposal") {
    return (
      <ProposalRouteHandler
        token={route.token}
        queryClient={queryClientInstance}
      />
    )
  }

  if (route.type === "invoice") {
    return (
      <InvoiceRouteHandler
        token={route.token}
        queryClient={queryClientInstance}
      />
    )
  }

  return <StatusScreen status="not_found" />
}

function ProposalRouteHandler({
  token,
  queryClient,
}: {
  token: string
  queryClient: ReturnType<typeof useQueryClient>
}) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["proposal", token],
    queryFn: () => fetchPublicProposal(token),
  })

  // Event recording mutation
  const eventMutation = useMutation({
    mutationFn: recordClientEvent,
  })

  useEffect(() => {
    if (data && data.status === "ready") {
      eventMutation.mutate({
        documentType: "proposal",
        token,
        eventType: "document.viewed",
      })
    }
  }, [data?.status, token])

  // Accept mutation
  const acceptMutation = useMutation({
    mutationFn: (payload: AcceptancePayload) =>
      submitProposalAcceptance(token, payload),
    onSuccess: (res) => {
      if (res.success) {
        queryClient.invalidateQueries({ queryKey: ["proposal", token] })
      } else {
        throw new Error(res.error || "Failed to submit proposal acceptance")
      }
    },
  })

  // OTP mutations
  const sendOtpMutation = useMutation({
    mutationFn: ({
      publicLinkId,
      email,
    }: {
      publicLinkId: string
      email: string
    }) => sendOtp(publicLinkId, email),
  })

  const verifyOtpMutation = useMutation({
    mutationFn: ({
      publicLinkId,
      email,
      code,
    }: {
      publicLinkId: string
      email: string
      code: string
    }) => verifyOtp(publicLinkId, email, code),
  })

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !data || data.status === "not_found") {
    return <StatusScreen status="not_found" documentType="proposal" />
  }

  if (data.status === "unavailable") {
    return (
      <StatusScreen
        status="unavailable"
        reason={data.reason}
        documentType="proposal"
      />
    )
  }

  const renderModel = buildProposalRenderModel(data.document)

  return (
    <ProposalView
      proposal={renderModel}
      accepted={data.accepted}
      publicLinkId={data.linkId}
      onAccept={async (payload) => {
        await acceptMutation.mutateAsync(payload)
      }}
      onSendOtp={async (email) => {
        try {
          return await sendOtpMutation.mutateAsync({ publicLinkId: data.linkId, email })
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "Failed to send OTP"
          return { success: false, error: msg }
        }
      }}
      onVerifyOtp={async (email, code) => {
        try {
          return await verifyOtpMutation.mutateAsync({
            publicLinkId: data.linkId,
            email,
            code,
          })
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "Failed to verify OTP"
          return { success: false, error: msg }
        }
      }}
      isSubmitting={acceptMutation.isPending}
    />
  )
}

function InvoiceRouteHandler({
  token,
  queryClient,
}: {
  token: string
  queryClient: ReturnType<typeof useQueryClient>
}) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["invoice", token],
    queryFn: () => fetchPublicInvoice(token),
  })

  const eventMutation = useMutation({
    mutationFn: recordClientEvent,
  })

  useEffect(() => {
    if (data && data.status === "ready") {
      eventMutation.mutate({
        documentType: "invoice",
        token,
        eventType: "document.viewed",
      })
    }
  }, [data?.status, token])

  const acceptMutation = useMutation({
    mutationFn: (payload: AcceptancePayload) =>
      submitInvoiceAcceptance(token, payload),
    onSuccess: (res) => {
      if (res.success) {
        queryClient.invalidateQueries({ queryKey: ["invoice", token] })
      } else {
        throw new Error(res.error || "Failed to submit invoice acceptance")
      }
    },
  })

  const sendOtpMutation = useMutation({
    mutationFn: ({
      publicLinkId,
      email,
    }: {
      publicLinkId: string
      email: string
    }) => sendOtp(publicLinkId, email),
  })

  const verifyOtpMutation = useMutation({
    mutationFn: ({
      publicLinkId,
      email,
      code,
    }: {
      publicLinkId: string
      email: string
      code: string
    }) => verifyOtp(publicLinkId, email, code),
  })

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !data || data.status === "not_found") {
    return <StatusScreen status="not_found" documentType="invoice" />
  }

  if (data.status === "unavailable") {
    return (
      <StatusScreen
        status="unavailable"
        reason={data.reason}
        documentType="invoice"
      />
    )
  }

  const renderModel = buildInvoiceRenderModel(data.document)

  return (
    <InvoiceView
      invoice={renderModel}
      paymentLinkUrl={data.paymentLinkUrl}
      accepted={data.accepted}
      publicLinkId={data.linkId}
      onPayNow={() => {
        eventMutation.mutate({
          documentType: "invoice",
          token,
          eventType: "payment.initiated",
        })
      }}
      onAccept={async (payload) => {
        await acceptMutation.mutateAsync(payload)
      }}
      onSendOtp={async (email) => {
        try {
          return await sendOtpMutation.mutateAsync({ publicLinkId: data.linkId, email })
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "Failed to send OTP"
          return { success: false, error: msg }
        }
      }}
      onVerifyOtp={async (email, code) => {
        try {
          return await verifyOtpMutation.mutateAsync({
            publicLinkId: data.linkId,
            email,
            code,
          })
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "Failed to verify OTP"
          return { success: false, error: msg }
        }
      }}
      isSubmitting={acceptMutation.isPending}
    />
  )
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <GateRouter />
    </QueryClientProvider>
  )
}

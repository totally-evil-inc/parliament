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
} from "@workspace/document/render"
import "@workspace/ui/globals.css"
import { Loader2 } from "lucide-react"
import { useEffect, useState } from "react"

import { GateChallenge } from "./components/GateChallenge"
import { InvoiceView } from "./components/InvoiceView"
import { ProposalView } from "./components/ProposalView"
import { StatusScreen } from "./components/StatusScreen"
import {
  type AcceptancePayload,
  fetchPublicInvoice,
  fetchPublicInvoiceMeta,
  fetchPublicProposal,
  fetchPublicProposalMeta,
  recordClientEvent,
  submitInvoiceAcceptance,
  submitProposalAcceptance,
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
  const { data: meta, isLoading: isMetaLoading } = useQuery({
    queryKey: ["proposal-meta", token],
    queryFn: () => fetchPublicProposalMeta(token),
  })

  const {
    data: proposalData,
    isLoading: isDocLoading,
    error: docError,
    refetch,
  } = useQuery({
    queryKey: ["proposal", token],
    queryFn: () => fetchPublicProposal(token),
    enabled: meta?.status === "ready",
  })

  const eventMutation = useMutation({
    mutationFn: recordClientEvent,
  })

  useEffect(() => {
    if (proposalData && proposalData.status === "ready") {
      eventMutation.mutate({
        documentType: "proposal",
        token,
        eventType: "document.viewed",
      })
    }
  }, [proposalData, eventMutation.mutate, token])

  const acceptMutation = useMutation({
    mutationFn: async (payload: AcceptancePayload) => {
      const res = await submitProposalAcceptance(token, payload)
      if (!res.success) {
        throw new Error(res.error || "Failed to submit proposal acceptance")
      }
      return res
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposal", token] })
    },
  })

  if (isMetaLoading || (meta?.status === "ready" && isDocLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!meta || meta.status === "not_found") {
    return <StatusScreen status="not_found" documentType="proposal" />
  }

  if (meta.status === "unavailable") {
    return (
      <StatusScreen
        status="unavailable"
        reason={meta.reason}
        documentType="proposal"
      />
    )
  }

  // Require verification if forbidden or error
  if (
    !proposalData ||
    proposalData.status === "forbidden" ||
    (docError && docError.message.includes("401"))
  ) {
    return (
      <GateChallenge
        title={meta.title}
        sellerName={meta.sellerName}
        boundEmail={meta.recipientEmail}
        documentType="proposal"
        onVerified={() => {
          refetch()
        }}
      />
    )
  }

  if (proposalData.status === "ready") {
    const renderModel = buildProposalRenderModel(proposalData.document)
    return (
      <ProposalView
        proposal={renderModel}
        accepted={proposalData.accepted}
        publicLinkId={proposalData.linkId}
        onAccept={async (payload) => {
          await acceptMutation.mutateAsync(payload)
        }}
        isSubmitting={acceptMutation.isPending}
      />
    )
  }

  return (
    <StatusScreen
      status="error"
      documentType="proposal"
      message={docError instanceof Error ? docError.message : undefined}
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
  const { data: meta, isLoading: isMetaLoading } = useQuery({
    queryKey: ["invoice-meta", token],
    queryFn: () => fetchPublicInvoiceMeta(token),
  })

  const {
    data: invoiceData,
    isLoading: isDocLoading,
    error: docError,
    refetch,
  } = useQuery({
    queryKey: ["invoice", token],
    queryFn: () => fetchPublicInvoice(token),
    enabled: meta?.status === "ready",
  })

  const eventMutation = useMutation({
    mutationFn: recordClientEvent,
  })

  useEffect(() => {
    if (invoiceData && invoiceData.status === "ready") {
      eventMutation.mutate({
        documentType: "invoice",
        token,
        eventType: "document.viewed",
      })
    }
  }, [invoiceData, eventMutation.mutate, token])

  const acceptMutation = useMutation({
    mutationFn: async (payload: AcceptancePayload) => {
      const res = await submitInvoiceAcceptance(token, payload)
      if (!res.success) {
        throw new Error(res.error || "Failed to submit invoice acceptance")
      }
      return res
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice", token] })
    },
  })

  if (isMetaLoading || (meta?.status === "ready" && isDocLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!meta || meta.status === "not_found") {
    return <StatusScreen status="not_found" documentType="invoice" />
  }

  if (meta.status === "unavailable") {
    return (
      <StatusScreen
        status="unavailable"
        reason={meta.reason}
        documentType="invoice"
      />
    )
  }

  if (
    !invoiceData ||
    invoiceData.status === "forbidden" ||
    (docError && docError.message.includes("401"))
  ) {
    return (
      <GateChallenge
        title={meta.number}
        sellerName={meta.sellerName}
        boundEmail={meta.recipientEmail}
        documentType="invoice"
        onVerified={() => {
          refetch()
        }}
      />
    )
  }

  if (invoiceData.status === "ready") {
    const renderModel = buildInvoiceRenderModel(invoiceData.document)
    return (
      <InvoiceView
        invoice={renderModel}
        paymentLinkUrl={invoiceData.paymentLinkUrl}
        accepted={invoiceData.accepted}
        publicLinkId={invoiceData.linkId}
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
        isSubmitting={acceptMutation.isPending}
      />
    )
  }

  return (
    <StatusScreen
      status="error"
      documentType="invoice"
      message={docError instanceof Error ? docError.message : undefined}
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

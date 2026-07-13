import * as React from "react"
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { buildProposalRenderModel } from "@workspace/document/render"
import { parseProposalDraft } from "@workspace/document/schema"
import {
  getDocumentTemplate,
} from "@workspace/document/presentation"
import { useTheme } from "@/components/theme-provider"
import { Button } from "@workspace/ui/components/button"
import { Checkbox } from "@workspace/ui/components/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"

import { ProposalPrintView } from "@/features/documents/print/proposal-print-view"
import { publicProposalQuery } from "@/api/proposals"
import { acceptPublicProposal } from "@/server/proposals"
import type { PublicProposalResult } from "@/server/proposals"

export const Route = createFileRoute("/proposal/$publicToken")({
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData(
      publicProposalQuery(params.publicToken)
    )
  },
  component: PublicProposalRoute,
})

function PublicProposalRoute() {
  const { publicToken } = Route.useParams()
  const query = publicProposalQuery(publicToken)
  const { data } = useSuspenseQuery(query)
  const proposal = data as PublicProposalResult

  if (proposal.status === "not_found") {
    return <UnavailableProposal title="Proposal link not found" />
  }
  if (proposal.status === "unavailable") {
    return (
      <UnavailableProposal
        title={
          proposal.reason === "expired"
            ? "Proposal link expired"
            : "Proposal link unavailable"
        }
      />
    )
  }

  const { resolved: appTheme } = useTheme()
  const document = parseProposalDraft(proposal.document)

  return (
    <div className="h-screen overflow-auto bg-muted/30">
      <ProposalPrintView
        model={buildProposalRenderModel(document)}
        template={getDocumentTemplate(document.template, appTheme)}
      />
      <div className="fixed right-4 bottom-4 left-4 z-20 mx-auto flex max-w-3xl items-center justify-between gap-3 rounded-md border bg-background/95 p-3 shadow-lg backdrop-blur">
        {proposal.accepted ? (
          <AcceptanceCertificate
            acceptedAt={proposal.accepted.acceptedAt}
            signerEmail={proposal.accepted.signerEmail}
            signerName={proposal.accepted.signerName}
            tokenSuffix={proposal.tokenSuffix}
          />
        ) : (
          <>
            <div className="min-w-0">
              <p className="text-sm font-medium">Ready to accept</p>
              <p className="text-xs text-muted-foreground">
                Review the proposal, then sign to record acceptance.
              </p>
            </div>
            <AcceptanceDialog token={proposal.token} />
          </>
        )}
      </div>
    </div>
  )
}

function AcceptanceDialog({ token }: { token: string }) {
  const queryClient = useQueryClient()
  const [open, setOpen] = React.useState(false)
  const [signerName, setSignerName] = React.useState("")
  const [signerEmail, setSignerEmail] = React.useState("")
  const [signatureText, setSignatureText] = React.useState("")
  const [agreedTerms, setAgreedTerms] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const acceptProposal = useMutation({
    mutationFn: () =>
      acceptPublicProposal({
        data: {
          token,
          signerName,
          signerEmail,
          signatureText,
          agreedTerms,
        },
      }),
    onSuccess: async () => {
      setOpen(false)
      await queryClient.invalidateQueries({
        queryKey: ["proposals", "public", token],
      })
    },
    onError: (nextError) => {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Could not accept proposal"
      )
    },
  })
  const canSubmit =
    signerName.trim().length > 0 && signerEmail.trim().length > 0 && agreedTerms

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" onClick={() => setOpen(true)}>
        Accept proposal
      </Button>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Accept proposal</DialogTitle>
          <DialogDescription>
            Enter the signer details to create an acceptance record.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            setError(null)
            if (canSubmit) acceptProposal.mutate()
          }}
        >
          <Field>
            <FieldLabel htmlFor="signer-name">Signer name</FieldLabel>
            <Input
              id="signer-name"
              value={signerName}
              onChange={(event) => setSignerName(event.target.value)}
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="signer-email">Signer email</FieldLabel>
            <Input
              id="signer-email"
              type="email"
              value={signerEmail}
              onChange={(event) => setSignerEmail(event.target.value)}
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="signature-text">Typed signature</FieldLabel>
            <Textarea
              id="signature-text"
              value={signatureText}
              onChange={(event) => setSignatureText(event.target.value)}
              placeholder={signerName || "Optional"}
            />
          </Field>
          <Field orientation="horizontal">
            <Checkbox
              checked={agreedTerms}
              onCheckedChange={(checked) => setAgreedTerms(checked === true)}
            />
            <FieldDescription>
              I agree to the proposal terms and authorize this acceptance.
            </FieldDescription>
          </Field>
          {error ? <FieldError>{error}</FieldError> : null}
          <DialogFooter>
            <Button
              type="submit"
              disabled={!canSubmit || acceptProposal.isPending}
            >
              {acceptProposal.isPending ? "Accepting..." : "Accept"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function AcceptanceCertificate({
  acceptedAt,
  signerEmail,
  signerName,
  tokenSuffix,
}: {
  acceptedAt: string
  signerEmail: string
  signerName: string
  tokenSuffix: string
}) {
  return (
    <div className="min-w-0 text-xs">
      <p className="text-sm font-medium">Accepted by {signerName}</p>
      <p className="text-muted-foreground">
        {signerEmail} · {formatDateTime(acceptedAt)} · Link {tokenSuffix}
      </p>
    </div>
  )
}

function UnavailableProposal({ title }: { title: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <section className="w-full max-w-md rounded-md border bg-background p-6 text-center shadow-sm">
        <h1 className="text-lg font-semibold">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Contact the sender if you expected to view this proposal.
        </p>
      </section>
    </main>
  )
}



function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

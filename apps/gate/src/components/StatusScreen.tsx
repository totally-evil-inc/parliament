import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  ClockIcon,
  DocumentMinusIcon,
  ShieldExclamationIcon,
} from "@heroicons/react/24/outline"

export type StatusScreenProps = {
  status: "not_found" | "expired" | "unavailable" | "error"
  reason?: "revoked" | "expired"
  title?: string
  message?: string
  documentType?: "proposal" | "invoice"
}

export function StatusScreen({
  status,
  reason,
  title,
  message,
  documentType = "proposal",
}: StatusScreenProps) {
  const isExpired = status === "expired" || reason === "expired"
  const isRevoked =
    status === "unavailable" && (reason === "revoked" || !isExpired)

  const docLabel = documentType === "invoice" ? "Invoice" : "Proposal"

  let icon = (
    <DocumentMinusIcon className="mx-auto mb-3 h-12 w-12 text-destructive" />
  )
  let defaultTitle = `${docLabel} Not Found`
  let defaultMessage = `The requested ${docLabel.toLowerCase()} link does not exist or may have been removed.`

  if (isExpired) {
    icon = <ClockIcon className="mx-auto mb-3 h-12 w-12 text-amber-500" />
    defaultTitle = `${docLabel} Link Expired`
    defaultMessage = `This ${docLabel.toLowerCase()} link has expired and is no longer accessible. Please contact the sender for an updated link.`
  } else if (isRevoked) {
    icon = (
      <ShieldExclamationIcon className="mx-auto mb-3 h-12 w-12 text-destructive" />
    )
    defaultTitle = `${docLabel} Link Unavailable`
    defaultMessage = `This ${docLabel.toLowerCase()} link is no longer active or has been revoked by the issuer.`
  } else if (status === "error") {
    icon = (
      <ShieldExclamationIcon className="mx-auto mb-3 h-12 w-12 text-destructive" />
    )
    defaultTitle = `${docLabel} Temporarily Unavailable`
    defaultMessage = `We couldn't load this ${docLabel.toLowerCase()} right now. Please try again or contact the sender.`
  }

  const finalTitle = title || defaultTitle
  const finalMessage = message || defaultMessage

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 text-foreground">
      <Card className="w-full max-w-md border-border text-center shadow-sm">
        <CardHeader className="pt-8 pb-2">
          {icon}
          <CardTitle className="font-bold text-xl">{finalTitle}</CardTitle>
        </CardHeader>
        <CardContent className="pb-8">
          <p className="text-muted-foreground text-sm leading-relaxed">
            {finalMessage}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

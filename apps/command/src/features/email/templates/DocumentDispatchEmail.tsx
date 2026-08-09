import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components"

export interface DocumentDispatchEmailProps {
  documentType: "proposal" | "invoice"
  documentTitle: string
  personalMessage?: string
  shareUrl: string
  recipientEmail?: string
}

export function DocumentDispatchEmail({
  documentType = "proposal",
  documentTitle = "Untitled Document",
  personalMessage = "",
  shareUrl = "#",
  recipientEmail,
}: DocumentDispatchEmailProps) {
  const isProposal = documentType === "proposal"
  const typeLabel = isProposal ? "Proposal" : "Invoice"
  const actionLabel = isProposal ? "View Proposal" : "View Invoice"
  const previewText = `${typeLabel}: ${documentTitle}`

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header Row */}
          <Section style={headerRow}>
            <span style={logoDot} />
            <span style={logoText}>PARLIAMENT</span>
            <span style={typeBadge}>{documentType.toUpperCase()}</span>
          </Section>

          {/* Heading */}
          <Heading style={heading}>{documentTitle}</Heading>
          <Text style={subheading}>
            A {typeLabel.toLowerCase()} has been sent to you for review.
          </Text>

          {/* Personal Message Note */}
          {personalMessage ? (
            <Section style={messageCard}>
              <Text style={messageLabel}>Message</Text>
              <Text style={messageBody}>{personalMessage}</Text>
            </Section>
          ) : null}

          {/* Action Button */}
          <Section style={buttonContainer}>
            <Link style={button} href={shareUrl}>
              {actionLabel}
            </Link>
          </Section>

          {/* Direct URL Fallback */}
          <Section style={linkFallbackSection}>
            <Text style={fallbackLabel}>Direct link:</Text>
            <Link style={fallbackLink} href={shareUrl}>
              {shareUrl}
            </Link>
          </Section>

          <Section style={divider} />

          {/* Footer */}
          <Text style={footer}>
            Parliament Workspace
            {recipientEmail ? ` • Sent to ${recipientEmail}` : ""}
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

// Clean, understated, minimalist email styles
const main = {
  backgroundColor: "#f8fafc",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  padding: "40px 12px",
}

const container = {
  backgroundColor: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "12px",
  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
  maxWidth: "500px",
  margin: "0 auto",
  padding: "36px 32px",
}

const headerRow = {
  marginBottom: "24px",
}

const logoDot = {
  display: "inline-block",
  height: "7px",
  width: "7px",
  borderRadius: "50%",
  backgroundColor: "#0f172a",
  marginRight: "8px",
}

const logoText = {
  fontFamily: "monospace",
  fontSize: "11px",
  fontWeight: "600" as const,
  color: "#0f172a",
  letterSpacing: "0.18em",
}

const typeBadge = {
  float: "right" as const,
  display: "inline-block",
  padding: "3px 8px",
  borderRadius: "6px",
  backgroundColor: "#f1f5f9",
  color: "#475569",
  fontSize: "10px",
  fontWeight: "600" as const,
  letterSpacing: "0.04em",
}

const heading = {
  color: "#0f172a",
  fontSize: "20px",
  fontWeight: "600" as const,
  lineHeight: "1.3",
  letterSpacing: "-0.01em",
  margin: "0 0 6px 0",
}

const subheading = {
  color: "#64748b",
  fontSize: "13px",
  lineHeight: "1.5",
  margin: "0 0 20px 0",
}

const messageCard = {
  backgroundColor: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "8px",
  padding: "14px 16px",
  marginBottom: "24px",
}

const messageLabel = {
  color: "#64748b",
  fontSize: "10px",
  fontWeight: "600" as const,
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
  margin: "0 0 4px 0",
}

const messageBody = {
  color: "#334155",
  fontSize: "13px",
  lineHeight: "1.5",
  margin: "0",
  whiteSpace: "pre-wrap" as const,
}

const buttonContainer = {
  textAlign: "center" as const,
  margin: "24px 0 20px 0",
}

const button = {
  display: "inline-block",
  backgroundColor: "#0f172a",
  color: "#ffffff",
  fontSize: "13px",
  fontWeight: "500" as const,
  textDecoration: "none",
  borderRadius: "8px",
  padding: "11px 24px",
}

const linkFallbackSection = {
  textAlign: "center" as const,
  marginBottom: "20px",
}

const fallbackLabel = {
  color: "#94a3b8",
  fontSize: "11px",
  margin: "0 0 2px 0",
}

const fallbackLink = {
  color: "#475569",
  fontSize: "11px",
  wordBreak: "break-all" as const,
  textDecoration: "underline",
}

const divider = {
  borderTop: "1px solid #f1f5f9",
  margin: "24px 0 16px 0",
}

const footer = {
  color: "#94a3b8",
  fontSize: "11px",
  textAlign: "center" as const,
  lineHeight: "1.5",
}

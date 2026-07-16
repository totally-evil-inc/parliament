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

interface MagicLinkEmailProps {
  url: string
  email: string
}

export function MagicLinkEmail({ url, email }: MagicLinkEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Sign in to Parliament</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={logoSection}>
            <span style={logoDot} />
            <span style={logoText}>PARLIAMENT</span>
          </Section>
          <Heading style={heading}>Sign in to your command center</Heading>
          <Text style={paragraph}>
            We received a request to sign in to Parliament for{" "}
            <span style={emailHighlight}>{email}</span>. Click the button below
            to securely authenticate.
          </Text>
          <Section style={buttonContainer}>
            <Link style={button} href={url}>
              Sign In Securely
            </Link>
          </Section>
          <Text style={paragraph}>
            If you did not request this link, you can safely ignore this email.
            This link is valid for 15 minutes and can only be used once.
          </Text>
          <Section style={divider} />
          <Text style={footer}>
            Parliament Inc. • Secure Passwordless Auth
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

// Styling tokens matching our design aesthetics
const main = {
  backgroundColor: "#030712", // slate-950
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  padding: "40px 10px",
}

const container = {
  backgroundColor: "#0f172a", // slate-900
  border: "1px solid #1e293b", // slate-800
  borderRadius: "16px",
  boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
  maxWidth: "520px",
  margin: "0 auto",
  padding: "40px 32px",
}

const logoSection = {
  display: "flex",
  alignItems: "center",
  marginBottom: "32px",
}

const logoDot = {
  display: "inline-block",
  height: "8px",
  width: "8px",
  borderRadius: "50%",
  backgroundColor: "#f9fafb", // white-ish
  marginRight: "8px",
}

const logoText = {
  fontFamily: "monospace",
  fontSize: "12px",
  fontWeight: "bold",
  color: "#f9fafb",
  letterSpacing: "0.2em",
}

const heading = {
  color: "#f9fafb",
  fontSize: "24px",
  fontWeight: "700",
  lineHeight: "1.3",
  margin: "0 0 16px 0",
}

const paragraph = {
  color: "#9ca3af", // slate-400
  fontSize: "14px",
  lineHeight: "1.6",
  margin: "0 0 24px 0",
}

const emailHighlight = {
  color: "#f3f4f6", // slate-100
  fontWeight: "600",
}

const buttonContainer = {
  textAlign: "center" as const,
  margin: "32px 0",
}

const button = {
  backgroundColor: "#6366f1", // violet-500
  borderRadius: "8px",
  color: "#ffffff",
  display: "inline-block",
  fontSize: "14px",
  fontWeight: "600",
  lineHeight: "48px",
  textAlign: "center" as const,
  textDecoration: "none",
  width: "100%",
  boxShadow: "0 4px 12px rgba(99, 102, 241, 0.2)",
}

const divider = {
  borderTop: "1px solid #1e293b",
  margin: "32px 0 24px 0",
}

const footer = {
  color: "#6b7280",
  fontSize: "12px",
  textAlign: "center" as const,
  margin: 0,
}

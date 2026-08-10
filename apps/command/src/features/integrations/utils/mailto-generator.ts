export interface MailtoOptions {
  to: string
  subject: string
  body: string
  cc?: string
  bcc?: string
}

/**
 * Generates a standard mailto: URL string with properly encoded parameters.
 */
export function generateMailtoUrl(options: MailtoOptions): string {
  const params = new URLSearchParams()
  params.append("subject", options.subject)
  params.append("body", options.body)

  if (options.cc) {
    params.append("cc", options.cc)
  }
  if (options.bcc) {
    params.append("bcc", options.bcc)
  }

  return `mailto:${options.to}?${params.toString().replace(/\+/g, "%20")}`
}

/**
 * Generates a direct Google Web Mail compose URL (opens native Gmail web compose in a new tab)
 */
export function generateGoogleWebComposeUrl(options: MailtoOptions): string {
  const params = new URLSearchParams({
    view: "cm",
    fs: "1",
    to: options.to,
    su: options.subject,
    body: options.body,
  })

  if (options.cc) {
    params.append("cc", options.cc)
  }
  if (options.bcc) {
    params.append("bcc", options.bcc)
  }

  return `https://mail.google.com/mail/?${params.toString().replace(/\+/g, "%20")}`
}

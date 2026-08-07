import type {
  GetPublicInvoiceResult,
  InvoiceAcceptanceRecord,
} from "../server/invoices"
import type {
  GetPublicProposalResult,
  ProposalAcceptanceRecord,
} from "../server/proposals"

export type AcceptancePayload = {
  signerName: string
  signerEmail: string
  signatureText?: string
  signatureImage?: string
  otpVerified?: boolean
  agreedTerms: boolean
}

export type AcceptanceResponse<T> = {
  success: boolean
  accepted?: T
  error?: string
}

export type OtpSendResponse = {
  success: boolean
  otpId?: string
  expiresAt?: string
  error?: string
}

export type OtpVerifyResponse = {
  success: boolean
  verifiedAt?: string
  error?: string
}

export type ClientEventPayload = {
  documentType: "proposal" | "invoice"
  token: string
  eventType: string
  metadata?: Record<string, unknown>
}

export type ClientEventResponse = {
  success: boolean
  error?: string
}

export async function fetchPublicProposal(
  token: string
): Promise<GetPublicProposalResult> {
  const res = await fetch(`/api/public/proposal/${encodeURIComponent(token)}`)
  const data = await res.json()
  return data as GetPublicProposalResult
}

export async function fetchPublicInvoice(
  token: string
): Promise<GetPublicInvoiceResult> {
  const res = await fetch(`/api/public/invoice/${encodeURIComponent(token)}`)
  const data = await res.json()
  return data as GetPublicInvoiceResult
}

export async function submitProposalAcceptance(
  token: string,
  payload: AcceptancePayload
): Promise<AcceptanceResponse<ProposalAcceptanceRecord>> {
  const res = await fetch(
    `/api/public/proposal/${encodeURIComponent(token)}/accept`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  )
  const data = await res.json()
  if (!res.ok && !data.error) {
    return { success: false, error: "Failed to submit proposal acceptance" }
  }
  return data
}

export async function submitInvoiceAcceptance(
  token: string,
  payload: AcceptancePayload
): Promise<AcceptanceResponse<InvoiceAcceptanceRecord>> {
  const res = await fetch(
    `/api/public/invoice/${encodeURIComponent(token)}/accept`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  )
  const data = await res.json()
  if (!res.ok && !data.error) {
    return { success: false, error: "Failed to submit invoice acceptance" }
  }
  return data
}

export async function sendOtp(
  publicLinkId: string,
  email: string
): Promise<OtpSendResponse> {
  const res = await fetch("/api/public/otp/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ publicLinkId, email }),
  })
  const data = await res.json()
  if (!res.ok && !data.error) {
    return { success: false, error: "Failed to send OTP" }
  }
  return data
}

export async function verifyOtp(
  publicLinkId: string,
  email: string,
  code: string
): Promise<OtpVerifyResponse> {
  const res = await fetch("/api/public/otp/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ publicLinkId, email, code }),
  })
  const data = await res.json()
  if (!res.ok && !data.error) {
    return { success: false, error: "Failed to verify OTP" }
  }
  return data
}

export async function recordClientEvent(
  payload: ClientEventPayload
): Promise<ClientEventResponse> {
  const res = await fetch("/api/public/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  const data = await res.json()
  if (!res.ok && !data.error) {
    return { success: false, error: "Failed to record event" }
  }
  return data
}

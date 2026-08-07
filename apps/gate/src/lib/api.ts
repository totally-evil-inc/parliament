import type {
  GetPublicInvoiceMetaResult,
  GetPublicInvoiceResult,
  InvoiceAcceptanceRecord,
} from "../server/invoices"
import type {
  GetPublicProposalMetaResult,
  GetPublicProposalResult,
  ProposalAcceptanceRecord,
} from "../server/proposals"

export async function fetchPublicProposalMeta(
  token: string
): Promise<GetPublicProposalMetaResult> {
  try {
    const res = await fetch(
      `/api/public/proposal/${encodeURIComponent(token)}/meta`
    )
    const data = await res.json().catch(() => ({ status: "not_found" }))
    return data as GetPublicProposalMetaResult
  } catch (_err) {
    return { status: "not_found" }
  }
}

export async function fetchPublicInvoiceMeta(
  token: string
): Promise<GetPublicInvoiceMetaResult> {
  try {
    const res = await fetch(
      `/api/public/invoice/${encodeURIComponent(token)}/meta`
    )
    const data = await res.json().catch(() => ({ status: "not_found" }))
    return data as GetPublicInvoiceMetaResult
  } catch (_err) {
    return { status: "not_found" }
  }
}

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
  try {
    const res = await fetch(`/api/public/proposal/${encodeURIComponent(token)}`)
    const data = await res.json().catch(() => ({ status: "not_found" }))
    if (!res.ok && res.status !== 404 && res.status !== 400) {
      const message =
        typeof data === "object" && data && "error" in data
          ? String(data.error)
          : `Failed to fetch proposal (${res.status})`
      const requestId = res.headers.get("x-request-id")
      throw new Error(
        `${message}${requestId ? ` (reference: ${requestId})` : ""}`
      )
    }
    return data as GetPublicProposalResult
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      err.message.startsWith("Failed to fetch proposal")
    ) {
      throw err
    }
    if (err instanceof Error) throw err
    throw new Error("Failed to fetch proposal")
  }
}

export async function fetchPublicInvoice(
  token: string
): Promise<GetPublicInvoiceResult> {
  try {
    const res = await fetch(`/api/public/invoice/${encodeURIComponent(token)}`)
    const data = await res.json().catch(() => ({ status: "not_found" }))
    if (!res.ok && res.status !== 404 && res.status !== 400) {
      const message =
        typeof data === "object" && data && "error" in data
          ? String(data.error)
          : `Failed to fetch invoice (${res.status})`
      const requestId = res.headers.get("x-request-id")
      throw new Error(
        `${message}${requestId ? ` (reference: ${requestId})` : ""}`
      )
    }
    return data as GetPublicInvoiceResult
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      err.message.startsWith("Failed to fetch invoice")
    ) {
      throw err
    }
    if (err instanceof Error) throw err
    throw new Error("Failed to fetch invoice")
  }
}

export async function submitProposalAcceptance(
  token: string,
  payload: AcceptancePayload
): Promise<AcceptanceResponse<ProposalAcceptanceRecord>> {
  try {
    const res = await fetch(
      `/api/public/proposal/${encodeURIComponent(token)}/accept`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    )
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return {
        success: false,
        error: data.error || "Failed to submit proposal acceptance",
      }
    }
    return data
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Network error"
    return { success: false, error: errorMsg }
  }
}

export async function submitInvoiceAcceptance(
  token: string,
  payload: AcceptancePayload
): Promise<AcceptanceResponse<InvoiceAcceptanceRecord>> {
  try {
    const res = await fetch(
      `/api/public/invoice/${encodeURIComponent(token)}/accept`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    )
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return {
        success: false,
        error: data.error || "Failed to submit invoice acceptance",
      }
    }
    return data
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Network error"
    return { success: false, error: errorMsg }
  }
}

export async function sendOtp(
  publicLinkId: string,
  email: string
): Promise<OtpSendResponse> {
  try {
    const res = await fetch("/api/public/otp/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publicLinkId, email }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return { success: false, error: data.error || "Failed to send OTP" }
    }
    return data
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Network error"
    return { success: false, error: errorMsg }
  }
}

export async function verifyOtp(
  publicLinkId: string,
  email: string,
  code: string
): Promise<OtpVerifyResponse> {
  try {
    const res = await fetch("/api/public/otp/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publicLinkId, email, code }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return { success: false, error: data.error || "Failed to verify OTP" }
    }
    return data
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Network error"
    return { success: false, error: errorMsg }
  }
}

export async function recordClientEvent(
  payload: ClientEventPayload
): Promise<ClientEventResponse> {
  try {
    const res = await fetch("/api/public/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return { success: false, error: data.error || "Failed to record event" }
    }
    return data
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Network error"
    return { success: false, error: errorMsg }
  }
}

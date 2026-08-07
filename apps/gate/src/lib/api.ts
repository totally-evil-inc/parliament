import type {
  AcceptancePayload,
  AcceptanceResponse,
  ClientEventPayload,
  ClientEventResponse,
  GetPublicInvoiceMetaResult,
  GetPublicInvoiceResult,
  GetPublicProposalMetaResult,
  GetPublicProposalResult,
  InvoiceAcceptanceRecord,
  ProposalAcceptanceRecord,
} from "@workspace/document/public-api"
import {
  getPublicInvoiceMetaResultSchema,
  getPublicInvoiceResultSchema,
  getPublicProposalMetaResultSchema,
  getPublicProposalResultSchema,
} from "@workspace/document/public-api"
import { getAuthServerUrl } from "./auth-client"

export type { AcceptancePayload, AcceptanceResponse, ClientEventPayload, ClientEventResponse }

export async function fetchPublicProposalMeta(
  token: string
): Promise<GetPublicProposalMetaResult> {
  try {
    const authUrl = getAuthServerUrl()
    const res = await fetch(
      `${authUrl}/api/public/proposal/${encodeURIComponent(token)}/meta`,
      {
        credentials: "include",
      }
    )
    const data = await res.json().catch(() => ({ status: "not_found" }))
    const parsed = getPublicProposalMetaResultSchema.safeParse(data)
    if (parsed.success) {
      return parsed.data
    }
    return { status: "not_found" }
  } catch (_err) {
    return { status: "not_found" }
  }
}

export async function fetchPublicInvoiceMeta(
  token: string
): Promise<GetPublicInvoiceMetaResult> {
  try {
    const authUrl = getAuthServerUrl()
    const res = await fetch(
      `${authUrl}/api/public/invoice/${encodeURIComponent(token)}/meta`,
      {
        credentials: "include",
      }
    )
    const data = await res.json().catch(() => ({ status: "not_found" }))
    const parsed = getPublicInvoiceMetaResultSchema.safeParse(data)
    if (parsed.success) {
      return parsed.data
    }
    return { status: "not_found" }
  } catch (_err) {
    return { status: "not_found" }
  }
}

export async function fetchPublicProposal(
  token: string
): Promise<GetPublicProposalResult> {
  try {
    const authUrl = getAuthServerUrl()
    const res = await fetch(
      `${authUrl}/api/public/proposal/${encodeURIComponent(token)}`,
      {
        credentials: "include",
      }
    )
    const data = await res.json().catch(() => ({ status: "not_found" }))
    if (!res.ok && res.status !== 404 && res.status !== 400 && res.status !== 403) {
      const message =
        typeof data === "object" && data && "error" in data
          ? String(data.error)
          : `Failed to fetch proposal (${res.status})`
      const requestId = res.headers.get("x-request-id")
      throw new Error(
        `${message}${requestId ? ` (reference: ${requestId})` : ""}`
      )
    }
    const parsed = getPublicProposalResultSchema.safeParse(data)
    if (parsed.success) {
      return parsed.data
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
    const authUrl = getAuthServerUrl()
    const res = await fetch(
      `${authUrl}/api/public/invoice/${encodeURIComponent(token)}`,
      {
        credentials: "include",
      }
    )
    const data = await res.json().catch(() => ({ status: "not_found" }))
    if (!res.ok && res.status !== 404 && res.status !== 400 && res.status !== 403) {
      const message =
        typeof data === "object" && data && "error" in data
          ? String(data.error)
          : `Failed to fetch invoice (${res.status})`
      const requestId = res.headers.get("x-request-id")
      throw new Error(
        `${message}${requestId ? ` (reference: ${requestId})` : ""}`
      )
    }
    const parsed = getPublicInvoiceResultSchema.safeParse(data)
    if (parsed.success) {
      return parsed.data
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
    const authUrl = getAuthServerUrl()
    const res = await fetch(
      `${authUrl}/api/public/proposal/${encodeURIComponent(token)}/accept`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
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
    const authUrl = getAuthServerUrl()
    const res = await fetch(
      `${authUrl}/api/public/invoice/${encodeURIComponent(token)}/accept`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
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

export async function recordClientEvent(
  payload: ClientEventPayload
): Promise<ClientEventResponse> {
  try {
    const authUrl = getAuthServerUrl()
    const res = await fetch(`${authUrl}/api/public/event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
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

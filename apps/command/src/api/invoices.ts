import { queryOptions } from "@tanstack/react-query"
import {
  getInvoiceDraft,
  getPublicInvoice,
  listInvoiceDrafts,
} from "@/server/invoices"

export const invoiceDraftsQuery = queryOptions({
  queryKey: ["invoices", "drafts"],
  queryFn: () => listInvoiceDrafts(),
})

export function invoiceDraftQuery(id: string) {
  return queryOptions({
    queryKey: ["invoices", "draft", id],
    queryFn: () => getInvoiceDraft({ data: { id } }),
  })
}

export function publicInvoiceQuery(token: string) {
  return queryOptions({
    queryKey: ["invoices", "public", token],
    queryFn: () => getPublicInvoice({ data: { token } }),
    staleTime: 0,
  })
}

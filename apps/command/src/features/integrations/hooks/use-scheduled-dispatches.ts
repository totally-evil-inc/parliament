import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { z } from "zod"
import type {
  ScheduledDispatchItem,
  scheduleDispatchInputSchema,
  updateScheduleInputSchema,
} from "@/server/scheduled-dispatches"
import {
  cancelScheduledDispatch,
  getScheduledDispatchForDocument,
  listScheduledDispatches,
  scheduleDocumentDispatch,
  sendScheduledDispatchNow,
  updateScheduledDispatch,
} from "@/server/scheduled-dispatches"

export type ScheduleDispatchPayload = z.infer<
  typeof scheduleDispatchInputSchema
>
export type UpdateSchedulePayload = z.infer<typeof updateScheduleInputSchema>

/**
 * Fetch active/pending scheduled dispatch for a given document (proposal or invoice)
 */
export function useScheduledDispatch(documentId: string | undefined) {
  return useQuery<ScheduledDispatchItem | null>({
    queryKey: ["scheduled-dispatch", documentId],
    queryFn: async () => {
      if (!documentId) return null
      return await getScheduledDispatchForDocument({
        data: { documentId },
      })
    },
    enabled: Boolean(documentId),
    refetchInterval: 15000, // Periodically check for status changes (e.g. sent)
  })
}

/**
 * Fetch all workspace scheduled dispatches
 */
export function useWorkspaceScheduledDispatches() {
  return useQuery<ScheduledDispatchItem[]>({
    queryKey: ["workspace-scheduled-dispatches"],
    queryFn: async () => {
      return await listScheduledDispatches()
    },
  })
}

/**
 * Mutation hook to schedule a document email dispatch
 */
export function useScheduleDocumentDispatch() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: ScheduleDispatchPayload) => {
      return await scheduleDocumentDispatch({ data: payload })
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["scheduled-dispatch", variables.documentId],
      })
      queryClient.invalidateQueries({
        queryKey: ["workspace-scheduled-dispatches"],
      })
      queryClient.invalidateQueries({ queryKey: ["proposals"] })
      queryClient.invalidateQueries({ queryKey: ["invoices"] })
    },
  })
}

/**
 * Mutation hook to update a pending scheduled dispatch
 */
export function useUpdateScheduledDispatch() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: UpdateSchedulePayload) => {
      return await updateScheduledDispatch({ data: payload })
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({
        queryKey: ["scheduled-dispatch", updated.documentId],
      })
      queryClient.invalidateQueries({
        queryKey: ["workspace-scheduled-dispatches"],
      })
      queryClient.invalidateQueries({ queryKey: ["proposals"] })
      queryClient.invalidateQueries({ queryKey: ["invoices"] })
    },
  })
}

/**
 * Mutation hook to cancel a scheduled dispatch
 */
export function useCancelScheduledDispatch() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      id?: string
      documentId?: string
      documentType?: "proposal" | "invoice"
    }) => {
      return await cancelScheduledDispatch({ data: params })
    },
    onSuccess: (_, variables) => {
      if (variables.documentId) {
        queryClient.invalidateQueries({
          queryKey: ["scheduled-dispatch", variables.documentId],
        })
      }
      queryClient.invalidateQueries({
        queryKey: ["workspace-scheduled-dispatches"],
      })
      queryClient.invalidateQueries({ queryKey: ["proposals"] })
      queryClient.invalidateQueries({ queryKey: ["invoices"] })
    },
  })
}

/**
 * Mutation hook to trigger immediate execution ("Send Now") of a scheduled dispatch
 */
export function useSendScheduledDispatchNow() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (dispatchId: string) => {
      return await sendScheduledDispatchNow({ data: { id: dispatchId } })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-dispatch"] })
      queryClient.invalidateQueries({
        queryKey: ["workspace-scheduled-dispatches"],
      })
      queryClient.invalidateQueries({ queryKey: ["proposals"] })
      queryClient.invalidateQueries({ queryKey: ["invoices"] })
    },
  })
}

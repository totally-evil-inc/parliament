import { useCallback, useEffect, useRef, useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { saveProposalDraft } from "../server/proposals"

export type SaveState = "idle" | "saving" | "saved" | "error"

export interface UseProposalPersistenceOptions {
  proposalId: string
  revision: number
  document: unknown
  debounceMs?: number
  onSaveSuccess?: () => void
  onSaveError?: (error: Error) => void
}

export function useProposalPersistence({
  proposalId,
  revision,
  document,
  debounceMs = 2000,
  onSaveSuccess,
  onSaveError,
}: UseProposalPersistenceOptions) {
  const [saveState, setSaveState] = useState<SaveState>("idle")
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isFirstRender = useRef(true)

  const { mutate, isPending } = useMutation({
    mutationFn: async (payload: { id: string; revision: number; document: unknown }) => {
      setSaveState("saving")
      return await saveProposalDraft({ data: payload })
    },
    onSuccess: (result) => {
      if (result.status === "saved") {
        setSaveState("saved")
        onSaveSuccess?.()
      } else {
        setSaveState("error")
      }
    },
    onError: (err: Error) => {
      setSaveState("error")
      onSaveError?.(err)
    },
  })

  const triggerSave = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }
    timerRef.current = setTimeout(() => {
      mutate({
        id: proposalId,
        revision,
        document,
      })
    }, debounceMs)
  }, [proposalId, revision, document, debounceMs, mutate])

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    triggerSave()

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [document, triggerSave])

  return {
    saveState,
    saveNow: () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      mutate({ id: proposalId, revision, document })
    },
    isSaving: isPending,
  }
}

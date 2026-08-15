import type React from "react"
import { useCallback, useEffect, useRef, useState } from "react"
import { useConfirm } from "@/components/confirm-dialog-provider"

export interface UseChatComposerOptions {
  autoFocus?: boolean
  isLoading?: boolean
  onSend: (text: string) => void
  onStop?: () => void
}

/**
 * Owns the composer text/editing behavior: input value, Enter-to-send,
 * refocus lifecycle, and the stop-with-confirmation flow.
 */
export function useChatComposer({
  autoFocus = true,
  isLoading = false,
  onSend,
  onStop,
}: UseChatComposerOptions) {
  const [inputValue, setInputValue] = useState("")
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const prevLoadingRef = useRef(isLoading)
  const confirm = useConfirm()

  // Focus handling on mount / visibility
  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus()
    }
  }, [autoFocus])

  // Refocus when agent finishes responding
  useEffect(() => {
    if (prevLoadingRef.current && !isLoading) {
      inputRef.current?.focus()
    }
    prevLoadingRef.current = isLoading
  }, [isLoading])

  const submit = useCallback(() => {
    if (!inputValue.trim() || isLoading) return
    const text = inputValue.trim()
    setInputValue("")
    onSend(text)
    requestAnimationFrame(() => {
      inputRef.current?.focus()
    })
  }, [inputValue, isLoading, onSend])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        submit()
      }
    },
    [submit]
  )

  const stop = useCallback(async () => {
    if (!onStop) return
    const confirmed = await confirm({
      title: "Stop generation?",
      description:
        "Are you sure you want to stop the agent from generating a response?",
      confirmLabel: "Stop",
      cancelLabel: "Cancel",
      variant: "destructive",
    })
    if (confirmed) {
      onStop()
    }
  }, [confirm, onStop])

  const sendPrompt = useCallback(
    (prompt: string) => {
      onSend(prompt)
      requestAnimationFrame(() => {
        inputRef.current?.focus()
      })
    },
    [onSend]
  )

  return {
    inputValue,
    setInputValue,
    inputRef,
    submit,
    handleKeyDown,
    stop,
    sendPrompt,
  }
}

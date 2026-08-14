import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { IconCircleCheck, IconSparkle4 } from "nucleo-glass"
import type React from "react"
import { useEffect, useMemo, useState } from "react"
import { useCommandChatContext } from "../context/command-chat-context"

function IconCheck({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function IconHelp({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

export interface QuestionOptionItem {
  label: string
  value: string
  description?: string
}

export interface QuestionItem {
  id: string
  question: string
  type: "single_choice" | "multi_select" | "text" | "number"
  options?: QuestionOptionItem[]
  placeholder?: string
  defaultValue?: string | string[] | number
  required?: boolean
}

export interface QuestionnaireArgs {
  title?: string
  subtitle?: string
  questions?: QuestionItem[]
  submitButtonText?: string
}

export interface QuestionnaireCardProps {
  toolCallId: string
  args: QuestionnaireArgs
  onSubmitted?: (formattedSummary: string) => void
}

function normalizeQuestionItem(
  q: QuestionItem | Record<string, unknown>,
  idx: number
): QuestionItem {
  const id = String(
    q.id ||
      (q as Record<string, unknown>).name ||
      (q as Record<string, unknown>).key ||
      `question_${idx + 1}`
  )
  const question = String(
    q.question ||
      (q as Record<string, unknown>).title ||
      (q as Record<string, unknown>).prompt ||
      (q as Record<string, unknown>).label ||
      (q as Record<string, unknown>).text ||
      `Question ${idx + 1}`
  )
  const rawType = String(q.type || "single_choice").toLowerCase()
  let type: QuestionItem["type"] = "single_choice"
  if (rawType.includes("multi") || rawType.includes("check")) {
    type = "multi_select"
  } else if (
    rawType.includes("text") ||
    rawType.includes("string") ||
    rawType.includes("input")
  ) {
    type = "text"
  } else if (
    rawType.includes("num") ||
    rawType.includes("int") ||
    rawType.includes("count") ||
    rawType.includes("amount")
  ) {
    type = "number"
  } else {
    type = "single_choice"
  }

  const rawOptions = Array.isArray(q.options)
    ? q.options
    : Array.isArray((q as Record<string, unknown>).choices)
      ? ((q as Record<string, unknown>).choices as unknown[])
      : Array.isArray((q as Record<string, unknown>).items)
        ? ((q as Record<string, unknown>).items as unknown[])
        : Array.isArray((q as Record<string, unknown>).values)
          ? ((q as Record<string, unknown>).values as unknown[])
          : []

  const options: QuestionOptionItem[] = rawOptions.map(
    (opt: unknown, optIdx: number) => {
      if (typeof opt === "string") {
        return { label: opt, value: opt }
      }
      if (typeof opt === "number") {
        return { label: String(opt), value: String(opt) }
      }
      if (opt && typeof opt === "object") {
        const o = opt as Record<string, unknown>
        const label = String(
          o.label ??
            o.title ??
            o.text ??
            o.name ??
            o.value ??
            `Option ${optIdx + 1}`
        )
        const value = String(
          o.value ?? o.key ?? o.id ?? o.label ?? `opt_${optIdx + 1}`
        )
        const description = o.description ? String(o.description) : undefined
        return { label, value, description }
      }
      return { label: `Option ${optIdx + 1}`, value: `opt_${optIdx + 1}` }
    }
  )

  const defaultValue =
    typeof q.defaultValue === "string" ||
    typeof q.defaultValue === "number" ||
    Array.isArray(q.defaultValue)
      ? q.defaultValue
      : undefined

  return {
    id,
    question,
    type,
    options: options.length > 0 ? options : undefined,
    placeholder: q.placeholder ? String(q.placeholder) : undefined,
    defaultValue,
    required: q.required !== false,
  }
}

export const QuestionnaireCard: React.FC<QuestionnaireCardProps> = ({
  toolCallId: _toolCallId,
  args,
  onSubmitted,
}) => {
  const { sendPrompt, isLoading } = useCommandChatContext()
  const title = args.title || "Clarifying Questions"
  const subtitle =
    args.subtitle ||
    "Please provide the details below so I can assist accurately."

  const rawQuestions = Array.isArray(args.questions) ? args.questions : []
  const questions = useMemo(() => {
    return rawQuestions.map((q, idx) => normalizeQuestionItem(q, idx))
  }, [rawQuestions])

  const submitButtonText = args.submitButtonText || "Submit Answers"

  const [answers, setAnswers] = useState<
    Record<string, string | string[] | number>
  >(() => {
    const initial: Record<string, string | string[] | number> = {}
    for (const q of questions) {
      if (q.defaultValue !== undefined) {
        initial[q.id] = q.defaultValue
      } else if (q.type === "multi_select") {
        initial[q.id] = []
      } else {
        initial[q.id] = ""
      }
    }
    return initial
  })

  useEffect(() => {
    if (questions.length > 0) {
      setAnswers((prev) => {
        let changed = false
        const next = { ...prev }
        for (const q of questions) {
          if (next[q.id] === undefined) {
            changed = true
            if (q.defaultValue !== undefined) {
              next[q.id] = q.defaultValue
            } else if (q.type === "multi_select") {
              next[q.id] = []
            } else {
              next[q.id] = ""
            }
          }
        }
        return changed ? next : prev
      })
    }
  }, [questions])

  const [customInputs, setCustomInputs] = useState<Record<string, string>>({})
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [submittedSummary, setSubmittedSummary] = useState<
    Array<{ question: string; answer: string }>
  >([])

  const handleSingleSelect = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
  }

  const handleMultiSelectToggle = (questionId: string, value: string) => {
    setAnswers((prev) => {
      const current = Array.isArray(prev[questionId])
        ? (prev[questionId] as string[])
        : []
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value]
      return { ...prev, [questionId]: next }
    })
  }

  const handleTextChange = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
  }

  const handleCustomInputChange = (questionId: string, value: string) => {
    setCustomInputs((prev) => ({ ...prev, [questionId]: value }))
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
  }

  // Check whether all required questions have valid answers
  const isFormValid = useMemo(() => {
    if (questions.length === 0) return false
    for (const q of questions) {
      if (q.required === false) continue
      const ans = answers[q.id]
      if (ans === undefined || ans === "") return false
      if (Array.isArray(ans) && ans.length === 0) return false
    }
    return true
  }, [questions, answers])

  const handleSubmit = async () => {
    if (!isFormValid || isSubmitted || isLoading) return

    const summaryEntries: Array<{ question: string; answer: string }> = []
    const lines: string[] = [`**Clarifying Answers for "${title}"**:`]

    for (const q of questions) {
      const val = answers[q.id]
      let answerText = ""

      if (Array.isArray(val)) {
        const labels = val.map((v) => {
          const opt = q.options?.find((o) => o.value === v)
          return opt ? opt.label : v
        })
        answerText = labels.join(", ") || "None selected"
      } else if (val !== undefined && val !== "") {
        const opt = q.options?.find((o) => o.value === String(val))
        answerText = opt ? opt.label : String(val)
      } else {
        answerText = "Not specified"
      }

      summaryEntries.push({ question: q.question, answer: answerText })
      lines.push(`- **${q.question}**: ${answerText}`)
    }

    const formattedMessage = lines.join("\n")
    setSubmittedSummary(summaryEntries)
    setIsSubmitted(true)

    if (onSubmitted) {
      onSubmitted(formattedMessage)
    } else {
      await sendPrompt(formattedMessage)
    }
  }

  if (questions.length === 0) {
    return null
  }

  if (isSubmitted) {
    return (
      <div className="my-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 shadow-xs">
        <div className="flex items-center justify-between border-emerald-500/20 border-b pb-2.5">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 rounded bg-emerald-500/20 px-2 py-0.5 font-bold text-[10px] text-emerald-600 uppercase dark:text-emerald-400">
              <IconCircleCheck className="size-3" />
              <span>Answers Submitted</span>
            </span>
            <span className="font-semibold text-foreground text-xs">
              {title}
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground">
            Response recorded
          </span>
        </div>

        <div className="mt-3 space-y-2">
          {submittedSummary.map((item, idx) => (
            <div
              key={idx}
              className="flex flex-col gap-0.5 rounded-lg border border-border/50 bg-background/60 p-2 text-xs"
            >
              <span className="font-medium text-[11px] text-muted-foreground">
                {item.question}
              </span>
              <span className="font-semibold text-foreground">
                {item.answer}
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="my-3 space-y-4 rounded-xl border border-primary/20 bg-card/60 p-4 shadow-xs backdrop-blur-xs">
      {/* Questionnaire Header */}
      <div className="flex items-center justify-between border-border/60 border-b pb-3">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 rounded bg-primary/15 px-2 py-0.5 font-bold text-[10px] text-primary uppercase">
            <IconHelp className="size-3" />
            <span>Clarification Needed</span>
          </span>
          <h3 className="font-semibold text-foreground text-sm">{title}</h3>
        </div>
        <span className="font-medium text-[11px] text-muted-foreground">
          {questions.length} Question{questions.length === 1 ? "" : "s"}
        </span>
      </div>

      {subtitle && (
        <p className="text-muted-foreground text-xs leading-relaxed">
          {subtitle}
        </p>
      )}

      {/* Questions Form */}
      <div className="space-y-4">
        {questions.map((q, idx) => {
          const currentAnswer = answers[q.id]
          const isMulti = q.type === "multi_select"
          const isSingle = q.type === "single_choice"
          const isText = q.type === "text" || q.type === "number"

          return (
            <div
              key={q.id || idx}
              className="space-y-2 rounded-lg border border-border/60 bg-background/50 p-3"
            >
              <div className="flex items-baseline justify-between gap-2">
                <label className="font-medium text-foreground text-xs">
                  <span className="mr-1 text-muted-foreground font-mono">
                    {idx + 1}.
                  </span>
                  {q.question}
                  {q.required !== false && (
                    <span className="ml-0.5 text-primary">*</span>
                  )}
                </label>
                {isMulti && (
                  <span className="text-[10px] text-muted-foreground">
                    (Select all that apply)
                  </span>
                )}
              </div>

              {/* Single Choice Options */}
              {isSingle && q.options && q.options.length > 0 && (
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {q.options.map((opt) => {
                    const isSelected = currentAnswer === opt.value
                    return (
                      <button
                        type="button"
                        key={opt.value}
                        onClick={() => handleSingleSelect(q.id, opt.value)}
                        className={`flex flex-col items-start rounded-lg border p-2.5 text-left text-xs transition-all ${
                          isSelected
                            ? "border-primary bg-primary/10 text-primary shadow-2xs font-medium"
                            : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-muted/40"
                        }`}
                      >
                        <div className="flex w-full items-center justify-between gap-1.5">
                          <span>{opt.label}</span>
                          {isSelected && (
                            <IconCheck className="size-3.5 shrink-0 text-primary" />
                          )}
                        </div>
                        {opt.description && (
                          <span className="mt-0.5 text-[10px] text-muted-foreground leading-tight">
                            {opt.description}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Multi-Select Options */}
              {isMulti && q.options && q.options.length > 0 && (
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {q.options.map((opt) => {
                    const selectedArray = Array.isArray(currentAnswer)
                      ? (currentAnswer as string[])
                      : []
                    const isSelected = selectedArray.includes(opt.value)
                    return (
                      <button
                        type="button"
                        key={opt.value}
                        onClick={() => handleMultiSelectToggle(q.id, opt.value)}
                        className={`flex flex-col items-start rounded-lg border p-2.5 text-left text-xs transition-all ${
                          isSelected
                            ? "border-primary bg-primary/10 text-primary shadow-2xs font-medium"
                            : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-muted/40"
                        }`}
                      >
                        <div className="flex w-full items-center justify-between gap-1.5">
                          <span>{opt.label}</span>
                          <span
                            className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border ${
                              isSelected
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-muted-foreground/40 bg-background"
                            }`}
                          >
                            {isSelected && <IconCheck className="size-2.5" />}
                          </span>
                        </div>
                        {opt.description && (
                          <span className="mt-0.5 text-[10px] text-muted-foreground leading-tight">
                            {opt.description}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Text / Number Input */}
              {isText && (
                <div>
                  <Input
                    type={q.type === "number" ? "number" : "text"}
                    placeholder={q.placeholder || "Enter your answer..."}
                    value={
                      typeof currentAnswer === "string" ||
                      typeof currentAnswer === "number"
                        ? String(currentAnswer)
                        : ""
                    }
                    onChange={(e) => handleTextChange(q.id, e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
              )}

              {/* Optional Custom Input for Options */}
              {(isSingle || isMulti) && (
                <div className="pt-1">
                  <Input
                    type="text"
                    placeholder="Or type a custom answer..."
                    value={customInputs[q.id] || ""}
                    onChange={(e) =>
                      handleCustomInputChange(q.id, e.target.value)
                    }
                    className="h-7 text-[11px] text-muted-foreground"
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer Submit Button */}
      <div className="flex items-center justify-between border-border/60 border-t pt-3">
        <span className="text-[11px] text-muted-foreground">
          {isFormValid
            ? "Ready to proceed"
            : "Please fill all required questions (*)"}
        </span>
        <Button
          type="button"
          size="sm"
          onClick={handleSubmit}
          disabled={!isFormValid || isLoading}
          className="flex h-8 items-center gap-1.5 px-4 text-xs font-medium"
        >
          <IconSparkle4 className="size-3.5" />
          <span>{submitButtonText}</span>
        </Button>
      </div>
    </div>
  )
}

import {
  CheckCircleIcon,
  CheckIcon,
  QuestionMarkCircleIcon,
  SparklesIcon,
} from "@heroicons/react/20/solid"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import type React from "react"
import { useMemo, useState } from "react"
import { useCommandChatContext } from "../context/command-chat-context"

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

export function normalizeQuestionItem(
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
      (q as Record<string, unknown>).label ||
      (q as Record<string, unknown>).title ||
      (q as Record<string, unknown>).prompt ||
      (q as Record<string, unknown>).text ||
      (q as Record<string, unknown>).header ||
      `Question ${idx + 1}`
  )

  const rawOptionsCandidate =
    q.options ??
    (q as Record<string, unknown>).choices ??
    (q as Record<string, unknown>).items ??
    (q as Record<string, unknown>).values
  const rawOptions = Array.isArray(rawOptionsCandidate)
    ? rawOptionsCandidate
    : []
  const options: QuestionOptionItem[] = rawOptions.map((opt: any, oIdx) => {
    if (typeof opt === "string") {
      return { label: opt, value: opt }
    }
    if (opt && typeof opt === "object") {
      const label = String(
        opt.label ||
          opt.title ||
          opt.name ||
          opt.text ||
          opt.value ||
          `Option ${oIdx + 1}`
      )
      const value = String(opt.value ?? opt.id ?? opt.key ?? label)
      const description =
        typeof opt.description === "string" ? opt.description : undefined
      return { label, value, description }
    }
    return { label: `Option ${oIdx + 1}`, value: `option_${oIdx + 1}` }
  })

  let type: QuestionItem["type"] = "single_choice"
  const rawType = String(q.type || "").toLowerCase()
  if (rawType.includes("multi") || rawType.includes("check")) {
    type = "multi_select"
  } else if (
    rawType.includes("text") ||
    rawType.includes("area") ||
    rawType.includes("str") ||
    rawType.includes("input")
  ) {
    type = "text"
  } else if (
    rawType.includes("num") ||
    rawType.includes("int") ||
    rawType.includes("amount") ||
    rawType.includes("count") ||
    rawType.includes("price")
  ) {
    type = "number"
  } else if (
    rawType.includes("single") ||
    rawType.includes("choice") ||
    rawType.includes("radio") ||
    rawType.includes("select") ||
    rawType.includes("option")
  ) {
    type = "single_choice"
  } else if (options.length > 0) {
    type = "single_choice"
  } else {
    type = "text"
  }

  return {
    id,
    question,
    type,
    options: options.length > 0 ? options : undefined,
    placeholder:
      typeof q.placeholder === "string"
        ? q.placeholder
        : typeof (q as Record<string, unknown>).hint === "string"
          ? ((q as Record<string, unknown>).hint as string)
          : undefined,
    defaultValue: q.defaultValue as any,
    required: q.required !== false,
  }
}

export const QuestionnaireCard: React.FC<QuestionnaireCardProps> = ({
  args,
  onSubmitted,
}) => {
  const { sendPrompt, isLoading } = useCommandChatContext()

  const parsedArgs = useMemo(() => {
    if (!args || typeof args !== "object") {
      return {
        title: "Clarifying Questions",
        subtitle: undefined as string | undefined,
        questions: [],
        submitButtonText: "Submit Answers",
      }
    }

    const inner = ((args as Record<string, unknown>).parameters ||
      (args as Record<string, unknown>).input ||
      (args as Record<string, unknown>).args ||
      (args as Record<string, unknown>).data ||
      args) as Record<string, unknown>

    const title =
      typeof inner.title === "string"
        ? inner.title
        : typeof inner.heading === "string"
          ? inner.heading
          : typeof inner.topic === "string"
            ? inner.topic
            : "Clarifying Questions"

    const subtitle =
      typeof inner.subtitle === "string" ? inner.subtitle : undefined

    let rawQuestionsCandidate =
      inner.questions ?? inner.items ?? inner.inquiries ?? inner.fields

    if (typeof rawQuestionsCandidate === "string") {
      try {
        rawQuestionsCandidate = JSON.parse(rawQuestionsCandidate)
      } catch {
        // keep as is
      }
    }

    const questions = Array.isArray(rawQuestionsCandidate)
      ? rawQuestionsCandidate
      : []

    const submitButtonText =
      typeof inner.submitButtonText === "string"
        ? inner.submitButtonText
        : "Submit Answers"

    return {
      title,
      subtitle,
      questions,
      submitButtonText,
    }
  }, [args])

  const {
    title,
    subtitle,
    questions: rawQuestions,
    submitButtonText,
  } = parsedArgs
  const questions = useMemo(() => {
    return rawQuestions.map((q, idx) => normalizeQuestionItem(q, idx))
  }, [rawQuestions])

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

  if (isSubmitted) {
    return (
      <div className="my-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 shadow-xs">
        <div className="flex items-center justify-between border-emerald-500/20 border-b pb-2.5">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 rounded bg-emerald-500/20 px-2 py-0.5 font-bold text-[10px] text-emerald-600 uppercase dark:text-emerald-400">
              <CheckCircleIcon className="size-3" />
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
              key={item.question || `summary_${idx}`}
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
      <div className="flex items-center justify-between border-border/60 border-b pb-3">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 rounded bg-primary/15 px-2 py-0.5 font-bold text-[10px] text-primary uppercase">
            <QuestionMarkCircleIcon className="size-3" />
            <span>Clarification Needed</span>
          </span>
          <h3 className="font-semibold text-foreground text-sm">{title}</h3>
        </div>
        <span className="font-medium text-[11px] text-muted-foreground">
          {questions.length} Question{questions.length === 1 ? "" : "s"}
        </span>
      </div>

      {subtitle ? (
        <p className="text-muted-foreground text-xs leading-relaxed">
          {subtitle}
        </p>
      ) : null}

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
                  {q.required !== false ? (
                    <span className="ml-0.5 text-primary">*</span>
                  ) : null}
                </label>
                {isMulti ? (
                  <span className="text-[10px] text-muted-foreground">
                    (Select all that apply)
                  </span>
                ) : null}
              </div>

              {isSingle && q.options && q.options.length > 0 ? (
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
                          {isSelected ? (
                            <CheckIcon className="size-3.5 shrink-0 text-primary" />
                          ) : null}
                        </div>
                        {opt.description ? (
                          <span className="mt-0.5 text-[10px] text-muted-foreground leading-tight">
                            {opt.description}
                          </span>
                        ) : null}
                      </button>
                    )
                  })}
                </div>
              ) : null}

              {isMulti && q.options && q.options.length > 0 ? (
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
                            {isSelected ? (
                              <CheckIcon className="size-2.5" />
                            ) : null}
                          </span>
                        </div>
                        {opt.description ? (
                          <span className="mt-0.5 text-[10px] text-muted-foreground leading-tight">
                            {opt.description}
                          </span>
                        ) : null}
                      </button>
                    )
                  })}
                </div>
              ) : null}

              {isText ? (
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
              ) : null}

              {isSingle || isMulti ? (
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
              ) : null}
            </div>
          )
        })}
      </div>

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
          <SparklesIcon className="size-3.5" />
          <span>{submitButtonText}</span>
        </Button>
      </div>
    </div>
  )
}

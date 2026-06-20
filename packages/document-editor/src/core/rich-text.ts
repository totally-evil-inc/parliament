import type { JSONContent } from "@tiptap/core"

export function plainTextToRichText(value: string): JSONContent {
  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: value ? [{ type: "text", text: value }] : [],
      },
    ],
  }
}

export function isRichTextContent(value: unknown): value is JSONContent {
  return typeof value === "object" && value !== null && "type" in value
}

export function richTextToPlainText(
  value: JSONContent | null | undefined
): string {
  if (!value) return ""

  if (typeof value.text === "string") return value.text

  return (value.content ?? [])
    .map((child) => richTextToPlainText(child))
    .filter(Boolean)
    .join("\n")
}

export function getRichTextContent(
  content: unknown,
  fallbackText: string
): JSONContent {
  return isRichTextContent(content)
    ? content
    : plainTextToRichText(fallbackText)
}

import type { JSONContent } from "@tiptap/core"
import type { RichTextDoc } from "@workspace/document/schema"

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

export const emptyRichTextDoc: RichTextDoc = { type: "doc", content: [] }

export function stringToInlineRichTextDoc(value: string): RichTextDoc {
  return {
    type: "doc",
    content: value ? [{ type: "text", text: value }] : [],
  }
}

export function stringToBlockRichTextDoc(value: string): RichTextDoc {
  return {
    type: "doc",
    content: value
      ? [{ type: "paragraph", content: [{ type: "text", text: value }] }]
      : [],
  }
}

export function toRichTextDoc(value: unknown): RichTextDoc {
  if (typeof value === "string") return stringToInlineRichTextDoc(value)
  if (
    value &&
    typeof value === "object" &&
    (value as { type?: unknown }).type === "doc" &&
    Array.isArray((value as { content?: unknown }).content)
  ) {
    return value as RichTextDoc
  }
  return emptyRichTextDoc
}

export function richTextDocToEditorContent(
  content: RichTextDoc,
  inline: boolean
): JSONContent {
  if (!inline) {
    return {
      type: "doc",
      content: normalizeBlockContent(content.content),
    }
  }
  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: content.content as Array<JSONContent>,
      },
    ],
  }
}

function normalizeBlockContent(
  content: RichTextDoc["content"]
): Array<JSONContent> {
  if (content.length === 0) return []
  const hasTopLevelInline = content.some((node) => isInlineLikeNode(node))
  if (!hasTopLevelInline) return content as Array<JSONContent>
  return [{ type: "paragraph", content: content as Array<JSONContent> }]
}

function isInlineLikeNode(node: RichTextDoc["content"][number]) {
  return (
    node.type === "text" ||
    node.type === "hardBreak" ||
    node.type === "inlineMath"
  )
}

export function editorContentToRichTextDoc(
  editorContent: JSONContent,
  inline: boolean
): RichTextDoc {
  if (!inline) return editorContent as RichTextDoc
  const paragraph = editorContent.content?.find(
    (node) => node.type === "paragraph"
  )
  return {
    type: "doc",
    content: (paragraph?.content ?? []) as RichTextDoc["content"],
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

/**
 * Hoisted regular expressions to avoid per-call compilation overhead.
 */
const CRLF_REGEX = /\r\n|\r/g
const INTERNAL_DRAFT_URL_REGEX =
  /http:\/\/localhost:\d+\/proposals\/[a-f0-9-]+/gi
const PARAGRAPH_SPLIT_REGEX = /\n{2,}/
const LIST_ITEM_PREFIX_REGEX = /^\s*[-*•]\s+/
const AMPERSAND_REGEX = /&/g
const LESS_THAN_REGEX = /</g
const GREATER_THAN_REGEX = />/g
const DOUBLE_QUOTE_REGEX = /"/g
const SINGLE_QUOTE_REGEX = /'/g
const BOLD_STAR_REGEX = /\*\*(.*?)\*\*/g
const BOLD_UNDERSCORE_REGEX = /__(.*?)__/g
const ITALIC_STAR_REGEX = /(?<!\*)\*(?!\*)(.*?)(?<!\*)\*(?!\*)/g
const ITALIC_UNDERSCORE_REGEX = /(?<!_)_(?!_)(.*?)(?<!_)_(?!_)/g
const MARKDOWN_LINK_REGEX = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g

/**
 * Escapes HTML characters defensively to prevent XSS.
 */
function escapeHtml(text: string): string {
  return text
    .replace(AMPERSAND_REGEX, "&amp;")
    .replace(LESS_THAN_REGEX, "&lt;")
    .replace(GREATER_THAN_REGEX, "&gt;")
    .replace(DOUBLE_QUOTE_REGEX, "&quot;")
    .replace(SINGLE_QUOTE_REGEX, "&#039;")
}

/**
 * Formats inline markdown tokens (bold, italics, links) into email-safe HTML tags.
 * Rejects non-HTTP/HTTPS links defensively.
 */
export function formatInlineMarkdown(text: string): string {
  if (typeof text !== "string" || !text) return ""

  // Escape HTML entities first
  let formatted = escapeHtml(text)

  // Bold **text** or __text__
  formatted = formatted
    .replace(BOLD_STAR_REGEX, "<strong>$1</strong>")
    .replace(BOLD_UNDERSCORE_REGEX, "<strong>$1</strong>")

  // Italic *text* or _text_
  formatted = formatted
    .replace(ITALIC_STAR_REGEX, "<em>$1</em>")
    .replace(ITALIC_UNDERSCORE_REGEX, "<em>$1</em>")

  // Safe HTTP/HTTPS Links [label](url)
  formatted = formatted.replace(
    MARKDOWN_LINK_REGEX,
    (_match, label: string, url: string) => {
      // Validate safe HTTP/HTTPS URL
      try {
        const parsed = new URL(url)
        if (parsed.protocol === "http:" || parsed.protocol === "https:") {
          return `<a href="${url}" style="color: #0f172a; text-decoration: underline;">${label}</a>`
        }
      } catch {
        // Fallback to plain label on invalid URL
      }
      return label
    }
  )

  return formatted
}

/**
 * Format markdown / multi-line text into clean, safe HTML suitable for email bodies.
 * Converts bold (**text**), italics (*text*), links ([text](url)), lists (- item),
 * and paragraph breaks (\n\n) into responsive email HTML.
 *
 * Implements defensive checks against malformed input, missing types, and internal draft URLs.
 */
export function formatMarkdownToEmailHtml(text: unknown): string {
  if (typeof text !== "string" || !text.trim()) {
    return ""
  }

  // 1. Normalize line endings and strip raw internal app links if pasted by LLM
  const cleaned = text
    .replace(CRLF_REGEX, "\n")
    .replace(INTERNAL_DRAFT_URL_REGEX, "")
    .trim()

  if (!cleaned) return ""

  // 2. Split into blocks by double newlines
  const blocks = cleaned.split(PARAGRAPH_SPLIT_REGEX)

  const formattedBlocks = blocks.map((block) => {
    const trimmedBlock = block.trim()
    if (!trimmedBlock) return ""

    const lines = trimmedBlock.split("\n")
    const segments: string[] = []
    let currentList: string[] = []
    let currentParagraph: string[] = []

    const flushParagraph = () => {
      if (currentParagraph.length > 0) {
        const formatted = currentParagraph
          .map((l) => formatInlineMarkdown(l))
          .join("<br />")
        segments.push(
          `<p style="margin: 0 0 10px 0; line-height: 1.6; color: #334155;">${formatted}</p>`
        )
        currentParagraph = []
      }
    }

    const flushList = () => {
      if (currentList.length > 0) {
        const items = currentList
          .map(
            (item) =>
              `<li style="margin-bottom: 4px; line-height: 1.5; color: #334155;">${formatInlineMarkdown(item)}</li>`
          )
          .join("")
        segments.push(
          `<ul style="margin: 8px 0; padding-left: 20px;">${items}</ul>`
        )
        currentList = []
      }
    }

    for (const line of lines) {
      const isListItem = LIST_ITEM_PREFIX_REGEX.test(line)
      if (isListItem) {
        flushParagraph()
        currentList.push(line.replace(LIST_ITEM_PREFIX_REGEX, ""))
      } else {
        flushList()
        currentParagraph.push(line)
      }
    }

    flushParagraph()
    flushList()

    return segments.join("")
  })

  return formattedBlocks.filter(Boolean).join("")
}

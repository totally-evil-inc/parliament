/**
 * Format markdown / multi-line text into clean, safe HTML suitable for email bodies.
 * Converts bold (**text**), italics (*text*), links ([text](url)), lists (- item),
 * and paragraph breaks (\n\n) into responsive email HTML.
 */
export function formatMarkdownToEmailHtml(text: string): string {
  if (!text || typeof text !== "string") return ""

  // 1. Normalize line endings and strip raw internal app links if pasted by LLM
  const cleaned = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/http:\/\/localhost:\d+\/proposals\/[a-f0-9-]+/gi, "")
    .trim()

  // 2. Split into blocks by double newlines
  const blocks = cleaned.split(/\n{2,}/)

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
      const isListItem = /^\s*[-*•]\s+/.test(line)
      if (isListItem) {
        flushParagraph()
        currentList.push(line.replace(/^\s*[-*•]\s+/, ""))
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

function formatInlineMarkdown(text: string): string {
  return text
    // Escape HTML special characters
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    // Bold **text** or __text__
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/__(.*?)__/g, "<strong>$1</strong>")
    // Italic *text* or _text_
    .replace(/(?<!\*)\*(?!\*)(.*?)(?<!\*)\*(?!\*)/g, "<em>$1</em>")
    .replace(/(?<!_)_(?!_)(.*?)(?<!_)_(?!_)/g, "<em>$1</em>")
    // Links [label](url)
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      '<a href="$2" style="color: #0f172a; text-decoration: underline;">$1</a>'
    )
}

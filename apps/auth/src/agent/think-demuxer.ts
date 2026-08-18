export interface DemuxDelta {
  type: "content:delta" | "thinking:delta"
  text: string
}

interface TagPair {
  open: string
  close: string
}

const SUPPORTED_TAGS: TagPair[] = [
  { open: "<think>", close: "</think>" },
  { open: "<thinking>", close: "</thinking>" },
  { open: "<thought>", close: "</thought>" },
]

const MAX_TAG_LENGTH = 12 // Longest is </thinking> (11 chars)

/**
 * Stateful streaming demultiplexer that extracts <think>...</think>, <thinking>...</thinking>,
 * or <thought>...</thought> blocks from model text-delta streams and produces typed deltas.
 *
 * Handles tags split across arbitrary chunk boundaries without leaking tag markup or
 * falsely matching prose containing words like "think" or "thinking".
 */
export class ThinkTagDemuxer {
  private buffer = ""
  private inThinking = false
  private activeCloseTag: string | null = null

  /**
   * Processes an incoming text chunk and returns content / thinking deltas.
   */
  process(chunk: string): DemuxDelta[] {
    if (!chunk) return []

    this.buffer += chunk
    const deltas: DemuxDelta[] = []

    while (this.buffer.length > 0) {
      if (!this.inThinking) {
        // Look for any supported opening tag
        let earliestOpenIdx = -1
        let matchedPair: TagPair | null = null

        for (const pair of SUPPORTED_TAGS) {
          const idx = this.buffer.indexOf(pair.open)
          if (idx !== -1 && (earliestOpenIdx === -1 || idx < earliestOpenIdx)) {
            earliestOpenIdx = idx
            matchedPair = pair
          }
        }

        if (earliestOpenIdx !== -1 && matchedPair) {
          // Emit any content preceding the opening tag
          if (earliestOpenIdx > 0) {
            const before = this.buffer.slice(0, earliestOpenIdx)
            deltas.push({ type: "content:delta", text: before })
          }

          this.inThinking = true
          this.activeCloseTag = matchedPair.close
          this.buffer = this.buffer.slice(
            earliestOpenIdx + matchedPair.open.length
          )
        } else {
          // Check if the end of the buffer might be a partial prefix of an opening tag
          const potentialPrefixLen = this.getPotentialOpenTagPrefixLength(
            this.buffer
          )
          if (potentialPrefixLen > 0) {
            const emitLen = this.buffer.length - potentialPrefixLen
            if (emitLen > 0) {
              const textToEmit = this.buffer.slice(0, emitLen)
              this.buffer = this.buffer.slice(emitLen)
              deltas.push({ type: "content:delta", text: textToEmit })
            }
            // Retain the potential partial tag in buffer for the next chunk
            break
          }

          // No open tag and no partial prefix: emit entire buffer as content
          const text = this.buffer
          this.buffer = ""
          deltas.push({ type: "content:delta", text })
        }
      } else {
        // Inside a thinking block: look for the closing tag
        const closeTag = this.activeCloseTag || "</think>"
        const closeIdx = this.buffer.indexOf(closeTag)

        if (closeIdx !== -1) {
          if (closeIdx > 0) {
            const thinkPart = this.buffer.slice(0, closeIdx)
            deltas.push({ type: "thinking:delta", text: thinkPart })
          }

          this.inThinking = false
          this.activeCloseTag = null
          this.buffer = this.buffer.slice(closeIdx + closeTag.length)
        } else {
          // Check if the end of buffer might be a partial prefix of the close tag
          const potentialPrefixLen = this.getPotentialPrefixLength(
            this.buffer,
            closeTag
          )
          if (potentialPrefixLen > 0) {
            const emitLen = this.buffer.length - potentialPrefixLen
            if (emitLen > 0) {
              const textToEmit = this.buffer.slice(0, emitLen)
              this.buffer = this.buffer.slice(emitLen)
              deltas.push({ type: "thinking:delta", text: textToEmit })
            }
            // Retain potential partial closing tag in buffer for the next chunk
            break
          }

          // No close tag and no partial prefix: emit entire buffer as thinking
          const text = this.buffer
          this.buffer = ""
          deltas.push({ type: "thinking:delta", text })
        }
      }
    }

    return deltas
  }

  /**
   * Flushes any remaining buffered text at stream end.
   */
  flush(): DemuxDelta[] {
    const deltas: DemuxDelta[] = []
    if (this.buffer.length > 0) {
      if (this.inThinking) {
        deltas.push({ type: "thinking:delta", text: this.buffer })
      } else {
        deltas.push({ type: "content:delta", text: this.buffer })
      }
      this.buffer = ""
    }
    return deltas
  }

  /**
   * Helper to clean static strings (e.g. for post-processing or regeneration).
   */
  static extractThinkBlocks(text: string): {
    content: string
    thinking: string
  } {
    let cleanText = text
    const thinkingParts: string[] = []

    for (const { open, close } of SUPPORTED_TAGS) {
      const regex = new RegExp(
        `${open.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([\\s\\S]*?)${close.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
        "g"
      )
      cleanText = cleanText.replace(regex, (_, thinkContent) => {
        if (thinkContent.trim()) {
          thinkingParts.push(thinkContent.trim())
        }
        return ""
      })

      // Handle unclosed trailing tag
      const openRegex = new RegExp(
        `${open.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([\\s\\S]*)$`
      )
      cleanText = cleanText.replace(openRegex, (_, thinkContent) => {
        if (thinkContent.trim()) {
          thinkingParts.push(thinkContent.trim())
        }
        return ""
      })
    }

    return {
      content: cleanText.trim(),
      thinking: thinkingParts.join("\n\n").trim(),
    }
  }

  private getPotentialOpenTagPrefixLength(str: string): number {
    for (let len = Math.min(str.length, MAX_TAG_LENGTH); len > 0; len--) {
      const suffix = str.slice(-len)
      for (const pair of SUPPORTED_TAGS) {
        if (pair.open.startsWith(suffix)) {
          return len
        }
      }
    }
    return 0
  }

  private getPotentialPrefixLength(str: string, target: string): number {
    for (let len = Math.min(str.length, target.length - 1); len > 0; len--) {
      const suffix = str.slice(-len)
      if (target.startsWith(suffix)) {
        return len
      }
    }
    return 0
  }
}

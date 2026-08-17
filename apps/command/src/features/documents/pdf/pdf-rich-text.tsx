import { Link, StyleSheet, Text, View } from "@react-pdf/renderer"
import type { RichTextNode } from "@workspace/document/schema"
import { stripHtml } from "@workspace/document/text"
import type React from "react"
import type { ResolvedPdfTheme } from "./pdf-styles"

export type PdfStyle = Parameters<typeof StyleSheet.create>[0][string]

export type PdfRichTextProps = {
  content?: RichTextNode | string | null
  theme: ResolvedPdfTheme
  style?: PdfStyle | PdfStyle[]
  inline?: boolean
  defaultColor?: string
  defaultFontSize?: number
  defaultLineHeight?: number
}

export function extractTextFromRichNode(
  node?: RichTextNode | string | null
): string {
  if (!node) return ""
  if (typeof node === "string") return stripHtml(node)
  const own = node.text ?? ""
  const children = (node.content ?? [])
    .map(extractTextFromRichNode)
    .filter(Boolean)
  return [own, ...children].join(" ").trim()
}

export function PdfRichText({
  content,
  theme,
  style,
  inline = false,
  defaultColor,
  defaultFontSize = 9.5,
  defaultLineHeight = 1.4,
}: PdfRichTextProps) {
  if (!content) return null

  const richNode: RichTextNode =
    typeof content === "string"
      ? {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: content }],
            },
          ],
        }
      : content

  const styles = createRichTextStyles(theme, {
    defaultColor: defaultColor || theme.foreground,
    defaultFontSize,
    defaultLineHeight,
  })

  if (inline) {
    return (
      <Text style={[styles.inlineRoot, style]}>
        {renderInlineNodes(richNode, styles, theme)}
      </Text>
    )
  }

  return (
    <View style={[styles.blockRoot, style]}>
      {renderBlockNodes(richNode, styles, theme)}
    </View>
  )
}

function renderBlockNodes(
  node: RichTextNode,
  styles: ReturnType<typeof createRichTextStyles>,
  theme: ResolvedPdfTheme,
  keyPrefix = "n"
): React.ReactNode {
  if (!node) return null

  if (node.type === "doc") {
    return (node.content ?? []).map((child, index) =>
      renderBlockNodes(child, styles, theme, `${keyPrefix}-${index}`)
    )
  }

  if (node.type === "paragraph") {
    return (
      <Text key={keyPrefix} style={styles.paragraph}>
        {renderInlineNodes(node, styles, theme, keyPrefix)}
      </Text>
    )
  }

  if (node.type === "heading") {
    const level =
      node.attrs?.level === 1 || node.attrs?.level === 2 ? node.attrs.level : 3
    const headingStyle =
      level === 1 ? styles.h1 : level === 2 ? styles.h2 : styles.h3
    return (
      <Text key={keyPrefix} style={headingStyle}>
        {renderInlineNodes(node, styles, theme, keyPrefix)}
      </Text>
    )
  }

  if (node.type === "bulletList") {
    return (
      <View key={keyPrefix} style={styles.list}>
        {(node.content ?? []).map((item, idx) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: read-only text nodes do not have IDs
          <View key={`${keyPrefix}-li-${idx}`} style={styles.listItemRow}>
            <Text style={styles.bulletDot}>•</Text>
            <View style={styles.listItemContent}>
              {renderBlockNodes(item, styles, theme, `${keyPrefix}-lic-${idx}`)}
            </View>
          </View>
        ))}
      </View>
    )
  }

  if (node.type === "orderedList") {
    const start = typeof node.attrs?.start === "number" ? node.attrs.start : 1
    return (
      <View key={keyPrefix} style={styles.list}>
        {(node.content ?? []).map((item, idx) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: read-only text nodes do not have IDs
          <View key={`${keyPrefix}-oli-${idx}`} style={styles.listItemRow}>
            <Text style={styles.orderedNumber}>{start + idx}.</Text>
            <View style={styles.listItemContent}>
              {renderBlockNodes(
                item,
                styles,
                theme,
                `${keyPrefix}-olic-${idx}`
              )}
            </View>
          </View>
        ))}
      </View>
    )
  }

  if (node.type === "listItem") {
    if (
      node.content &&
      node.content.length === 1 &&
      node.content[0].type === "paragraph"
    ) {
      return (
        <Text style={styles.listItemParagraph}>
          {renderInlineNodes(node.content[0], styles, theme, keyPrefix)}
        </Text>
      )
    }
    return (
      <View style={styles.listItemBlock}>
        {(node.content ?? []).map((child, idx) =>
          renderBlockNodes(child, styles, theme, `${keyPrefix}-${idx}`)
        )}
      </View>
    )
  }

  if (node.type === "blockquote") {
    return (
      <View key={keyPrefix} style={styles.blockquote}>
        {(node.content ?? []).map((child, idx) =>
          renderBlockNodes(child, styles, theme, `${keyPrefix}-bq-${idx}`)
        )}
      </View>
    )
  }

  if (node.type === "horizontalRule") {
    return <View key={keyPrefix} style={styles.horizontalRule} />
  }

  if (node.type === "table") {
    return (
      <View key={keyPrefix} style={styles.table}>
        {(node.content ?? []).map((row, rIdx) =>
          renderBlockNodes(row, styles, theme, `${keyPrefix}-r-${rIdx}`)
        )}
      </View>
    )
  }

  if (node.type === "tableRow") {
    return (
      <View key={keyPrefix} style={styles.tableRow}>
        {(node.content ?? []).map((cell, cIdx) =>
          renderBlockNodes(cell, styles, theme, `${keyPrefix}-c-${cIdx}`)
        )}
      </View>
    )
  }

  if (node.type === "tableHeader") {
    return (
      <View key={keyPrefix} style={[styles.tableCell, styles.tableHeader]}>
        {(node.content ?? []).map((child, idx) =>
          renderBlockNodes(child, styles, theme, `${keyPrefix}-th-${idx}`)
        )}
      </View>
    )
  }

  if (node.type === "tableCell") {
    return (
      <View key={keyPrefix} style={styles.tableCell}>
        {(node.content ?? []).map((child, idx) =>
          renderBlockNodes(child, styles, theme, `${keyPrefix}-td-${idx}`)
        )}
      </View>
    )
  }

  if (node.type === "blockMath") {
    const latex =
      typeof node.attrs?.latex === "string" ? node.attrs.latex : node.text || ""
    return (
      <View key={keyPrefix} style={styles.blockMath}>
        <Text style={styles.mathText}>{latex}</Text>
      </View>
    )
  }

  // Handle custom blocks nested structure if present
  if (
    node.type === "keyNumbersItem" ||
    node.type === "teamMemberItem" ||
    node.type === "testimonialItem"
  ) {
    return (
      <View key={keyPrefix} style={styles.nestedContainer}>
        {(node.content ?? []).map((child, idx) =>
          renderBlockNodes(child, styles, theme, `${keyPrefix}-custom-${idx}`)
        )}
      </View>
    )
  }

  if (node.type === "keyNumbersValue") {
    return (
      <Text key={keyPrefix} style={styles.metricValue}>
        {renderInlineNodes(node, styles, theme, keyPrefix)}
      </Text>
    )
  }
  if (node.type === "keyNumbersLabel") {
    return (
      <Text key={keyPrefix} style={styles.metricLabel}>
        {renderInlineNodes(node, styles, theme, keyPrefix)}
      </Text>
    )
  }
  if (node.type === "keyNumbersDetail") {
    return (
      <Text key={keyPrefix} style={styles.metricDetail}>
        {renderInlineNodes(node, styles, theme, keyPrefix)}
      </Text>
    )
  }

  // Fallback for any text or leaf node
  return (
    <Text key={keyPrefix} style={styles.paragraph}>
      {renderInlineNodes(node, styles, theme, keyPrefix)}
    </Text>
  )
}

function renderInlineNodes(
  node: RichTextNode,
  styles: ReturnType<typeof createRichTextStyles>,
  theme: ResolvedPdfTheme,
  keyPrefix = "in"
): React.ReactNode {
  if (!node) return null

  if (node.type === "text") {
    const text = node.text ?? ""
    return applyMarks(text, node.marks, styles, theme, keyPrefix)
  }

  if (node.type === "hardBreak") {
    return "\n"
  }

  if (node.type === "inlineMath") {
    const latex =
      typeof node.attrs?.latex === "string" ? node.attrs.latex : node.text || ""
    return (
      <Text key={keyPrefix} style={styles.inlineMathText}>
        {latex}
      </Text>
    )
  }

  if (node.content && node.content.length > 0) {
    return node.content.map((child, idx) =>
      renderInlineNodes(child, styles, theme, `${keyPrefix}-${idx}`)
    )
  }

  if (node.text) {
    return applyMarks(node.text, node.marks, styles, theme, keyPrefix)
  }

  return null
}

function applyMarks(
  text: string,
  marks: RichTextNode["marks"] | undefined,
  styles: ReturnType<typeof createRichTextStyles>,
  _theme: ResolvedPdfTheme,
  keyPrefix: string
): React.ReactNode {
  if (!marks || marks.length === 0) {
    return text
  }

  const textStyle: PdfStyle[] = []
  let linkHref: string | null = null

  for (const mark of marks) {
    if (mark.type === "bold") textStyle.push(styles.bold)
    if (mark.type === "italic") textStyle.push(styles.italic)
    if (mark.type === "strike") textStyle.push(styles.strike)
    if (mark.type === "code") textStyle.push(styles.code)
    if (mark.type === "link") {
      linkHref = typeof mark.attrs?.href === "string" ? mark.attrs.href : "#"
      textStyle.push(styles.link)
    }
  }

  if (linkHref) {
    return (
      <Link key={keyPrefix} src={linkHref} style={textStyle}>
        {text}
      </Link>
    )
  }

  return (
    <Text key={keyPrefix} style={textStyle}>
      {text}
    </Text>
  )
}

function createRichTextStyles(
  theme: ResolvedPdfTheme,
  opts: {
    defaultColor: string
    defaultFontSize: number
    defaultLineHeight: number
  }
) {
  return StyleSheet.create({
    blockRoot: {
      flexDirection: "column",
      width: "100%",
    },
    inlineRoot: {
      fontFamily: theme.bodyFont,
      fontSize: opts.defaultFontSize,
      color: opts.defaultColor,
      lineHeight: opts.defaultLineHeight,
    },
    paragraph: {
      fontFamily: theme.bodyFont,
      fontSize: opts.defaultFontSize,
      color: opts.defaultColor,
      lineHeight: opts.defaultLineHeight,
      marginBottom: 5,
    },
    h1: {
      fontFamily: theme.headingFont,
      fontSize: 18,
      fontWeight: "bold",
      color: theme.foreground,
      lineHeight: 1.25,
      marginTop: 8,
      marginBottom: 4,
    },
    h2: {
      fontFamily: theme.headingFont,
      fontSize: 14,
      fontWeight: "bold",
      color: theme.foreground,
      lineHeight: 1.3,
      marginTop: 6,
      marginBottom: 3,
    },
    h3: {
      fontFamily: theme.headingFont,
      fontSize: 11,
      fontWeight: "bold",
      color: theme.foreground,
      lineHeight: 1.35,
      marginTop: 4,
      marginBottom: 2,
    },
    list: {
      marginTop: 3,
      marginBottom: 5,
      paddingLeft: 4,
    },
    listItemRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: 2,
    },
    bulletDot: {
      width: 10,
      fontFamily: theme.bodyFont,
      fontSize: opts.defaultFontSize,
      color: theme.mutedForeground,
      lineHeight: opts.defaultLineHeight,
    },
    orderedNumber: {
      width: 16,
      fontFamily: theme.bodyFont,
      fontSize: opts.defaultFontSize,
      color: theme.mutedForeground,
      lineHeight: opts.defaultLineHeight,
    },
    listItemContent: {
      flex: 1,
    },
    listItemParagraph: {
      fontFamily: theme.bodyFont,
      fontSize: opts.defaultFontSize,
      color: opts.defaultColor,
      lineHeight: opts.defaultLineHeight,
      marginBottom: 0,
    },
    listItemBlock: {
      flexDirection: "column",
    },
    blockquote: {
      borderLeftWidth: 2,
      borderLeftColor: theme.accent,
      paddingLeft: 8,
      paddingVertical: 2,
      marginVertical: 4,
      backgroundColor: theme.accentTintSubtle,
    },
    horizontalRule: {
      borderBottomWidth: 0.5,
      borderBottomColor: theme.border,
      marginVertical: 6,
      width: "100%",
    },
    table: {
      borderWidth: 0.5,
      borderColor: theme.border,
      marginVertical: 6,
      borderRadius: theme.radius,
    },
    tableRow: {
      flexDirection: "row",
      borderBottomWidth: 0.5,
      borderBottomColor: theme.border,
    },
    tableCell: {
      flex: 1,
      padding: 4,
      borderRightWidth: 0.5,
      borderRightColor: theme.border,
    },
    tableHeader: {
      backgroundColor: theme.accentTintSubtle,
      fontWeight: "bold",
    },
    blockMath: {
      backgroundColor: theme.accentTintSubtle,
      padding: 6,
      marginVertical: 4,
      borderRadius: theme.radius,
      alignItems: "center",
    },
    mathText: {
      fontFamily: "Courier",
      fontSize: 9,
      color: theme.accent,
    },
    inlineMathText: {
      fontFamily: "Courier",
      fontSize: 8.5,
      color: theme.accent,
    },
    bold: {
      fontWeight: "bold",
      fontFamily: theme.headingFont,
    },
    italic: {
      fontStyle: "italic",
    },
    strike: {
      textDecoration: "line-through",
    },
    code: {
      fontFamily: "Courier",
      fontSize: opts.defaultFontSize * 0.9,
      backgroundColor: theme.accentTintSubtle,
      color: theme.accent,
    },
    link: {
      color: theme.accent,
      textDecoration: "underline",
    },
    nestedContainer: {
      flexDirection: "column",
    },
    metricValue: {
      fontFamily: theme.headingFont,
      fontSize: 22,
      fontWeight: "bold",
      color: theme.accent,
      marginBottom: 2,
      textAlign: "center",
    },
    metricLabel: {
      fontFamily: theme.headingFont,
      fontSize: 10,
      fontWeight: "bold",
      color: theme.foreground,
      marginBottom: 2,
      textAlign: "center",
    },
    metricDetail: {
      fontFamily: theme.bodyFont,
      fontSize: 8,
      color: theme.mutedForeground,
      textAlign: "center",
      lineHeight: 1.3,
    },
  })
}

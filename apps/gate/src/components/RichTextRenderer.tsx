import type { RichTextDoc, RichTextNode } from "@workspace/document/schema"
import React from "react"

export type RichTextRendererProps = {
  doc?: RichTextDoc | RichTextNode | string | null
  className?: string
}

function renderMarks(
  text: string,
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>
): React.ReactNode {
  if (!marks || marks.length === 0) return text

  return marks.reduce<React.ReactNode>((acc, mark, idx) => {
    const key = `${mark.type}-${idx}`
    switch (mark.type) {
      case "bold":
      case "strong":
        return <strong key={key}>{acc}</strong>
      case "italic":
      case "em":
        return <em key={key}>{acc}</em>
      case "underline":
        return <u key={key}>{acc}</u>
      case "strike":
      case "strikethrough":
        return <del key={key}>{acc}</del>
      case "code":
        return (
          <code
            key={key}
            className="rounded bg-[color-mix(in_oklab,var(--document-accent)_8%,transparent)] px-1.5 py-0.5 font-mono text-[var(--document-foreground)] text-xs"
          >
            {acc}
          </code>
        )
      case "link": {
        const rawHref = (mark.attrs?.href as string) || "#"
        const isSafe = /^(https?:|mailto:|\/)/i.test(rawHref)
        const href = isSafe ? rawHref : "#"
        return (
          <a
            key={key}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--document-accent)] underline transition-opacity hover:opacity-80"
          >
            {acc}
          </a>
        )
      }
      default:
        return acc
    }
  }, text)
}

// Stable, path-based React keys derived from node position.
export function renderRichTextNode(
  node: RichTextNode,
  keyPath: string
): React.ReactNode {
  const nodeKey = `node-${keyPath}`
  if (node.type === "text") {
    return (
      <React.Fragment key={nodeKey}>
        {renderMarks(node.text ?? "", node.marks)}
      </React.Fragment>
    )
  }

  const children = (node.content ?? []).map((child, i) =>
    renderRichTextNode(child, `${keyPath}.${i}`)
  )

  switch (node.type) {
    case "doc":
      return (
        <div key={nodeKey} className="space-y-3">
          {children}
        </div>
      )
    case "paragraph":
      return (
        <p
          key={nodeKey}
          className="text-[var(--document-foreground)] leading-relaxed"
        >
          {children.length > 0 ? children : <br />}
        </p>
      )
    case "heading": {
      const level = Number(node.attrs?.level ?? 2)
      if (level === 1) {
        return (
          <h1
            key={nodeKey}
            className="mt-6 mb-3 font-bold text-2xl text-[var(--document-foreground)] tracking-tight [font-family:var(--document-heading-font-family)] sm:text-3xl"
          >
            {children}
          </h1>
        )
      }
      if (level === 2) {
        return (
          <h2
            key={nodeKey}
            className="mt-5 mb-2 font-bold text-[var(--document-foreground)] text-xl tracking-tight [font-family:var(--document-heading-font-family)] sm:text-2xl"
          >
            {children}
          </h2>
        )
      }
      if (level === 3) {
        return (
          <h3
            key={nodeKey}
            className="mt-4 mb-2 font-semibold text-[var(--document-foreground)] text-lg tracking-tight [font-family:var(--document-heading-font-family)]"
          >
            {children}
          </h3>
        )
      }
      return (
        <h4
          key={nodeKey}
          className="mt-3 mb-1 font-semibold text-[var(--document-foreground)] text-base [font-family:var(--document-heading-font-family)]"
        >
          {children}
        </h4>
      )
    }
    case "bulletList":
      return (
        <ul
          key={nodeKey}
          className="my-2 list-inside list-disc space-y-1 text-[var(--document-foreground)]"
        >
          {children}
        </ul>
      )
    case "orderedList":
      return (
        <ol
          key={nodeKey}
          className="my-2 list-inside list-decimal space-y-1 text-[var(--document-foreground)]"
        >
          {children}
        </ol>
      )
    case "listItem":
      return (
        <li key={nodeKey} className="leading-relaxed">
          {children}
        </li>
      )
    case "blockquote":
      return (
        <blockquote
          key={nodeKey}
          className="my-3 border-[var(--document-accent)] border-l-2 py-1 pl-4 text-[var(--document-muted-foreground)] italic"
        >
          {children}
        </blockquote>
      )
    case "codeBlock":
      return (
        <pre
          key={nodeKey}
          className="my-3 overflow-x-auto rounded-[var(--document-radius)] bg-[color-mix(in_oklab,var(--document-accent)_8%,transparent)] p-4 font-mono text-[var(--document-foreground)] text-xs"
        >
          <code>{children}</code>
        </pre>
      )
    case "table":
      return (
        <div key={nodeKey} className="my-4 overflow-x-auto">
          <table className="w-full border-collapse border border-[var(--document-border)] text-left text-sm">
            {children}
          </table>
        </div>
      )
    case "tableRow":
      return (
        <tr key={nodeKey} className="border-[var(--document-border)] border-b">
          {children}
        </tr>
      )
    case "tableHeader":
      return (
        <th
          key={nodeKey}
          className="border border-[var(--document-border)] bg-[color-mix(in_oklab,var(--document-accent)_6%,transparent)] p-2.5 font-semibold text-[var(--document-foreground)]"
        >
          {children}
        </th>
      )
    case "tableCell":
      return (
        <td
          key={nodeKey}
          className="border border-[var(--document-border)] p-2.5 text-[var(--document-foreground)]"
        >
          {children}
        </td>
      )
    case "horizontalRule":
    case "hr":
      return (
        <hr key={nodeKey} className="my-6 border-[var(--document-border)]" />
      )
    case "hardBreak":
      return <br key={nodeKey} />
    default:
      return (
        <div key={nodeKey} className="my-1 text-[var(--document-foreground)]">
          {children}
        </div>
      )
  }
}

export function RichTextRenderer({ doc, className }: RichTextRendererProps) {
  if (!doc) return null

  if (typeof doc === "string") {
    return (
      <p
        className={`text-[var(--document-foreground)] leading-relaxed ${className ?? ""}`}
      >
        {doc}
      </p>
    )
  }

  return (
    <div className={`rich-text-content ${className ?? ""}`}>
      {renderRichTextNode(doc as RichTextNode, "")}
    </div>
  )
}

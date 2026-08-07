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
            className="rounded bg-muted/60 px-1 py-0.5 font-mono text-xs"
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
            className="text-primary underline transition-opacity hover:opacity-80"
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

export function renderRichTextNode(
  node: RichTextNode,
  index: number
): React.ReactNode {
  if (node.type === "text") {
    return (
      <React.Fragment key={index}>
        {renderMarks(node.text ?? "", node.marks)}
      </React.Fragment>
    )
  }

  const children = (node.content ?? []).map((child, i) =>
    renderRichTextNode(child, i)
  )

  switch (node.type) {
    case "doc":
      return (
        <div key={index} className="space-y-3">
          {children}
        </div>
      )
    case "paragraph":
      return (
        <p key={index} className="leading-relaxed">
          {children.length > 0 ? children : <br />}
        </p>
      )
    case "heading": {
      const level = Number(node.attrs?.level ?? 2)
      if (level === 1) {
        return (
          <h1
            key={index}
            className="mt-4 mb-2 font-bold text-2xl tracking-tight"
          >
            {children}
          </h1>
        )
      }
      if (level === 2) {
        return (
          <h2
            key={index}
            className="mt-3 mb-2 font-semibold text-xl tracking-tight"
          >
            {children}
          </h2>
        )
      }
      if (level === 3) {
        return (
          <h3
            key={index}
            className="mt-2 mb-1 font-medium text-lg tracking-tight"
          >
            {children}
          </h3>
        )
      }
      return (
        <h4 key={index} className="mt-2 mb-1 font-medium text-base">
          {children}
        </h4>
      )
    }
    case "bulletList":
      return (
        <ul key={index} className="my-2 list-inside list-disc space-y-1">
          {children}
        </ul>
      )
    case "orderedList":
      return (
        <ol key={index} className="my-2 list-inside list-decimal space-y-1">
          {children}
        </ol>
      )
    case "listItem":
      return (
        <li key={index} className="leading-relaxed">
          {children}
        </li>
      )
    case "blockquote":
      return (
        <blockquote
          key={index}
          className="my-2 border-primary/40 border-l-3 py-1 pl-3 text-muted-foreground italic"
        >
          {children}
        </blockquote>
      )
    case "codeBlock":
      return (
        <pre
          key={index}
          className="my-2 overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs"
        >
          <code>{children}</code>
        </pre>
      )
    case "horizontalRule":
    case "hr":
      return <hr key={index} className="my-4 border-border" />
    case "hardBreak":
      return <br key={index} />
    default:
      return (
        <div key={index} className="my-1">
          {children}
        </div>
      )
  }
}

export function RichTextRenderer({ doc, className }: RichTextRendererProps) {
  if (!doc) return null

  if (typeof doc === "string") {
    return <p className={`leading-relaxed ${className ?? ""}`}>{doc}</p>
  }

  return (
    <div className={`rich-text-content ${className ?? ""}`}>
      {renderRichTextNode(doc as RichTextNode, 0)}
    </div>
  )
}

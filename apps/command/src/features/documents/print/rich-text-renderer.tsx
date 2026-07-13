import type { RichTextNode } from "@workspace/document/schema"
import katex from "katex"
import type * as React from "react"

type RichTextRendererProps = {
  content?: RichTextNode | string | null
  fallback?: string
  className?: string
}

export function RichTextRenderer({
  className,
  content,
  fallback = "",
}: RichTextRendererProps) {
  const richContent =
    typeof content === "object" && content !== null
      ? content
      : typeof content === "string" && content
        ? ({
            type: "doc",
            content: [{ type: "text", text: content }],
          } satisfies RichTextNode)
        : fallback
          ? ({
              type: "doc",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: fallback }],
                },
              ],
            } satisfies RichTextNode)
          : null

  if (!richContent) return null

  return <div className={className}>{renderNode(richContent)}</div>
}

export function RichTextInlineRenderer({
  content,
  fallback = "",
}: Omit<RichTextRendererProps, "className">) {
  const richContent =
    typeof content === "object" && content !== null
      ? content
      : fallback
        ? ({
            type: "doc",
            content: [{ type: "text", text: fallback }],
          } satisfies RichTextNode)
        : null

  if (!richContent) return null

  return <>{renderNode(richContent)}</>
}

function renderNode(node: RichTextNode): React.ReactNode {
  const children = node.content?.map((child, index) => (
    // biome-ignore lint/suspicious/noArrayIndexKey: read-only text blocks have no stable unique IDs
    <RenderNode key={index} node={child} />
  ))

  if (node.type === "doc") return children
  if (node.type === "text") return renderMarks(node.text ?? "", node.marks)
  if (node.type === "paragraph") return <p>{children}</p>
  if (node.type === "hardBreak") return <br />
  if (node.type === "inlineMath" || node.type === "blockMath") {
    const latex =
      typeof node.attrs?.latex === "string" ? node.attrs.latex : node.text || ""
    const html = katex.renderToString(latex, {
      displayMode: node.type === "blockMath",
      throwOnError: false,
    })

    return (
      <span
        className={
          node.type === "blockMath"
            ? "my-3 block overflow-x-auto py-3"
            : "inline"
        }
        // biome-ignore lint/security/noDangerouslySetInnerHtml: KaTeX output is safe and trusted
        dangerouslySetInnerHTML={{ __html: html }}
      />
    )
  }
  if (node.type === "heading") {
    const level =
      node.attrs?.level === 1 || node.attrs?.level === 2 ? node.attrs.level : 3
    if (level === 1) return <h1>{children}</h1>
    if (level === 2) return <h2>{children}</h2>
    return <h3>{children}</h3>
  }
  if (node.type === "bulletList") return <ul>{children}</ul>
  if (node.type === "orderedList") return <ol>{children}</ol>
  if (node.type === "listItem") return <li>{children}</li>
  if (node.type === "blockquote") return <blockquote>{children}</blockquote>
  if (node.type === "horizontalRule") return <hr />
  if (node.type === "table") return <table>{children}</table>
  if (node.type === "tableRow") return <tr>{children}</tr>
  if (node.type === "tableHeader") return <th>{children}</th>
  if (node.type === "tableCell") return <td>{children}</td>

  // Custom blocks nested nodes
  if (node.type === "keyNumbersItem") {
    return (
      <div className="flex break-inside-avoid flex-col items-center justify-start text-center">
        {children}
      </div>
    )
  }
  if (node.type === "keyNumbersValue") {
    return (
      <div className="mb-1.5 font-black text-4xl text-[var(--document-accent)] tracking-tight md:text-5xl">
        {children}
      </div>
    )
  }
  if (node.type === "keyNumbersLabel") {
    return (
      <div className="mb-1 font-bold text-[var(--document-foreground)] text-base tracking-tight md:text-lg">
        {children}
      </div>
    )
  }
  if (node.type === "keyNumbersDetail") {
    return (
      <div className="text-[var(--document-muted-foreground)] text-sm leading-relaxed md:text-base">
        {children}
      </div>
    )
  }

  if (node.type === "teamMemberItem") {
    return (
      <div className="flex break-inside-avoid flex-col items-center justify-start text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--document-accent)_10%,transparent)] text-[var(--document-accent)] md:h-20 md:w-20">
          <svg
            className="h-8 w-8 md:h-9 md:w-9"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <title>Avatar</title>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
        </div>
        {children}
      </div>
    )
  }
  if (node.type === "teamMemberName") {
    return (
      <div className="mb-1 font-bold text-[var(--document-foreground)] text-base tracking-tight md:text-lg">
        {children}
      </div>
    )
  }
  if (node.type === "teamMemberRole") {
    return (
      <div className="mb-3 font-medium text-[var(--document-muted-foreground)] text-sm md:text-base">
        {children}
      </div>
    )
  }
  if (node.type === "teamMemberBio") {
    return (
      <div className="text-[var(--document-muted-foreground)] text-xs leading-normal md:text-sm">
        {children}
      </div>
    )
  }

  if (node.type === "testimonialItem") {
    return (
      <blockquote className="m-0 break-inside-avoid border-[var(--document-accent)] border-l-2 py-1 pl-5 text-left">
        {children}
      </blockquote>
    )
  }
  if (node.type === "testimonialQuote") {
    return (
      <div className="mb-3 font-medium text-[var(--document-muted-foreground)] text-base italic leading-relaxed md:text-lg">
        {children}
      </div>
    )
  }
  if (node.type === "testimonialAuthor") {
    return (
      <div className="mb-0.5 font-bold text-[var(--document-foreground)] text-sm tracking-tight md:text-base">
        {children}
      </div>
    )
  }
  if (node.type === "testimonialRole") {
    return (
      <div className="font-medium text-[var(--document-muted-foreground)] text-xs md:text-sm">
        {children}
      </div>
    )
  }

  return children
}

function RenderNode({ node }: { node: RichTextNode }) {
  return <>{renderNode(node)}</>
}

function renderMarks(
  text: string,
  marks: RichTextNode["marks"]
): React.ReactNode {
  return (marks ?? []).reduce<React.ReactNode>((node, mark) => {
    if (mark.type === "bold") return <strong>{node}</strong>
    if (mark.type === "italic") return <em>{node}</em>
    if (mark.type === "strike") return <s>{node}</s>
    if (mark.type === "code") return <code>{node}</code>
    if (mark.type === "link") {
      const href = typeof mark.attrs?.href === "string" ? mark.attrs.href : "#"
      // biome-ignore lint/correctness/useJsxKeyInIterable: reduce is chaining wrappers, not rendering list elements
      return <a href={href}>{node}</a>
    }

    return node
  }, text)
}

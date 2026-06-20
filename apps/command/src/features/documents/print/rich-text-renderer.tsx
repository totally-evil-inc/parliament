import katex from "katex"
import type { RichTextNode } from "@workspace/document/schema"
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

function renderNode(node: RichTextNode): React.ReactNode {
  const children = node.content?.map((child, index) => (
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
      return <a href={href}>{node}</a>
    }

    return node
  }, text)
}

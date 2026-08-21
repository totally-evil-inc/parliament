import { ScrollArea } from "@workspace/ui/components/scroll-area"
import type React from "react"
import { memo } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

interface ChatMarkdownProps {
  content: string
  className?: string
}

const remarkPlugins = [remarkGfm]

const MarkdownComponents: React.ComponentProps<
  typeof ReactMarkdown
>["components"] = {
  h1: ({ children }) => (
    <h1 className="mt-3 mb-1.5 font-semibold text-base text-foreground">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mt-2.5 mb-1 font-semibold text-foreground text-sm">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-2 mb-1 font-semibold text-foreground text-sm">
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className="my-1.5 text-foreground text-sm leading-relaxed">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="my-1.5 list-outside list-disc space-y-1 pl-4 text-foreground text-sm leading-relaxed">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="my-1.5 list-outside list-decimal space-y-1 pl-4 text-foreground text-sm leading-relaxed">
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className="text-foreground text-sm leading-relaxed">{children}</li>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  em: ({ children }) => <em className="text-foreground italic">{children}</em>,
  code: ({ className, children, ...props }) => {
    const isInline = !className?.includes("language-")
    if (isInline) {
      return (
        <code
          className="rounded border border-border bg-muted/60 px-1.5 py-0.5 font-mono text-foreground text-xs"
          {...props}
        >
          {children}
        </code>
      )
    }
    return (
      <code className="font-mono text-foreground text-xs" {...props}>
        {children}
      </code>
    )
  },
  pre: ({ children }) => (
    <ScrollArea
      orientation="horizontal"
      className="my-2 w-full rounded-lg border border-border bg-muted/50 font-mono text-xs"
    >
      <pre className="p-3 font-mono text-xs">{children}</pre>
    </ScrollArea>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-primary/50 border-l-2 pl-3 text-muted-foreground text-sm italic">
      {children}
    </blockquote>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary underline underline-offset-4 transition-opacity hover:opacity-80"
    >
      {children}
    </a>
  ),
  table: ({ children }) => (
    <ScrollArea
      orientation="horizontal"
      className="my-2 w-full rounded-lg border border-border"
    >
      <table className="w-full text-left text-xs">{children}</table>
    </ScrollArea>
  ),
  thead: ({ children }) => (
    <thead className="border-border border-b bg-muted/40 text-muted-foreground">
      {children}
    </thead>
  ),
  th: ({ children }) => <th className="px-3 py-2 font-medium">{children}</th>,
  td: ({ children }) => (
    <td className="border-border border-t px-3 py-2">{children}</td>
  ),
}

export const ChatMarkdown: React.FC<ChatMarkdownProps> = memo(
  ({ content, className = "" }) => {
    if (!content) return null

    return (
      <div className={`text-foreground text-sm leading-relaxed ${className}`}>
        <ReactMarkdown
          remarkPlugins={remarkPlugins}
          components={MarkdownComponents}
        >
          {content}
        </ReactMarkdown>
      </div>
    )
  },
  (prevProps, nextProps) =>
    prevProps.content === nextProps.content &&
    prevProps.className === nextProps.className
)

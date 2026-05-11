import type { ReactNode } from "react"

type PageHeaderProps = {
  eyebrow: string
  title: string
  description: string
  action?: ReactNode
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 border-b border-border/60 px-6 py-6 md:flex-row md:items-end md:justify-between md:px-8">
      <div className="min-w-0">
        <div className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground uppercase">
          {eyebrow}
        </div>
        <h1 className="mt-2 font-heading text-2xl leading-tight md:text-3xl">
          {title}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          {description}
        </p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

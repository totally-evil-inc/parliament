import type { ReactNode } from "react"

type SettingsSectionProps = {
  title: string
  hint?: string
  children: ReactNode
}

export function SettingsSection({
  title,
  hint,
  children,
}: SettingsSectionProps) {
  return (
    <section className="grid gap-4 border-b border-border/60 py-8 last:border-b-0 md:grid-cols-[180px_minmax(0,1fr)] md:gap-x-10">
      <div>
        <h2 className="text-sm font-medium">{title}</h2>
        {hint ? (
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {hint}
          </p>
        ) : null}
      </div>
      <div className="flex min-w-0 flex-col gap-5">{children}</div>
    </section>
  )
}

export function MetricPreview({
  value,
  label,
  detail,
}: {
  value: string
  label: string
  detail?: boolean
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center justify-center rounded-xl bg-muted/35 p-2 text-center">
      <span className="text-sm leading-none font-black text-muted-foreground">
        {value}
      </span>
      <span className="mt-1 text-[8px] leading-none font-medium text-muted-foreground/80">
        {label}
      </span>
      {detail ? (
        <span className="mt-1.5 h-1 w-8 rounded-full bg-muted-foreground/20" />
      ) : null}
    </div>
  )
}

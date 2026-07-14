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
      <span className="font-black text-muted-foreground text-sm leading-none">
        {value}
      </span>
      <span className="mt-1 font-medium text-[8px] text-muted-foreground/80 leading-none">
        {label}
      </span>
      {detail ? (
        <span className="mt-1.5 h-1 w-8 rounded-full bg-muted-foreground/20" />
      ) : null}
    </div>
  )
}

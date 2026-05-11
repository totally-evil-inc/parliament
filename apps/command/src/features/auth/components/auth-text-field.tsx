import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"

export function AuthTextField({
  id,
  label,
  type = "text",
  autoComplete,
  value,
  error,
  onBlur,
  onChange,
}: {
  id: string
  label: string
  type?: string
  autoComplete?: string
  value: string
  error?: string
  onBlur: () => void
  onChange: (value: string) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        autoComplete={autoComplete}
        value={value}
        onBlur={onBlur}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error ? (
        <p id={`${id}-error`} className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}

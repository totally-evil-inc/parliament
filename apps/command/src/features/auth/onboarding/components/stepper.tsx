import { ONBOARDING_STEPS } from "../constants"

export function Stepper({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground uppercase tracking-[0.3em]">
      <span>
        Step {String(step + 1).padStart(2, "0")} / {ONBOARDING_STEPS.length}
      </span>
      <div className="ml-2 flex items-center gap-1.5">
        {ONBOARDING_STEPS.map((_, i) => (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: onboarding steps are static
            key={i}
            className={`h-1.5 rounded-full transition-all ${
              i === step
                ? "w-5 bg-foreground"
                : i < step
                  ? "w-1.5 bg-foreground/70"
                  : "w-1.5 bg-foreground/20"
            }`}
          />
        ))}
      </div>
    </div>
  )
}

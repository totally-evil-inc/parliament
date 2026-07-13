import { Cancel01Icon, PlusSignIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Button } from "@workspace/ui/components/button"
import { Separator } from "@workspace/ui/components/separator"
import { cn } from "@workspace/ui/lib/utils"
import { CanvasNumberField } from "../canvas-fields"
import { money, safeNumber } from "./pricing"
import { Signature } from "./signature-billing-notes"

type TotalsAdjustmentsProps = {
  subtotal: number
  discountRate: number
  taxRate: number
  discountEnabled: boolean
  taxEnabled: boolean
  discountAmount: number
  taxAmount: number
  total: number
  signerName: string
  signerTitle: string
  updateAttributes: (attributes: Record<string, unknown>) => void
  currency: string
  locale: string
}

export function TotalsAdjustments({
  subtotal,
  discountRate,
  taxRate,
  discountEnabled,
  taxEnabled,
  discountAmount,
  taxAmount,
  total,
  signerName,
  signerTitle,
  updateAttributes,
  currency,
  locale,
}: TotalsAdjustmentsProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="font-bold text-[10px] text-[var(--document-muted-foreground)] uppercase tracking-widest">
          Subtotal
        </span>
        <span className="font-bold text-[var(--document-foreground)] text-sm tabular-nums">
          {money(subtotal, currency, locale)}
        </span>
      </div>

      {discountEnabled ? (
        <AdjustmentRow
          label="Discount"
          rate={safeNumber(discountRate)}
          amount={-discountAmount}
          currency={currency}
          locale={locale}
          onRateChange={(value) => updateAttributes({ discountRate: value })}
          onRemove={() =>
            updateAttributes({ discountEnabled: false, discountRate: 0 })
          }
        />
      ) : null}

      {taxEnabled ? (
        <AdjustmentRow
          label="Tax"
          rate={safeNumber(taxRate)}
          amount={taxAmount}
          currency={currency}
          locale={locale}
          onRateChange={(value) => updateAttributes({ taxRate: value })}
          onRemove={() => updateAttributes({ taxEnabled: false, taxRate: 0 })}
        />
      ) : null}

      {!discountEnabled || !taxEnabled ? (
        <div className="flex flex-wrap gap-2">
          {!discountEnabled ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => updateAttributes({ discountEnabled: true })}
              className="h-7 gap-1.5 px-2 font-bold text-[10px] text-[var(--document-muted-foreground)] uppercase tracking-wider hover:text-[var(--document-foreground)]"
            >
              <HugeiconsIcon icon={PlusSignIcon} className="h-3 w-3" />
              Discount
            </Button>
          ) : null}
          {!taxEnabled ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => updateAttributes({ taxEnabled: true })}
              className="h-7 gap-1.5 px-2 font-bold text-[10px] text-[var(--document-muted-foreground)] uppercase tracking-wider hover:text-[var(--document-foreground)]"
            >
              <HugeiconsIcon icon={PlusSignIcon} className="h-3 w-3" />
              Tax
            </Button>
          ) : null}
        </div>
      ) : null}

      <Separator />

      <div className="flex items-center justify-between">
        <span className="font-bold text-[10px] text-[var(--document-foreground)] uppercase tracking-widest">
          Total
        </span>
        <span className="font-black text-2xl text-[var(--document-accent)] tabular-nums tracking-tight">
          {money(total, currency, locale)}
        </span>
      </div>

      <div className="pt-8">
        <Signature
          signerName={signerName}
          signerTitle={signerTitle}
          onSignerNameChange={(value) =>
            updateAttributes({ signerName: value })
          }
          onSignerTitleChange={(value) =>
            updateAttributes({ signerTitle: value })
          }
        />
      </div>
    </div>
  )
}

function AdjustmentRow({
  label,
  rate,
  amount,
  onRateChange,
  onRemove,
  currency,
  locale,
}: {
  label: string
  rate: number
  amount: number
  onRateChange: (value: number) => void
  onRemove: () => void
  currency: string
  locale: string
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-1.5 text-[var(--document-muted-foreground)]">
        <span className="font-bold text-[10px] uppercase tracking-widest">
          {label}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={onRemove}
          className="h-5 w-5 text-[var(--document-muted-foreground)] hover:text-destructive"
          aria-label={`Remove ${label.toLowerCase()}`}
        >
          <HugeiconsIcon icon={Cancel01Icon} className="h-3 w-3" />
        </Button>
      </div>
      <div className="ml-auto flex items-center gap-1 text-[var(--document-muted-foreground)]">
        <CanvasNumberField
          aria-label={`${label} percentage`}
          className="w-12 text-right font-bold tabular-nums"
          value={rate}
          onValueChange={onRateChange}
        />
        <span className="font-bold text-[var(--document-muted-foreground)] text-sm">
          %
        </span>
      </div>
      <span
        className={cn(
          "min-w-20 text-right font-bold text-sm tabular-nums",
          amount < 0 ? "text-destructive" : "text-[var(--document-foreground)]"
        )}
      >
        {money(amount, currency, locale)}
      </span>
    </div>
  )
}

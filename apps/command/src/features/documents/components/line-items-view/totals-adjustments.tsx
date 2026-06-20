import { Cancel01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Button } from "@workspace/ui/components/button"
import { Separator } from "@workspace/ui/components/separator"
import { money, safeNumber } from "./pricing"
import { Signature } from "./signature-billing-notes"

import { CanvasNumberField } from "@/features/documents/components/canvas-fields"

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
      <div className="flex justify-between text-sm">
        <span className="text-[var(--document-muted-foreground)]">
          Subtotal
        </span>
        <span className="font-semibold">
          {money(subtotal, currency, locale)}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {!discountEnabled ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => updateAttributes({ discountEnabled: true })}
            className="h-8 rounded-full border-dashed border-[var(--document-border)] text-xs text-[var(--document-muted-foreground)] hover:text-[var(--document-foreground)]"
          >
            + Discount
          </Button>
        ) : null}
        {!taxEnabled ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => updateAttributes({ taxEnabled: true })}
            className="h-8 rounded-full border-dashed border-[var(--document-border)] text-xs text-[var(--document-muted-foreground)] hover:text-[var(--document-foreground)]"
          >
            + Tax
          </Button>
        ) : null}
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

      <Separator />

      <div className="flex items-center justify-between">
        <span className="text-lg font-bold">Total</span>
        <span className="text-3xl font-bold tracking-tight">
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
    <div className="flex items-center justify-between gap-4 text-sm">
      <div className="flex items-center gap-3 text-[var(--document-muted-foreground)]">
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={onRemove}
          className="text-[var(--document-muted-foreground)] hover:text-destructive"
          aria-label={`Remove ${label.toLowerCase()}`}
        >
          <HugeiconsIcon icon={Cancel01Icon} className="h-3.5 w-3.5" />
        </Button>
        <span>{label}</span>
      </div>
      <div className="ml-auto flex items-center gap-2 text-[var(--document-muted-foreground)]">
        <CanvasNumberField
          aria-label={`${label} percentage`}
          className="w-16 text-right"
          value={rate}
          onValueChange={onRateChange}
        />
        <span>%</span>
      </div>
      <span
        className={
          amount < 0
            ? "min-w-20 text-right font-semibold text-destructive"
            : "min-w-20 text-right font-semibold"
        }
      >
        {money(amount, currency, locale)}
      </span>
    </div>
  )
}

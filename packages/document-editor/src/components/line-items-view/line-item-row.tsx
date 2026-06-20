import { Delete02Icon, Image01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Button } from "@workspace/ui/components/button"
import { TableCell, TableRow } from "@workspace/ui/components/table"
import { getLineItemKey, getLineTotal, money, safeNumber } from "./pricing"
import type { PricingItem } from "./pricing"

import { CanvasNumberField, CanvasTextArea } from "../canvas-fields"

type LineItemRowProps = {
  item: PricingItem
  index: number
  updateItem: <TKey extends keyof PricingItem>(
    index: number,
    key: TKey,
    value: PricingItem[TKey]
  ) => void
  removeItem: (index: number) => Promise<void>
  currency: string
  locale: string
}

export function LineItemRow({
  item,
  index,
  updateItem,
  removeItem,
  currency,
  locale,
}: LineItemRowProps) {
  const lineTotal = getLineTotal(item)

  return (
    <TableRow
      key={getLineItemKey(item)}
      className="group border-b border-[var(--document-border)] align-top hover:bg-transparent"
    >
      <TableCell className="px-0 py-5 pr-5 whitespace-normal">
        <div className="flex gap-3">
          {item.showImage ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-lg"
              className="mt-0.5 size-10 shrink-0 rounded-[var(--document-radius)] bg-[color-mix(in_oklab,var(--document-accent)_8%,transparent)] text-[var(--document-muted-foreground)] hover:text-[var(--document-foreground)]"
              aria-label="Line item image placeholder"
            >
              <HugeiconsIcon icon={Image01Icon} className="h-4 w-4" />
            </Button>
          ) : null}
          <div className="min-w-0 flex-1 space-y-2">
            <CanvasTextArea
              aria-label={`Description for line item ${index + 1}`}
              className="font-medium"
              maxRows={2}
              placeholder="Item description..."
              value={item.description}
              onValueChange={(value) => updateItem(index, "description", value)}
            />

            {item.showDetails ? (
              <CanvasTextArea
                aria-label={`Details for ${item.description || `line item ${index + 1}`}`}
                className="text-[var(--document-muted-foreground)]"
                maxRows={4}
                placeholder="Add service details, scope, or billing notes..."
                value={item.details ?? ""}
                onValueChange={(value) => updateItem(index, "details", value)}
              />
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => updateItem(index, "showDetails", true)}
                className="h-auto px-0 py-0 text-sm text-[var(--document-muted-foreground)] hover:bg-transparent hover:text-[var(--document-foreground)]"
              >
                + Add details
              </Button>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell className="px-3 py-5 text-center">
        <CanvasNumberField
          aria-label={`Quantity for ${item.description || "line item"}`}
          className="mx-auto w-16 text-center"
          value={safeNumber(item.quantity)}
          onValueChange={(value) => updateItem(index, "quantity", value)}
        />
      </TableCell>
      <TableCell className="px-3 py-5 text-right">
        <CanvasNumberField
          aria-label={`Rate for ${item.description || "line item"}`}
          className="ml-auto w-28 text-right"
          value={safeNumber(item.rate)}
          onValueChange={(value) => updateItem(index, "rate", value)}
        />
      </TableCell>
      <TableCell className="px-3 py-5 text-right font-semibold tabular-nums">
        {money(lineTotal, currency, locale)}
      </TableCell>
      <TableCell className="py-5 pl-2 text-right">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => void removeItem(index)}
          className="text-[var(--document-muted-foreground)] opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
          aria-label="Remove line item"
        >
          <HugeiconsIcon icon={Delete02Icon} className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  )
}

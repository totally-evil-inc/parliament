import { Delete02Icon, Image01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { TableCell, TableRow } from "@workspace/ui/components/table"
import { Textarea } from "@workspace/ui/components/textarea"
import { getLineItemKey, getLineTotal, money, safeNumber } from "./pricing"
import type { PricingItem } from "./pricing"

type LineItemRowProps = {
  item: PricingItem
  index: number
  updateItem: <TKey extends keyof PricingItem>(
    index: number,
    key: TKey,
    value: PricingItem[TKey]
  ) => void
  removeItem: (index: number) => Promise<void>
}

export function LineItemRow({
  item,
  index,
  updateItem,
  removeItem,
}: LineItemRowProps) {
  const lineTotal = getLineTotal(item)

  return (
    <TableRow
      key={getLineItemKey(item)}
      className="group align-top hover:bg-[color-mix(in_oklab,var(--document-accent)_4%,transparent)]"
    >
      <TableCell className="px-4 py-5 whitespace-normal">
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
            <Input
              className="rounded-none border-x-0 border-t-0 border-b border-transparent bg-transparent px-0 font-medium text-[var(--document-foreground)] shadow-none hover:border-[var(--document-border)] focus-visible:border-[var(--document-border)] focus-visible:ring-0"
              placeholder="Item description..."
              value={item.description}
              onChange={(event) =>
                updateItem(index, "description", event.target.value)
              }
            />

            {item.showDetails ? (
              <Textarea
                rows={2}
                className="min-h-12 rounded-none border-x-0 border-t-0 border-b border-transparent bg-transparent px-0 py-0 text-sm text-[var(--document-muted-foreground)] shadow-none hover:border-[var(--document-border)] focus-visible:border-[var(--document-border)] focus-visible:ring-0"
                placeholder="Add service details, scope, or billing notes..."
                value={item.details ?? ""}
                onChange={(event) =>
                  updateItem(index, "details", event.target.value)
                }
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
      <TableCell className="px-4 py-5 text-center">
        <Input
          className="mx-auto w-16 rounded-none border-x-0 border-t-0 border-b border-transparent text-center text-[var(--document-foreground)] shadow-none hover:border-[var(--document-border)] focus-visible:border-[var(--document-border)] focus-visible:ring-0"
          type="number"
          min={0}
          step={1}
          inputMode="numeric"
          value={safeNumber(item.quantity)}
          onChange={(event) =>
            updateItem(index, "quantity", safeNumber(event.target.value))
          }
        />
      </TableCell>
      <TableCell className="px-4 py-5 text-right">
        <Input
          className="ml-auto w-28 rounded-none border-x-0 border-t-0 border-b border-transparent text-right text-[var(--document-foreground)] shadow-none hover:border-[var(--document-border)] focus-visible:border-[var(--document-border)] focus-visible:ring-0"
          type="number"
          min={0}
          step="0.01"
          inputMode="decimal"
          value={safeNumber(item.rate)}
          onChange={(event) =>
            updateItem(index, "rate", safeNumber(event.target.value))
          }
        />
      </TableCell>
      <TableCell className="px-4 py-5 text-right font-bold">
        {money(lineTotal)}
      </TableCell>
      <TableCell className="px-2 py-5 text-right">
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

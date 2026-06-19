import { PlusSignIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Button } from "@workspace/ui/components/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { LineItemRow } from "./line-item-row"
import { getLineItemKey } from "./pricing"
import type { PricingItem } from "./pricing"

type LineItemsTableProps = {
  lineItems: Array<PricingItem>
  updateItem: <TKey extends keyof PricingItem>(
    index: number,
    key: TKey,
    value: PricingItem[TKey]
  ) => void
  removeItem: (index: number) => Promise<void>
  addItem: () => void
  addCatalogItem: () => void
}

export function LineItemsTable({
  lineItems,
  updateItem,
  removeItem,
  addItem,
  addCatalogItem,
}: LineItemsTableProps) {
  return (
    <>
      <Table className="min-w-180 text-left">
        <TableHeader>
          <TableRow className="bg-[color-mix(in_oklab,var(--document-accent)_5%,transparent)] text-[10px] font-bold tracking-widest text-[var(--document-muted-foreground)] uppercase hover:bg-[color-mix(in_oklab,var(--document-accent)_5%,transparent)]">
            <TableHead className="rounded-l-md px-4 py-3 text-[var(--document-muted-foreground)]">
              Description
            </TableHead>
            <TableHead className="px-4 py-3 text-center text-[var(--document-muted-foreground)]">
              Qty
            </TableHead>
            <TableHead className="px-4 py-3 text-right text-[var(--document-muted-foreground)]">
              Price
            </TableHead>
            <TableHead className="px-4 py-3 text-right text-[var(--document-muted-foreground)]">
              Amount
            </TableHead>
            <TableHead className="w-10 rounded-r-md px-2 py-3" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {lineItems.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={5}
                className="px-4 py-8 text-center text-sm text-[var(--document-muted-foreground)]"
              >
                No line items yet. Add a service to start building the total.
              </TableCell>
            </TableRow>
          ) : null}

          {lineItems.map((item, index) => (
            <LineItemRow
              key={getLineItemKey(item)}
              item={item}
              index={index}
              updateItem={updateItem}
              removeItem={removeItem}
            />
          ))}
        </TableBody>
      </Table>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addItem}
          className="h-8 gap-1.5 rounded-full border-dashed border-[var(--document-border)] text-xs text-[var(--document-muted-foreground)] hover:text-[var(--document-foreground)]"
        >
          <HugeiconsIcon icon={PlusSignIcon} className="h-3.5 w-3.5" />
          Add Line Item
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addCatalogItem}
          className="h-8 gap-1.5 rounded-full border-dashed border-[var(--document-border)] text-xs text-[var(--document-muted-foreground)] hover:text-[var(--document-foreground)]"
        >
          <HugeiconsIcon icon={PlusSignIcon} className="h-3.5 w-3.5" />
          From Catalog
        </Button>
      </div>
    </>
  )
}

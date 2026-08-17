import { PlusIcon } from "@heroicons/react/24/outline"
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
import type { PricingItem } from "./pricing"
import { getLineItemKey } from "./pricing"

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
  currency: string
  locale: string
}

export function LineItemsTable({
  lineItems,
  updateItem,
  removeItem,
  addItem,
  addCatalogItem,
  currency,
  locale,
}: LineItemsTableProps) {
  return (
    <>
      <Table
        containerClassName="document-scrollbar pb-2"
        className="min-w-180 border-collapse text-left"
      >
        <TableHeader>
          <TableRow className="border-[var(--document-border)] border-b bg-transparent font-bold text-[10px] text-[var(--document-muted-foreground)] uppercase tracking-widest hover:bg-transparent">
            <TableHead className="h-auto px-0 py-3 pr-5 text-[var(--document-muted-foreground)]">
              Description
            </TableHead>
            <TableHead className="h-auto px-3 py-3 text-center text-[var(--document-muted-foreground)]">
              Qty
            </TableHead>
            <TableHead className="h-auto px-3 py-3 text-right text-[var(--document-muted-foreground)]">
              Price
            </TableHead>
            <TableHead className="h-auto px-3 py-3 text-right text-[var(--document-muted-foreground)]">
              Amount
            </TableHead>
            <TableHead className="h-auto w-10 py-3 pl-2" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {lineItems.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={5}
                className="px-0 py-10 text-center text-[var(--document-muted-foreground)] text-sm"
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
              currency={currency}
              locale={locale}
            />
          ))}
        </TableBody>
      </Table>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={addItem}
          className="h-7 gap-1.5 px-2 font-bold text-[10px] text-[var(--document-muted-foreground)] uppercase tracking-wider hover:text-[var(--document-foreground)]"
        >
          <PlusIcon className="h-3 w-3" />
          Add Line Item
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={addCatalogItem}
          className="h-7 gap-1.5 px-2 font-bold text-[10px] text-[var(--document-muted-foreground)] uppercase tracking-wider hover:text-[var(--document-foreground)]"
        >
          <PlusIcon className="h-3 w-3" />
          From Catalog
        </Button>
      </div>
    </>
  )
}

import { NodeViewWrapper } from "@tiptap/react"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Separator } from "@workspace/ui/components/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { Textarea } from "@workspace/ui/components/textarea"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Cancel01Icon,
  Delete02Icon,
  Image01Icon,
  PlusSignIcon,
} from "@hugeicons/core-free-icons"
import type { NodeViewProps } from "@tiptap/react"
import { authClient } from "@/lib/auth-client"

type PricingItem = {
  description: string
  details?: string
  quantity: number
  rate: number
  total?: number
  showDetails?: boolean
  showImage?: boolean
}

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
})

function money(value: number) {
  return currencyFormatter.format(Number.isFinite(value) ? value : 0)
}

function safeNumber(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
}

function getLineTotal(item: PricingItem) {
  return safeNumber(item.quantity) * safeNumber(item.rate)
}

export function PricingTableView({ node, updateAttributes }: NodeViewProps) {
  const {
    items = [],
    discountRate = 0,
    taxRate = 0,
    discountEnabled = false,
    taxEnabled = false,
  } = node.attrs
  const session = authClient.useSession()
  const signedInUserName = session.data?.user.name ?? ""

  const lineItems: Array<PricingItem> = Array.isArray(items) ? items : []

  const updateItem = <TKey extends keyof PricingItem>(
    index: number,
    key: TKey,
    value: PricingItem[TKey]
  ) => {
    const nextItems = lineItems.map((item, itemIndex) => {
      if (itemIndex !== index) return item

      const nextItem = { ...item, [key]: value }
      return { ...nextItem, total: getLineTotal(nextItem) }
    })

    updateAttributes({ items: nextItems })
  }

  const addItem = () => {
    updateAttributes({
      items: [
        ...lineItems,
        {
          description: `Item ${lineItems.length + 1}`,
          details: "",
          quantity: 1,
          rate: 0,
          total: 0,
          showDetails: false,
          showImage: false,
        },
      ],
    })
  }

  const addCatalogItem = () => {
    updateAttributes({
      items: [
        ...lineItems,
        {
          description: "Catalog service",
          details:
            "Describe the selected service scope, assumptions, and deliverables.",
          quantity: 1,
          rate: 0,
          total: 0,
          showDetails: true,
          showImage: true,
        },
      ],
    })
  }

  const removeItem = (index: number) => {
    updateAttributes({
      items: lineItems.filter((_, itemIndex) => itemIndex !== index),
    })
  }

  const subtotal = lineItems.reduce((acc, item) => acc + getLineTotal(item), 0)
  const discountAmount = discountEnabled
    ? subtotal * (safeNumber(discountRate) / 100)
    : 0
  const taxableAmount = Math.max(subtotal - discountAmount, 0)
  const taxAmount = taxEnabled ? taxableAmount * (safeNumber(taxRate) / 100) : 0
  const total = taxableAmount + taxAmount

  return (
    <NodeViewWrapper className="proposal-billing-section my-12 overflow-hidden rounded-xl border bg-background shadow-sm">
      <div className="bg-muted/40 px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold tracking-widest text-muted-foreground uppercase">
              Services & Billing
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Capture proposal line items, discounts, tax, and signature.
            </p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <Table className="min-w-180 text-left">
          <TableHeader>
            <TableRow className="bg-muted/20 text-[10px] font-bold tracking-widest text-muted-foreground uppercase hover:bg-muted/20">
              <TableHead className="rounded-l-md px-4 py-3 text-muted-foreground">
                Description
              </TableHead>
              <TableHead className="px-4 py-3 text-center text-muted-foreground">
                Qty
              </TableHead>
              <TableHead className="px-4 py-3 text-right text-muted-foreground">
                Price
              </TableHead>
              <TableHead className="px-4 py-3 text-right text-muted-foreground">
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
                  className="px-4 py-8 text-center text-sm text-muted-foreground"
                >
                  No line items yet. Add a service to start building the
                  proposal total.
                </TableCell>
              </TableRow>
            ) : null}

            {lineItems.map((item, index) => {
              const lineTotal = getLineTotal(item)

              return (
                <TableRow
                  key={index}
                  className="group align-top hover:bg-muted/10"
                >
                  <TableCell className="px-4 py-5 whitespace-normal">
                    <div className="flex gap-3">
                      {item.showImage ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-lg"
                          className="mt-0.5 size-10 shrink-0 rounded-xl bg-muted text-muted-foreground hover:text-foreground"
                          aria-label="Line item image placeholder"
                        >
                          <HugeiconsIcon
                            icon={Image01Icon}
                            className="h-4 w-4"
                          />
                        </Button>
                      ) : null}
                      <div className="min-w-0 flex-1 space-y-2">
                        <Input
                          className="rounded-none border-x-0 border-t-0 border-b border-transparent bg-transparent px-0 font-medium shadow-none hover:border-border focus-visible:border-border focus-visible:ring-0"
                          placeholder="Item description..."
                          value={item.description}
                          onChange={(event) =>
                            updateItem(index, "description", event.target.value)
                          }
                        />

                        {item.showDetails ? (
                          <Textarea
                            rows={2}
                            className="min-h-12 rounded-none border-x-0 border-t-0 border-b border-transparent bg-transparent px-0 py-0 text-sm text-muted-foreground shadow-none hover:border-border focus-visible:border-border focus-visible:ring-0"
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
                            onClick={() =>
                              updateItem(index, "showDetails", true)
                            }
                            className="h-auto px-0 py-0 text-sm text-muted-foreground hover:bg-transparent hover:text-foreground"
                          >
                            + Add details
                          </Button>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-5 text-center">
                    <Input
                      className="mx-auto w-16 rounded-none border-x-0 border-t-0 border-b border-transparent text-center shadow-none hover:border-border focus-visible:border-border focus-visible:ring-0"
                      type="number"
                      min={0}
                      step={1}
                      inputMode="numeric"
                      value={safeNumber(item.quantity)}
                      onChange={(event) =>
                        updateItem(
                          index,
                          "quantity",
                          safeNumber(event.target.value)
                        )
                      }
                    />
                  </TableCell>
                  <TableCell className="px-4 py-5 text-right">
                    <Input
                      className="ml-auto w-28 rounded-none border-x-0 border-t-0 border-b border-transparent text-right shadow-none hover:border-border focus-visible:border-border focus-visible:ring-0"
                      type="number"
                      min={0}
                      step="0.01"
                      inputMode="decimal"
                      value={safeNumber(item.rate)}
                      onChange={(event) =>
                        updateItem(
                          index,
                          "rate",
                          safeNumber(event.target.value)
                        )
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
                      onClick={() => removeItem(index)}
                      className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
                      aria-label="Remove line item"
                    >
                      <HugeiconsIcon icon={Delete02Icon} className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={addItem}
            className="h-8 gap-1.5 rounded-full border-dashed text-xs text-muted-foreground hover:text-foreground"
          >
            <HugeiconsIcon icon={PlusSignIcon} className="h-3.5 w-3.5" />
            Add Line Item
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={addCatalogItem}
            className="h-8 gap-1.5 rounded-full border-dashed text-xs text-muted-foreground hover:text-foreground"
          >
            <HugeiconsIcon icon={PlusSignIcon} className="h-3.5 w-3.5" />
            From Catalog
          </Button>
        </div>

        <div className="mt-10 grid gap-8 border-t pt-8 md:grid-cols-[1fr_28rem]">
          <div className="space-y-3 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Billing notes</p>
            <p>
              Use this section to confirm the services, quantities, pricing,
              discounts, and taxes included in this proposal.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-semibold">{money(subtotal)}</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {!discountEnabled ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateAttributes({ discountEnabled: true })}
                  className="h-8 rounded-full border-dashed text-xs text-muted-foreground hover:text-foreground"
                >
                  + Discount
                </Button>
              ) : null}
              {!taxEnabled ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateAttributes({ taxEnabled: true })}
                  className="h-8 rounded-full border-dashed text-xs text-muted-foreground hover:text-foreground"
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
                onRateChange={(value) =>
                  updateAttributes({ discountRate: value })
                }
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
                onRateChange={(value) => updateAttributes({ taxRate: value })}
                onRemove={() =>
                  updateAttributes({ taxEnabled: false, taxRate: 0 })
                }
              />
            ) : null}

            <Separator />

            <div className="flex items-center justify-between">
              <span className="text-lg font-bold">Total</span>
              <span className="text-3xl font-bold tracking-tight">
                {money(total)}
              </span>
            </div>

            <div className="pt-8 text-right">
              <p className="font-[cursive] text-3xl leading-none text-foreground">
                {signedInUserName || "Signed in user"}
              </p>
              <p className="mt-2 text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
                Signature
              </p>
            </div>
          </div>
        </div>
      </div>
    </NodeViewWrapper>
  )
}

function AdjustmentRow({
  label,
  rate,
  amount,
  onRateChange,
  onRemove,
}: {
  label: string
  rate: number
  amount: number
  onRateChange: (value: number) => void
  onRemove: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <div className="flex items-center gap-3 text-muted-foreground">
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={onRemove}
          className="text-muted-foreground hover:text-destructive"
          aria-label={`Remove ${label.toLowerCase()}`}
        >
          <HugeiconsIcon icon={Cancel01Icon} className="h-3.5 w-3.5" />
        </Button>
        <span>{label}</span>
      </div>
      <div className="ml-auto flex items-center gap-2 text-muted-foreground">
        <Input
          className="w-16 rounded-none border-x-0 border-t-0 border-b border-transparent text-right shadow-none hover:border-border focus-visible:border-border focus-visible:ring-0"
          type="number"
          min={0}
          step="0.01"
          inputMode="decimal"
          value={rate}
          onChange={(event) => onRateChange(safeNumber(event.target.value))}
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
        {money(amount)}
      </span>
    </div>
  )
}

import { NodeViewWrapper } from "@tiptap/react"
import { Button } from "@workspace/ui/components/button"
import { HugeiconsIcon } from "@hugeicons/react"
import { Delete02Icon, PlusSignIcon } from "@hugeicons/core-free-icons"
import { Separator } from "@workspace/ui/components/separator"
import type { NodeViewProps } from "@tiptap/react"

export function PricingTableView({ node, updateAttributes }: NodeViewProps) {
  const { items, currency, taxRate } = node.attrs

  const updateItem = (index: number, key: string, value: any) => {
    const newItems = [...items]
    const item = { ...newItems[index], [key]: value }

    // Recalculate total
    if (key === "quantity" || key === "rate") {
      item.total = Number(item.quantity) * Number(item.rate)
    }

    newItems[index] = item
    updateAttributes({ items: newItems })
  }

  const addItem = () => {
    updateAttributes({
      items: [
        ...items,
        { description: "New Item", quantity: 1, rate: 0, total: 0 },
      ],
    })
  }

  const removeItem = (index: number) => {
    updateAttributes({
      items: items.filter((_: any, i: number) => i !== index),
    })
  }

  const subtotal = items.reduce((acc: number, item: any) => acc + item.total, 0)
  const taxAmount = subtotal * (taxRate / 100)
  const total = subtotal + taxAmount

  return (
    <NodeViewWrapper className="pricing-table my-12 overflow-hidden rounded-xl border bg-background shadow-sm">
      <div className="bg-muted/30 px-6 py-4">
        <h3 className="text-sm font-bold tracking-widest text-muted-foreground uppercase">
          Investment
        </h3>
      </div>

      <div className="p-6">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
              <th className="pr-4 pb-4">Description</th>
              <th className="pr-4 pb-4 text-center">Qty</th>
              <th className="pr-4 pb-4 text-right">Rate</th>
              <th className="pb-4 text-right">Total</th>
              <th className="w-10 pb-4 pl-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {items.map((item: any, index: number) => (
              <tr
                key={index}
                className="group transition-colors hover:bg-muted/10"
              >
                <td className="py-4 pr-4">
                  <input
                    className="w-full bg-transparent font-medium outline-none placeholder:text-muted-foreground/30"
                    placeholder="Description..."
                    value={item.description}
                    onChange={(e) =>
                      updateItem(index, "description", e.target.value)
                    }
                  />
                </td>
                <td className="py-4 pr-4 text-center">
                  <input
                    className="w-8 bg-transparent text-center outline-none"
                    type="number"
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(
                        index,
                        "quantity",
                        parseInt(e.target.value) || 0
                      )
                    }
                  />
                </td>
                <td className="py-4 pr-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <span className="text-muted-foreground">{currency}</span>
                    <input
                      className="w-20 bg-transparent text-right outline-none"
                      type="number"
                      value={item.rate}
                      onChange={(e) =>
                        updateItem(
                          index,
                          "rate",
                          parseFloat(e.target.value) || 0
                        )
                      }
                    />
                  </div>
                </td>
                <td className="py-4 text-right font-bold">
                  {currency}
                  {item.total.toLocaleString()}
                </td>
                <td className="py-4 pl-4 text-right">
                  <button
                    onClick={() => removeItem(index)}
                    className="text-destructive opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive/80"
                  >
                    <HugeiconsIcon icon={Delete02Icon} className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <Button
          variant="ghost"
          size="sm"
          onClick={addItem}
          className="mt-4 h-8 gap-1.5 text-xs text-muted-foreground hover:bg-muted"
        >
          <HugeiconsIcon icon={PlusSignIcon} className="h-3.5 w-3.5" />
          Add Line Item
        </Button>

        <div className="mt-8 flex flex-col items-end gap-4 border-t pt-8">
          <div className="flex w-64 justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium">
              {currency}
              {subtotal.toLocaleString()}
            </span>
          </div>
          <div className="flex w-64 items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Tax</span>
              <div className="flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold">
                <input
                  className="w-4 bg-transparent outline-none"
                  type="number"
                  value={taxRate}
                  onChange={(e) =>
                    updateAttributes({ taxRate: parseInt(e.target.value) || 0 })
                  }
                />
                %
              </div>
            </div>
            <span className="font-medium">
              {currency}
              {taxAmount.toLocaleString()}
            </span>
          </div>
          <Separator className="w-64" />
          <div className="flex w-64 justify-between">
            <span className="text-lg font-bold">Total</span>
            <span className="text-lg font-bold text-primary">
              {currency}
              {total.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </NodeViewWrapper>
  )
}

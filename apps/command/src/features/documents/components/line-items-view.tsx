import { NodeViewWrapper } from "@tiptap/react"
import type { NodeViewProps } from "@tiptap/react"
import type { PricingItem } from "@/features/documents/components/line-items-view/pricing"
import { useConfirm } from "@/components/confirm-dialog-provider"
import { LineItemsTable } from "@/features/documents/components/line-items-view/line-items-table"
import {
  getLineItemKey,
  getLineTotal,
  safeNumber,
} from "@/features/documents/components/line-items-view/pricing"
import { SignatureBillingNotes } from "@/features/documents/components/line-items-view/signature-billing-notes"
import { TotalsAdjustments } from "@/features/documents/components/line-items-view/totals-adjustments"
import { createId } from "@/lib/create-id"

function LineItemsView({ node, updateAttributes }: NodeViewProps) {
  const {
    items = [],
    discountRate = 0,
    taxRate = 0,
    discountEnabled = false,
    taxEnabled = false,
    signerName = "",
    signerTitle = "",
  } = node.attrs
  const confirm = useConfirm()

  const lineItems: Array<PricingItem> = Array.isArray(items) ? items : []

  const updateItem = <TKey extends keyof PricingItem>(
    index: number,
    key: TKey,
    value: PricingItem[TKey]
  ) => {
    const nextItems = lineItems.map((item, itemIndex) => {
      if (itemIndex !== index) return item

      const nextItem = { ...item, id: getLineItemKey(item), [key]: value }
      return { ...nextItem, total: getLineTotal(nextItem) }
    })

    updateAttributes({ items: nextItems })
  }

  const addItem = () => {
    updateAttributes({
      items: [
        ...lineItems,
        {
          id: createId("line-item"),
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
          id: createId("line-item"),
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

  const removeItem = async (index: number) => {
    const item = lineItems[index]
    const confirmed = await confirm({
      title: "Remove line item?",
      description: item.description
        ? `This will remove "${item.description}" from the document.`
        : "This will remove the selected line item from the document.",
      confirmLabel: "Remove item",
      variant: "destructive",
    })

    if (!confirmed) return

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
    <NodeViewWrapper
      className="document-line-items my-[var(--document-section-spacing)] overflow-hidden rounded-[var(--document-radius)] border border-[var(--document-border)] bg-[var(--document-page-background)] text-[var(--document-foreground)] shadow-sm"
      contentEditable={false}
    >
      <div className="bg-[color-mix(in_oklab,var(--document-accent)_8%,transparent)] px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold tracking-widest text-[var(--document-muted-foreground)] uppercase">
              Services & Billing
            </h3>
            <p className="mt-1 text-xs text-[var(--document-muted-foreground)]">
              Capture line items, discounts, tax, and signature.
            </p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <LineItemsTable
          lineItems={lineItems}
          updateItem={updateItem}
          removeItem={removeItem}
          addItem={addItem}
          addCatalogItem={addCatalogItem}
        />

        <div className="mt-10 grid gap-8 border-t border-[var(--document-border)] pt-8 md:grid-cols-[1fr_28rem]">
          <SignatureBillingNotes />
          <TotalsAdjustments
            subtotal={subtotal}
            discountRate={safeNumber(discountRate)}
            taxRate={safeNumber(taxRate)}
            discountEnabled={discountEnabled}
            taxEnabled={taxEnabled}
            discountAmount={discountAmount}
            taxAmount={taxAmount}
            total={total}
            signerName={typeof signerName === "string" ? signerName : ""}
            signerTitle={typeof signerTitle === "string" ? signerTitle : ""}
            updateAttributes={updateAttributes}
          />
        </div>
      </div>
    </NodeViewWrapper>
  )
}

export { LineItemsView }
export default LineItemsView

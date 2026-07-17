import type { NodeViewProps } from "@tiptap/react"
import { NodeViewWrapper } from "@tiptap/react"
import {
  calculateInvoicePricing,
  calculateProposalPricing,
} from "@workspace/document/calculate"
import {
  useDocumentDraft,
  useDocumentDraftCommands,
  useDocumentEditorHost,
} from "../runtime/react"

import { LineItemsTable } from "./line-items-view/line-items-table"
import type { PricingItem } from "./line-items-view/pricing"
import { SignatureBillingNotes } from "./line-items-view/signature-billing-notes"
import { TotalsAdjustments } from "./line-items-view/totals-adjustments"

function LineItemsView(_props: NodeViewProps) {
  const { confirm, createId } = useDocumentEditorHost()
  const document = useDocumentDraft()
  const locale = document.locale
  const pricing = document.data.pricing
  const commands = useDocumentDraftCommands()

  if (!pricing) return null

  // biome-ignore lint/suspicious/noExplicitAny: items can be proposal or invoice pricing items
  const lineItems: Array<PricingItem> = pricing.items.map((item: any) => ({
    id: item.id,
    description: item.description,
    details: item.details,
    quantity: Number(item.quantity),
    rate: item.unitPriceMinor / 100,
    showDetails: item.showDetails,
    showImage: item.showImage,
  }))
  const calculation =
    document.kind === "proposal"
      ? calculateProposalPricing(pricing)
      : calculateInvoicePricing(pricing)
  const discountRate =
    pricing.discount?.kind === "rate" ? pricing.discount.basisPoints / 100 : 0
  const taxRate = pricing.tax ? pricing.tax.basisPoints / 100 : 0

  const updateItem = <TKey extends keyof PricingItem>(
    index: number,
    key: TKey,
    value: PricingItem[TKey]
  ) => {
    commands.updatePricing(
      // biome-ignore lint/suspicious/noExplicitAny: current pricing state
      (current: any) => ({
        ...current,
        // biome-ignore lint/suspicious/noExplicitAny: item is proposal or invoice item
        items: current.items.map((item: any, itemIndex: number) => {
          if (itemIndex !== index) return item
          if (key === "rate")
            return { ...item, unitPriceMinor: Math.round(Number(value) * 100) }
          if (key === "quantity")
            return { ...item, quantity: String(value || 0) }
          if (key === "total") return item
          return { ...item, [key]: value }
        }),
      }),
      `item.${pricing.items[index]?.id}.${String(key)}`
    )
  }

  const addItem = (catalog = false) =>
    // biome-ignore lint/suspicious/noExplicitAny: current pricing state
    commands.updatePricing((current: any) => ({
      ...current,
      items: [
        ...current.items,
        {
          id: createId("line-item"),
          description: catalog
            ? "Catalog service"
            : `Item ${current.items.length + 1}`,
          details: catalog
            ? "Describe the selected service scope, assumptions, and deliverables."
            : "",
          quantity: "1",
          unitPriceMinor: 0,
          showDetails: catalog,
          showImage: catalog,
        },
      ],
    }))

  const removeItem = async (index: number) => {
    const item = pricing.items[index]
    const confirmed = await confirm({
      title: "Remove line item?",
      description: item.description
        ? `This will remove "${item.description}" from the document.`
        : "This will remove the selected line item from the document.",
      confirmLabel: "Remove item",
      variant: "destructive",
    })
    if (!confirmed) return
    // biome-ignore lint/suspicious/noExplicitAny: current pricing state
    commands.updatePricing((current: any) => ({
      ...current,
      // biome-ignore lint/suspicious/noExplicitAny: filtering items
      items: current.items.filter(
        (_: any, itemIndex: number) => itemIndex !== index
      ),
    }))
  }

  const updateAdjustments = (attributes: Record<string, unknown>) => {
    // biome-ignore lint/suspicious/noExplicitAny: current pricing state
    commands.updatePricing((current: any) => {
      let next = current
      if ("discountEnabled" in attributes) {
        next = {
          ...next,
          discount: attributes.discountEnabled
            ? {
                kind: "rate",
                basisPoints:
                  current.discount?.kind === "rate"
                    ? current.discount.basisPoints
                    : 0,
              }
            : undefined,
        }
      }
      if (typeof attributes.discountRate === "number") {
        next = {
          ...next,
          discount: {
            kind: "rate",
            basisPoints: Math.round(attributes.discountRate * 100),
          },
        }
      }
      if ("taxEnabled" in attributes) {
        next = {
          ...next,
          tax: attributes.taxEnabled
            ? { kind: "rate", basisPoints: current.tax?.basisPoints ?? 0 }
            : undefined,
        }
      }
      if (typeof attributes.taxRate === "number") {
        next = {
          ...next,
          tax: {
            kind: "rate",
            basisPoints: Math.round(attributes.taxRate * 100),
          },
        }
      }
      // biome-ignore lint/suspicious/noExplicitAny: check property and assign dynamically
      if (typeof attributes.signerName === "string" && "signerName" in next)
        (next as any).signerName = attributes.signerName
      // biome-ignore lint/suspicious/noExplicitAny: check property and assign dynamically
      if (typeof attributes.signerTitle === "string" && "signerTitle" in next)
        (next as any).signerTitle = attributes.signerTitle
      return next
    })
  }

  return (
    <NodeViewWrapper
      className="document-line-items my-[var(--document-section-spacing)] text-[var(--document-foreground)]"
      contentEditable={false}
    >
      <div className="border-[var(--document-border)] border-b pb-4">
        <h3 className="font-bold text-[var(--document-foreground)] text-xs uppercase tracking-[0.16em]">
          Services & Billing
        </h3>
        <p className="mt-1.5 text-[var(--document-muted-foreground)] text-xs">
          {document.kind === "proposal"
            ? "Indicative proposal pricing"
            : "Final invoice billing"}
        </p>
      </div>
      <div className="pt-5">
        <LineItemsTable
          lineItems={lineItems}
          updateItem={updateItem}
          removeItem={removeItem}
          addItem={() => addItem(false)}
          addCatalogItem={() => addItem(true)}
          currency={pricing.currency}
          locale={locale}
        />
        <div className="mt-10 grid gap-10 border-[var(--document-border)] border-t pt-8 md:grid-cols-[1fr_26rem]">
          <SignatureBillingNotes />
          <TotalsAdjustments
            subtotal={calculation.subtotalMinor / 100}
            discountRate={discountRate}
            taxRate={taxRate}
            discountEnabled={Boolean(pricing.discount)}
            taxEnabled={Boolean(pricing.tax)}
            discountAmount={calculation.discountMinor / 100}
            taxAmount={calculation.taxMinor / 100}
            total={calculation.totalMinor / 100}
            // biome-ignore lint/suspicious/noExplicitAny: pricing could be proposal pricing containing signerName
            signerName={(pricing as any).signerName}
            // biome-ignore lint/suspicious/noExplicitAny: pricing could be proposal pricing containing signerTitle
            signerTitle={(pricing as any).signerTitle}
            updateAttributes={updateAdjustments}
            currency={pricing.currency}
            locale={locale}
          />
        </div>
      </div>
    </NodeViewWrapper>
  )
}

export { LineItemsView }
export default LineItemsView

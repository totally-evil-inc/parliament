# Extension Guide

## Add a new authored block

Use this sequence for a block whose values are authored proposal content.

### 1. Define the canonical schema

Add a member to `documentBlockSchema` in
`packages/document/src/schema.ts`.

```ts
z.object({
  ...blockBase,
  type: z.literal("faq"),
  items: z.array(
    z
      .object({
        id: idSchema,
        question: z.string(),
        answer: richTextDocSchema,
      })
      .strict()
  ),
}).strict()
```

Keep the block domain-focused. Do not include React nodes, icons, CSS classes,
TipTap `Editor` objects, or application callbacks.

### 2. Add canonical defaults

If every fresh proposal includes the block, add it in `createProposalDraft()`.
Otherwise define its insertion default in the proposal editor catalog.

All IDs must be stable and non-empty.

### 3. Add TipTap conversion

Update both directions in
`packages/document-editor/src/composition.ts`:

- `blockToTiptap()` converts the canonical block to its TipTap node.
- `tiptapToComposition()` validates/coerces editor attrs into the canonical
  shape.

Do not use unchecked casts as validation. Normalize editor-friendly optional
values and rely on `parseProposalDraft` at commit.

### 4. Add the extension and NodeView

Put schema-only reusable extension construction in
`@workspace/document-editor` when appropriate. Bind the React NodeView in
`apps/command`.

The NodeView may use app UI, dialogs, and asset pickers. It must not own domain
calculations or persistence calls.

### 5. Register editor insertion metadata

Update the proposal block catalog with:

- Stable catalog ID.
- Label and description.
- Search terms.
- Icon and preview.
- Layout presets.
- `createContent()` output.

Keep icons/previews outside the persisted block.

### 6. Add read rendering

Add the block to the typed `blockRenderers` registry in the proposal print
view. Render canonical values or the render model only.

Then add text extraction in `packages/document/src/text.ts`.

### 7. Add tests

At minimum:

- Schema acceptance and malformed-data rejection.
- Canonical -> TipTap -> canonical conversion.
- Default insertion validation.
- Text extraction.
- HTML semantic output or component test.

## Add a bound business section

A bound section is different from an authored block.

1. Add the business data to the document-specific `data` schema.
2. Add typed store commands for editing it.
3. Add a binding-only block with presentation config.
4. Make its TipTap node attrs contain only `blockId`, `binding`, and display
   settings.
5. Make its NodeView select canonical data from the store.
6. Ensure deleting the block does not delete the bound data.
7. Make the render model resolve the binding.

Do not store a second copy of the business payload in the node attrs.

## Add a structured field

For a new proposal field such as `referenceNumber`:

1. Add it to the strict proposal data schema.
2. Add a default in `createProposalDraft()`.
3. Add a store command or extend a suitable typed update command.
4. Read/write it from the relevant NodeView through store hooks.
5. Add it to the render model if outputs need it.
6. Add schema, store, and renderer tests.

Use a plain string for structured identity/contact fields. Use `RichTextDoc`
only when formatting is a real product requirement.

## Add a pricing rule

Financial policy changes require more care:

1. Version or extend the canonical input schema.
2. Change only the shared calculation function.
3. Decide the exact ordering and rounding policy before implementation.
4. Increment `calculationVersion` for a semantic rule change.
5. Add boundary and rounding fixtures.
6. Confirm editor and read renderer both consume the same result.

Never add a renderer-only or NodeView-only formula.

## Add a template

Templates have identity and version. Add the token preset in the app template
catalog, then persist a reference:

```ts
commands.setTemplate({
  id: "proposal-modern",
  version: 1,
  overrides: selectedTemplate.tokens,
})
```

When a change would alter old output, create template version `2`. Do not
silently redefine version `1` after finalized documents exist.

## Add an external source picker

Customer, product, team, and testimonial pickers belong in `apps/command`.

On selection:

1. Convert the source record into a document snapshot shape.
2. Copy the displayed values into the draft.
3. Retain `sourceId` and optionally `sourceRevision`.
4. Apply the change through one typed command.

Do not store an API client or query object in the document package.

## Add another document type

Do not widen `ProposalDraft` until the new type's semantics are known.

Recommended sequence for invoices:

1. Define `InvoiceData` with invoice-specific dates, number, status, parties,
   currency, line items, and payment terms.
2. Add a discriminated aggregate schema.
3. Isolate invoice calculations and rounding policy.
4. Add invoice-specific required binding blocks.
5. Build render-model and text transforms.
6. Reuse only primitives that are genuinely shared with proposals.

An invoice `dueDate` must not reuse proposal `validUntil`.

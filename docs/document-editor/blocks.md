# Blocks

## Block categories

Blocks fall into three categories.

### Bound semantic blocks

These place canonical domain data in the document:

- `partyHeader` binds to `proposal.parties`.
- `pricing` binds to `proposal.pricing`.

They hold only a stable block ID, version, binding, and presentation config.

### Authored structured blocks

These values are document content and live inside composition:

- `metrics`
- `team`
- `testimonials`
- `gallery`

Team members and testimonials may retain source provenance. Their values are
still snapshots, not live external records.

### Authored rich blocks

- `richText`
- `timeline`

These contain an owned `RichTextDoc` tree.

## Current block contract

| Canonical type | TipTap node      | Canonical payload                 | Required read output |
| -------------- | ---------------- | --------------------------------- | -------------------- |
| `partyHeader`  | `documentHeader` | Binding and layout                | HTML and text        |
| `pricing`      | `lineItems`      | Binding and title config          | HTML and text        |
| `richText`     | Standard nodes   | `RichTextDoc`                     | HTML and text        |
| `metrics`      | `keyNumbers`     | Columns and metrics               | HTML and text        |
| `team`         | `teamMembers`    | Columns and member snapshots      | HTML and text        |
| `testimonials` | `testimonials`   | Columns and testimonial snapshots | HTML and text        |
| `gallery`      | `gallery`        | Columns and asset references      | HTML and alt text    |
| `timeline`     | `timeline`       | `RichTextDoc`                     | HTML and text        |

## Canonical-to-editor conversion

`compositionToTiptap()` maps every canonical block into editor JSON.

Bound blocks become atomic nodes with bindings. Structured authored blocks put
their authored values in attrs because those attrs are part of canonical
composition content, not separate business data.

Rich-text blocks are currently flattened into their child TipTap nodes.

## Editor-to-canonical conversion

`tiptapToComposition()` recognizes custom node names and normalizes attributes.
It performs these protections:

- Invalid column counts default to `3`.
- Missing authored item IDs receive deterministic fallback IDs.
- Unknown and legacy gallery URLs do not enter the canonical asset model.
- Unsupported testimonial avatar URL fields do not enter canonical data.
- Ordinary TipTap nodes become `richText` blocks.

The result is validated on store commit. A malformed adapter output therefore
fails close to the edit boundary.

## Stable identity caveat

Custom nodes carry `blockId` attributes and preserve stable identity. Ordinary
rich-text nodes do not currently have a canonical wrapper in TipTap; their
fallback IDs use their document index.

Consequences:

- Inserting prose before another prose node can change fallback IDs.
- Do not use those fallback IDs as external database references.
- Collaboration, comments, and stable block addressing require a dedicated
  rich-text wrapper or another persistent identity strategy.

## Presentation-only deletion

Removing a `partyHeader` or `pricing` block must not delete its bound data.

```ts
commands.setComposition(
  draft.composition.blocks.filter((block) => block.type !== "pricing")
)

// draft.data.pricing still exists
```

If the product needs a destructive "remove pricing data" action, implement it
as an explicit domain command with confirmation. Do not infer it from a layout
operation.

## Source snapshots

Team, testimonial, customer, and pricing items can record `sourceId` and
`sourceRevision`.

Expected future refresh flow:

1. Load the current source record in `apps/command`.
2. Compare it with the draft snapshot.
3. Show the user what will change.
4. Apply a typed store command.
5. Keep the authored draft unchanged if refresh is cancelled.

Never silently mutate a draft when a library or customer record changes.

## Renderer completeness

The print view declares a typed renderer record:

```ts
const blockRenderers: Record<
  DocumentBlock["type"],
  (props: BlockRendererProps) => React.ReactNode
>
```

Adding a discriminated block type causes a compile error until a renderer is
registered. Text extraction uses an exhaustive switch and must be updated at
the same time.

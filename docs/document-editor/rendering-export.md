# Rendering and Export

## Render-model boundary

`buildProposalRenderModel(input)` accepts unknown input and validates it before
constructing renderer data.

It resolves:

- Proposal metadata and parties.
- Optional pricing and its shared calculation result.
- Template reference.
- Ordered canonical blocks.
- Locale and timezone.

Renderers should accept `ProposalRenderModel`, not `ProposalDraft`, TipTap JSON,
or NodeView props.

## Current HTML/print renderer

The current read renderer is
`apps/command/src/features/documents/print/proposal-print-view.tsx`.

It contains a typed block registry. The registry is exhaustive over
`DocumentBlock["type"]`, so new block types require a renderer at compile time.

The renderer:

- Uses canonical parties and dates for the header.
- Uses precomputed pricing results from the render model.
- Formats money with explicit currency and locale.
- Formats date-only strings without UTC conversion.
- Renders authored blocks without mounting NodeViews.

It does not yet resolve durable image assets or generate PDF bytes.

## Text rendering

`extractProposalText(model)` provides a plain-text representation for:

- Search indexing.
- Email alternatives.
- Accessibility/audit displays.
- Renderer completeness tests.

Every new block type must have an explicit text policy.

## Current preview transport

The editor's Export toolbar action currently:

1. Flushes current TipTap composition into the canonical store.
2. Serializes the validated draft into `sessionStorage`.
3. Opens `/documents/print?draftKey=...`.
4. The print route reads and validates the draft.
5. The route builds a render model and mounts the read renderer.

This is a browser preview mechanism only.

Limitations:

- Data expires with the browser session.
- Another device or worker cannot access it.
- There is no immutable content hash.
- No artifact record is created.
- Browser CSS and fonts remain ambient.
- It cannot be used as a reliable send/download backend.

## Target production pipeline

```txt
persisted editable draft
        |
        v
validate + revision check
        |
        v
finalize immutable snapshot
        |
        +--> content hash
        +--> calculation version
        +--> template version
        +--> resolved asset descriptors
        |
        v
background generation job
        |
        +--> HTML/public renderer
        +--> PDF renderer
        +--> email renderer
        +--> plain text
        |
        v
generated artifact record + object storage
```

Finalization must freeze source-linked seller, customer, product, team,
testimonial, pricing, template, and asset values.

## PDF technology decision

The implementation has not selected a production PDF engine.

Evaluate with a pagination prototype:

- Headless browser HTML offers strong visual parity with the current read view
  but requires deterministic fonts, image readiness, and page-break CSS.
- `@react-pdf/renderer` offers explicit page primitives but requires a separate
  component tree.

Whichever is selected, it must consume the same render model and calculations.
Do not print the editor DOM or reuse NodeViews as PDF components.

## Asset resolution

Future renderer input should receive authorized resolved assets:

```ts
type ResolvedAsset = {
  id: string
  mimeType: string
  bytes?: Uint8Array
  url?: string
  width?: number
  height?: number
  sha256?: string
}
```

A worker must never fetch arbitrary persisted user URLs. Resolve known storage
keys through an allowlisted storage service to prevent SSRF, expiration, and
nondeterministic output.

## Determinism checklist

A production renderer must receive or pin:

- Locale and timezone.
- Currency and currency exponent.
- Template ID and version.
- Calculation version.
- Renderer version.
- Page size.
- Font files and weights.
- Immutable asset bytes or controlled URLs.
- Stable block ordering and IDs.

Do not read current time, theme, session, or authenticated user inside a
renderer.

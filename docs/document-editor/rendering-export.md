# Rendering and Export

## Render-model boundary

`buildProposalRenderModel(input)` and `buildInvoiceRenderModel(input)` accept unknown input and validate it before constructing renderer data.

They resolve:

- Document metadata and parties (seller and customer).
- Optional pricing and its shared calculation result.
- Template reference and CSS tokens.
- Ordered canonical blocks.
- Locale and timezone.
- For invoices: invoice number, due date, and payment terms.

Renderers accept `ProposalRenderModel` or `InvoiceRenderModel`, not mutable drafts, TipTap JSON, or editor NodeView props.

## Unified Document HTML & Read Renderer

The unified read & print renderer is `DocumentHtmlView` in `@workspace/document-pdf` (re-exported by `apps/command/src/features/documents/print/proposal-print-view.tsx`).

It contains a typed block registry exhaustive over all 14 canonical `DocumentBlock["type"]` entries:
- `partyHeader`: Dispatches between proposal layout (prepared for / valid until) and invoice layout (billed to / invoice number / due date).
- `pricing`: Renders line items, precomputed calculation totals (subtotal, discount, tax, total), and dispatches between signature block (proposals) and payment terms notes (invoices).
- `richText`: Renders typography, marks, lists, blockquotes, tables, and KaTeX LaTeX math equations.
- `section`: Standard and accented section layouts.
- `cover`: Minimal and split/band cover variants.
- `columns`: Multi-column structured layouts.
- `imageText`: Alternating image and prose blocks.
- `imageCards`: Horizontal and vertical card grids.
- `signature`: Formal acceptance and digital signature representation.
- `timeline`: Visual project phases and delivery schedules.
- `metrics`: Stat calls with large numeral emphasis.
- `team`: Team member cards with roles and biographies.
- `testimonials`: Quoted client endorsements.
- `gallery`: Visual image galleries with column configuration.
- `faq`: Collapsible question-and-answer lists.

The renderer:

- Uses canonical parties and dates for the header.
- Uses precomputed pricing results from the render model.
- Formats money with explicit currency and locale.
- Formats date-only strings without UTC conversion.
- Applies CSS variables directly from `getDocumentTemplateStyle(template)`.
- Renders authored blocks without mounting NodeViews.

## Continuous Tall Document PDF Engine

PDF export generates a single continuous, tall PDF document with no physical page breaks, no content compression, and 100% visual parity with the editor/read view:

1. **Geometry Contract**:
   - Fixed document width: `210mm` (standard A4 width).
   - Dynamic document height: measured continuous height matching the content length (1 page).
   - Zero physical page breaks across sections, tables, or composite blocks.
   - Clean margin structure: `18mm` horizontal padding.

2. **Headless Chrome Capture (`pdf-capture.ts`)**:
   - `renderDocumentHtmlDocument({ model, template, title })` generates a self-contained HTML document with embedded fonts, CSS tokens, and KaTeX styles.
   - The capture adapter executes headless Chrome to measure and emit a single tall PDF page with `--print-to-pdf`.
   - Bounds safety: minimum height `200px`, maximum height `50,000px`.

3. **Fallback Engine**:
   - If headless Chrome is not detected on the host system, `@react-pdf/renderer` serves as an automatic fallback generator.

4. **Converged Dispatch**:
   - Browser direct download (`exportDocumentToPdf`)
   - Gmail attachments (`apps/auth/src/agent/tools/document-send.ts`)
   - Scheduled dispatches (`apps/auth/src/lib/scheduler/dispatch-worker.ts`)
   All converge on `generateDocumentPdfBuffer` / `generateDocumentPdfBlob` in `@workspace/document-pdf`.

## Text rendering

`extractProposalText(model)` provides a plain-text representation for:

- Search indexing.
- Email alternatives.
- Accessibility/audit displays.
- Renderer completeness tests.

Every new block type must have an explicit text policy.

## Production pipeline

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
generation job
        |
        +--> DocumentHtmlView (Web preview & public client gate)
        +--> Headless Chrome Capture (Continuous Tall PDF)
        +--> Email Dispatch (Gmail / SMTP / Resend)
        +--> Plain Text Extraction
        |
        v
generated artifact record + object storage
```

## Determinism checklist

A production renderer must receive or pin:

- Locale and timezone.
- Currency and currency exponent.
- Template ID and version.
- Calculation version.
- Renderer version.
- Page geometry (210mm width, measured height).
- Font files and weights.
- Immutable asset bytes or controlled URLs.
- Stable block ordering and IDs.

Do not read current time, theme, session, or authenticated user inside a renderer.

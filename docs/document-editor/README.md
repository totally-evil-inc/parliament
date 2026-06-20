# Document Editor System

This documentation describes Parliament's proposal document system after the
canonical-model refactor. It covers the server-safe document model, the React
and TipTap adapter, application orchestration, read rendering, tests, and the
rules for extending the system.

## Documentation map

| Guide                                             | Purpose                                                                                       |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| [Architecture](./architecture.md)                 | Boundaries, ownership, dependency direction, and end-to-end data flow                         |
| [Domain model](./domain-model.md)                 | Persisted proposal shape, validation, money, dates, blocks, templates, and assets             |
| [Editor runtime](./editor-runtime.md)             | Store lifecycle, TipTap synchronization, NodeViews, history, and route wiring                 |
| [Blocks](./blocks.md)                             | Current block catalog, binding rules, serialization, and block invariants                     |
| [Extension guide](./extension-guide.md)           | Step-by-step instructions for adding blocks, fields, commands, and document types             |
| [Rendering and export](./rendering-export.md)     | Render-model construction, registry dispatch, preview transport, and future production export |
| [Testing and operations](./testing-operations.md) | Commands, test responsibilities, debugging, failure modes, and release checklist              |

## System status

The current implementation is a proposal editor foundation, not a complete
transactional document platform.

Implemented:

- A strict, versioned `ProposalDraft` schema.
- Structured seller, customer, dates, template, pricing, and assets outside
  TipTap JSON.
- Versioned composition blocks with bindings for parties and pricing.
- Deterministic proposal pricing in integer minor units.
- A route-scoped external draft store with revision tracking and history.
- TipTap-to-composition adapters and schema-only shared extensions.
- A validated render model and registry-driven proposal print view.
- Unit tests for schemas, calculations, composition conversion, and store
  behavior.

Not implemented:

- Durable database persistence or autosave APIs.
- Optimistic concurrency against a backend.
- Executable schema migrations beyond version-1 validation.
- Immutable finalization, sending, or artifact records.
- Worker-generated PDF or email output.
- Durable asset upload/resolution.
- Invoice or receipt schemas.
- A source-record refresh UI for customer, product, team, or testimonial data.

Do not treat the current `sessionStorage` print handoff as a production export
contract.

## Quick start

Create a fresh canonical draft and validate it:

```ts
import { createProposalDraft } from "@workspace/document/proposal"
import { parseProposalDraft } from "@workspace/document/schema"

const draft = createProposalDraft({
  id: "proposal-123",
  sellerName: "Parliament Studio",
})

const validated = parseProposalDraft(draft)
```

Create an editor store:

```ts
import { createProposalDraftStore } from "@workspace/document-editor/store"

const store = createProposalDraftStore(validated)

store.commands.setTitle("Website redesign proposal")
store.commands.updateParty("customer", {
  name: "Acme Limited",
  email: "finance@acme.example",
})
```

Convert canonical composition into TipTap input:

```ts
import { compositionToTiptap } from "@workspace/document-editor/composition"

const content = compositionToTiptap(store.getSnapshot().composition.blocks)
```

Build read-rendering input:

```ts
import { buildProposalRenderModel } from "@workspace/document/render"

const model = buildProposalRenderModel(store.getSnapshot())
```

## Non-negotiable rules

1. TipTap is an editing adapter, not the business database.
2. Seller, customer, dates, currency, pricing, and lifecycle fields belong in
   canonical structured data.
3. Bound blocks reference canonical data; they do not duplicate it.
4. Renderers consume a validated render model, never NodeView state.
5. Money is stored in integer minor units and calculated by the shared domain
   function.
6. Date-only business values use `YYYY-MM-DD` and are formatted with an
   explicit locale.
7. All input crossing a persistence, preview, worker, or network boundary must
   pass a runtime parser.
8. A new block is incomplete until its schema, editor adapter, read renderer,
   text extraction, and tests exist.

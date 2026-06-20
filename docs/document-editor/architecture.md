# Architecture

## Goals

The editor separates three kinds of state that were previously collapsed into
TipTap node attributes:

- **Domain data:** parties, dates, currency, pricing, template identity, and
  assets.
- **Composition:** ordered blocks and rich authored content.
- **Editor UI state:** selection, focus, menus, drag handles, and open panels.

This separation makes business data independently validatable and allows
rendering without mounting the dashboard editor.

## Package boundaries

### `@workspace/document`

Location: `packages/document`

This is the server-safe domain package. Its core has no React, DOM, router,
authentication, or TipTap runtime dependency.

It owns:

- Zod schemas and inferred domain types.
- Fresh proposal defaults.
- Pricing calculations and formatting helpers.
- Render-model construction.
- Plain-text extraction.
- Document, block, template, and asset versions.

Public subpaths:

```txt
@workspace/document
@workspace/document/schema
@workspace/document/proposal
@workspace/document/calculate
@workspace/document/render
@workspace/document/text
```

### `@workspace/document-editor`

Location: `packages/document-editor`

This is the browser authoring adapter. It depends on the document package,
React, and TipTap.

It owns:

- The route-scoped proposal store and command history.
- React store provider and selector hooks.
- Canonical composition to TipTap conversion.
- TipTap to canonical composition conversion.
- Schema-only document, party-header, and pricing extensions.
- Generic TipTap lifecycle and editor canvas components.
- Generic editor command contracts and filtering.
- Slash-command suggestion UI, bubble/table menus, and document drag handles.
- Proposal registry, portable NodeViews, base presets, toolbar, and sidebar.
- Debounced proposal runtime with flush, replacement, undo, and redo.

Public subpaths:

```txt
@workspace/document-editor
@workspace/document-editor/store
@workspace/document-editor/react
@workspace/document-editor/composition
@workspace/document-editor/components
@workspace/document-editor/definition
@workspace/document-editor/host
@workspace/document-editor/proposal
@workspace/document-editor/runtime
```

### `apps/command`

The application owns product workflow and workspace integrations:

- Route lifecycle and authenticated user defaults.
- Theme selection and editor layout.
- Route layout and composition of package editor components.
- Confirmation, input, ID, asset/source, and workflow adapters.
- Confirmation dialogs and source lookup workflows.
- Preview navigation and temporary browser transport.
- Read-only React components for the current print view.

The app may import both packages. Neither package may import from the app.

## Dependency direction

```txt
apps/command
  |---> @workspace/document-editor
  |          |
  |          v
  +----> @workspace/document

future API / worker ------------> @workspace/document
```

Forbidden dependencies:

```txt
@workspace/document -X-> React, TipTap, apps/command, auth, router
@workspace/document-editor -X-> apps/command, sessions, API clients
future worker -X-> @workspace/document-editor
```

## Canonical aggregate

The root aggregate is currently `ProposalDraft`:

```txt
ProposalDraft
  metadata
    id, schemaVersion, revision, status
    locale, timezone, timestamps
  template
    id, version, overrides
  data
    title, issueDate, validUntil
    seller, customer
    optional pricing
  composition
    version
    ordered DocumentBlock[]
  assets[]
```

`data` answers business questions. `composition` answers where and how the
document presents those values.

## Runtime data flow

```txt
createProposalDraft()
        |
        v
createProposalDraftStore()
        |
        +-----------------------------+
        |                             |
        v                             v
structured NodeViews             compositionToTiptap()
party/pricing commands                |
        |                             v
        |                         TipTap editor
        |                             |
        |                      300 ms quiet period
        |                             |
        +---------------------- tiptapToComposition()
                                      |
                                      v
                            store.commands.setComposition()
```

The store is the canonical owner while the route is mounted. TipTap owns the
live prose transaction stream and selection state, but its content is committed
back as canonical composition after a short debounce.

## Read-rendering flow

```txt
unknown input
    |
    v
parseProposalDraft()
    |
    v
buildProposalRenderModel()
    |              |
    |              +--> calculateProposalPricing()
    v
ProposalRenderModel
    |
    v
block renderer registry
    |
    v
read-only proposal HTML/print view
```

The render model is the interpretation boundary. Rendering components must not
recalculate totals or inspect TipTap business node attributes.

## Ownership table

| Concern                              | Owner                                          |
| ------------------------------------ | ---------------------------------------------- |
| Proposal validation                  | `@workspace/document/schema`                   |
| Defaults                             | `@workspace/document/proposal`                 |
| Financial rules                      | `@workspace/document/calculate`                |
| Ordered authored blocks              | `ProposalDraft.composition`                    |
| Live draft state                     | `@workspace/document-editor/store`             |
| Selection and rich-text transactions | TipTap                                         |
| Node schema                          | `@workspace/document-editor` (`extensions.ts`) |
| NodeView implementation              | `@workspace/document-editor`                   |
| Menu and drag-handle mechanics       | `@workspace/document-editor`                   |
| Editor command catalog               | `@workspace/document-editor`                   |
| Export/send workflow policy          | `apps/command`                                 |
| Theme selection                      | `apps/command`                                 |
| Read normalization                   | `@workspace/document/render`                   |
| Current HTML print components        | `apps/command`                                 |
| Persistence/finalization             | Not implemented                                |

## Design constraints

- The current aggregate supports only proposals.
- The store is in-memory and route-scoped.
- Revision numbers are local and are not yet concurrency tokens accepted by a
  server.
- Schema and block version numbers exist, but version-to-version migrations do
  not yet exist.
- Read rendering is model-driven, but the React implementation still resides
  in `apps/command`.
- Standard rich-text nodes receive index-derived block IDs when converted from
  TipTap. A durable rich-text wrapper will be required before collaborative or
  stable cross-session block addressing.

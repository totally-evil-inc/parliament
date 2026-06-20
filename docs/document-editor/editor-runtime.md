# Editor Runtime

## Store lifecycle

The proposal route creates one store per mounted editor:

```tsx
const store = React.useMemo(
  () => createProposalDraftStore(createProposalDraft({ id })),
  [id]
)

return (
  <ProposalDraftProvider store={store}>
    <ProposalEditorScreen store={store} />
  </ProposalDraftProvider>
)
```

The store validates the initial draft immediately. `replace()` validates a
replacement and clears undo/redo history.

The store exposes:

```ts
store.getSnapshot()
store.subscribe(listener)
store.setBeforeStructuredChange(listener)
store.commands
```

React components should use the provider hooks:

```tsx
const title = useProposalDraftSelector((draft) => draft.data.title)
const commands = useProposalDraftCommands()
```

The current selector hook subscribes to the full draft and applies the selector
after each update. It is API-compatible with narrower selection but does not yet
avoid every component render based on selected-value equality.

## Structured commands

Available commands:

```txt
setTitle
setIssueDate
setValidUntil
updateParty
updatePricing
setComposition
setTemplate
replace
undo / redo
canUndo / canRedo
```

Commands must produce immutable objects. Never mutate the current draft or a
nested pricing item in place.

Example:

```ts
commands.updatePricing(
  (pricing) => ({
    ...pricing,
    items: pricing.items.map((item) =>
      item.id === itemId ? { ...item, description: nextDescription } : item
    ),
  }),
  `item.${itemId}.description`
)
```

The optional coalescing key groups repeated edits to the same field if they
occur within 750 ms.

## TipTap initialization

`useProposalEditorRuntime` converts canonical blocks and creates the editor:

```ts
const runtime = useProposalEditorRuntime({ store })
```

`useDocumentEditorAdapter` creates TipTap with `immediatelyRender: false`. The
editor is recreated only when `documentKey` changes. An external content value
uses `setContent(..., { emitUpdate: false })` only when it actually differs.

Do not pass a continuously changing canonical content object back into the hook
after every TipTap transaction. Explicit replacement and history restoration
are the intended external update cases.

## Composition commits

`DocumentEditorCanvas` emits TipTap updates to the package runtime. The runtime
waits for a 300 ms quiet period, converts the JSON, and commits it:

```ts
runtime.onContentChange(content)
```

This avoids mirroring the entire TipTap tree through route React state on every
keystroke.

Before a structured command runs, `setBeforeStructuredChange` flushes any
pending composition transaction. This preserves chronological history when a
user types prose and immediately edits a structured input.

## Undo and redo

The store keeps in-memory `before` and `after` draft snapshots. Composition and
structured changes enter the same history stack.

Keyboard behavior:

- `Ctrl/Cmd+Z` calls the runtime's canonical undo handler.
- `Ctrl/Cmd+Shift+Z` calls redo.
- Pending prose is committed before undo.
- After undo/redo, canonical composition is pushed into TipTap with
  `emitUpdate: false`.

History is route-local and is lost on navigation or reload. It is not an audit
log and must not be persisted as one.

## NodeViews and bindings

The shared extensions define only binding/presentation attributes:

```ts
documentHeader: {
  blockId,
  binding: "proposal.parties",
  headerLayout,
}

lineItems: {
  blockId,
  binding: "proposal.pricing",
}
```

Their app NodeViews read canonical state using React hooks and update it through
commands. They must not call `updateAttributes()` with seller, customer, line
items, rates, or totals.

Auth, confirmation dialogs, asset pickers, and catalog search remain app-level
dependencies and must be passed into or used by app NodeViews, never imported
by the shared packages.

## Canvas field controls

Structured fields use document-specific raw HTML controls rather than the
shared application `Input` and `Textarea` components. This follows a hybrid
model: native inputs provide reliable selection, IME, accessibility, mobile
keyboards, and numeric semantics, while TipTap remains reserved for rich prose.

The canvas primitives have no resting background, radius, shadow, or visible
border. A subtle bottom rule and tint appear only on hover or focus. The title
uses an auto-growing textarea with explicit document heading typography;
addresses and line-item descriptions use auto-growing textareas; numeric fields
buffer intermediate decimal strings and normalize on blur.

Do not reuse general form controls inside the paper surface. Responsive and
dark-mode variants from those controls can override document typography and
reintroduce shaded field backgrounds.

## Editor canvas

`DocumentEditorCanvas` owns reusable behavior:

- TipTap `EditorContent` mounting.
- Update event subscription.
- Document template data attribute.
- Undo/redo keyboard interception.
- Slots for editor accessories and child UI.

The package owns bubble/table menus, slash commands, drag handles, the proposal
command catalog, portable NodeViews, toolbar, sidebar, and template controls.
The app mounts these components and provides host adapters for confirmation,
text input, IDs, assets/sources, and export/send workflows.

## Replacing a document

To load a different draft:

1. Parse the server response with `parseProposalDraft`.
2. Flush or abandon edits according to route policy.
3. Call `store.commands.replace(nextDraft)`.
4. Convert `nextDraft.composition.blocks` with `compositionToTiptap`.
5. Replace TipTap content with `emitUpdate: false`, or change `documentKey` to
   recreate the editor.

Do not depend on a changed object identity alone to represent document
replacement.

## Current route responsibilities

The proposal route currently handles:

- Store creation.
- Authenticated seller name defaults.
- Theme/template updates.
- Composition debounce and flush.
- Undo/redo synchronization.
- Toolbar export override.
- Temporary `sessionStorage` preview handoff.

Persistence should be added as a separate app service around store snapshots,
not inside NodeViews or the document packages.

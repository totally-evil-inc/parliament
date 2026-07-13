# Testing and Operations

## Commands

Run all document tests from the repository root:

```bash
bun test
```

Run package tests independently:

```bash
cd packages/document && bun test
cd packages/document-editor && bun test
```

Run the monorepo typecheck:

```bash
bun run typecheck
```

Run the application lint suite:

```bash
cd apps/command && bun run lint
```

At the time these docs were written, root `bun run lint` also checks
`packages/ui`, which has unrelated existing lint failures. The editor-related
application workspace passes its own lint command.

## Current test coverage

### Domain package

- Fresh factory output validates.
- Unsupported schema versions fail.
- Unknown block types fail.
- Decimal quantity calculations.
- Discount-before-tax ordering.
- Minor-unit rounding.
- Fixed discount capping.
- Explicit currency and date formatting.

### Editor package

- Structured commands update revisions.
- Undo and redo restore canonical state.
- Removing a pricing block preserves pricing data.
- Structured commands flush pending composition first.
- Bound and authored blocks survive adapter conversion.
- Legacy media URL attrs are removed during normalization.

## Required tests for future changes

### Schema changes

- Valid example.
- Missing required field.
- Unknown field rejection.
- Invalid version rejection.
- Migration fixture when versions change.

### Pricing changes

- Zero and large values.
- Fractional quantities.
- Every discount kind.
- Tax and discount ordering.
- Half-unit rounding boundaries.
- Currency exponent behavior.
- Editor/render equality.

### Block changes

- Canonical-to-TipTap conversion.
- TipTap-to-canonical conversion.
- Malformed attrs normalization or rejection.
- Read-renderer registration.
- Text extraction.
- Stable deletion/reordering behavior.

### Store changes

- Revision increments.
- Coalescing behavior.
- Undo/redo ordering.
- Replacement clears history.
- Pending composition flush.
- No false dirty update during explicit editor replacement.

## Manual QA checklist

Use a real browser for behavior that unit tests do not cover:

1. Edit title, seller, and customer fields.
2. Change issue and validity dates.
3. Add, edit, and remove custom party fields.
4. Add pricing rows with fractional quantities.
5. Add/remove discount and tax.
6. Confirm totals match the print view exactly.
7. Insert, reorder, and delete every authored block type.
8. Remove and reinsert the pricing presentation block; verify pricing survives.
9. Interleave prose typing and structured edits, then undo/redo repeatedly.
10. Change templates and verify the print view uses the selected overrides.
11. Export and verify invalid/expired preview keys show a clear error.
12. Test keyboard navigation, IME input, paste, drag/drop, and narrow viewport
    behavior.

## Debugging validation failures

If a store command throws a `ZodError`:

1. Inspect the issue path; it points to the invalid aggregate field.
2. Check whether a NodeView emitted UI-shaped data instead of canonical data.
3. Check `tiptapToComposition()` normalization for the affected block.
4. Confirm IDs and version fields are present.
5. Confirm quantity is a decimal string and money is integer minor units.
6. Add a failing fixture before changing the schema.

Do not weaken a strict schema merely to accept stale or malformed editor attrs.

## Debugging stale editor content

Check these boundaries in order:

1. Does TipTap emit an `update` event?
2. Is the 300 ms composition timer scheduled?
3. Does `tiptapToComposition()` produce the expected block?
4. Does `store.commands.setComposition()` commit and increment revision?
5. Is an explicit replacement accidentally pushing old content back with
   `setContent`?

Avoid adding a second React mirror of the full JSON tree as a workaround.

## Debugging history order

If undo order is wrong:

- Confirm structured commands call `beforeStructuredChange`.
- Confirm the route registered `commitPendingComposition` on the store.
- Confirm composition updates use the canonical history instead of native
  TipTap shortcuts.
- Check coalescing keys and the 750 ms grouping window.
- Check whether a product action bypassed the store and mutated attrs directly.

## Release checklist

Before merging an editor change:

```txt
[ ] Document tests pass
[ ] Editor tests pass
[ ] Monorepo typecheck passes
[ ] apps/command lint passes
[ ] New blocks have schema, adapter, HTML, text, and tests
[ ] No business payload was added to TipTap attrs
[ ] No calculation was duplicated in UI/render code
[ ] Serialized unknown input is runtime-validated
[ ] Manual undo/redo and export flow were exercised
[ ] Documentation reflects public API or behavior changes
```

## Known operational gaps

- Production Vite build/dev startup currently needs separate investigation in
  this environment; verification has relied on tests, lint, and TypeScript.
- There is no durable save/load path.
- There is no revision conflict response or recovery UI.
- There is no error boundary around a failed canonical commit.
- There is no telemetry for parse failures, render failures, or edit latency.
- There is no finalized document retention or artifact policy.

These are platform work, not reasons to put persistence or error recovery into
individual NodeViews.

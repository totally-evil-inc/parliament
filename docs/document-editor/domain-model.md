# Domain Model

## Validation boundary

All external or serialized proposal input must be treated as `unknown` and
parsed with one of these functions:

```ts
import {
  parseProposalDraft,
  safeParseProposalDraft,
} from "@workspace/document/schema"

const document = parseProposalDraft(input) // throws ZodError on failure
const result = safeParseProposalDraft(input) // discriminated success result
```

Use `parseProposalDraft` when invalid data is exceptional. Use the safe parser
when an error must be presented to a user or mapped to an API response.

The schemas are strict. Unknown fields are rejected rather than silently
discarded.

## Proposal metadata

| Field                     | Meaning                                   |
| ------------------------- | ----------------------------------------- |
| `id`                      | Stable document identifier                |
| `kind`                    | Currently always `"proposal"`             |
| `schemaVersion`           | Aggregate schema version, currently `1`   |
| `revision`                | Local monotonic edit revision             |
| `status`                  | Currently always `"draft"`                |
| `locale`                  | BCP 47 formatting locale, default `en-KE` |
| `timezone`                | IANA timezone, default `Africa/Nairobi`   |
| `createdAt` / `updatedAt` | ISO timestamps                            |

`revision` changes on every store commit. It is not yet backed by an optimistic
database write and must not be treated as a server concurrency guarantee.

## Structured proposal data

```ts
type ProposalData = {
  title: string
  issueDate: string
  validUntil?: string
  seller: PartySnapshot
  customer: PartySnapshot
  pricing?: ProposalPricing
}
```

The following values must never be moved into TipTap attributes as canonical
state:

- Proposal title and business dates.
- Seller and customer identity/contact data.
- Currency, quantities, rates, discounts, taxes, and signer information.
- Source record identifiers.

### Parties

A `PartySnapshot` is copied into the proposal:

```ts
type PartySnapshot = {
  sourceId?: string
  sourceRevision?: string
  name: string
  email: string
  address: string
  phone: string
  website: string
  taxId: string
  customFields: Array<{ id: string; label: string; value: string }>
}
```

`sourceId` and `sourceRevision` record provenance. They do not create a live
relationship. Future refresh behavior must be explicit: fetch the source,
present changes, and apply a normal draft command.

Party fields are structured plain text. If formatted prose is required, add a
separate `RichTextDoc` notes field instead of turning names, email addresses, or
tax identifiers into mini editors.

## Dates

Business dates are date-only strings:

```txt
2026-06-20
```

They must match `YYYY-MM-DD`. Do not serialize proposal validity as a UTC
timestamp. Format with an explicit locale:

```ts
formatDateOnly(document.data.issueDate, document.locale)
```

`validUntil` is a proposal concept. A future invoice must introduce `dueDate`
as a separate semantic field instead of aliasing the two.

## Pricing

Proposal pricing is currently indicative. It is structured and deterministic,
but final invoice authority and correction rules are not implemented.

### Inputs

```ts
type PricingItem = {
  id: string
  sourceId?: string
  sourceRevision?: string
  description: string
  details: string
  quantity: string
  unitPriceMinor: number
  showDetails: boolean
  showImage: boolean
}
```

- `quantity` is a non-negative decimal string such as `"1"` or `"1.5"`.
- `unitPriceMinor` is an integer in the currency's minor unit.
- Derived line totals are not stored.
- Currency is an uppercase ISO 4217 code.
- Percentage rates use integer basis points: `1600` means `16%`.

### Calculation order

`calculateProposalPricing()` applies this policy:

1. Multiply each minor-unit price by its decimal quantity.
2. Round each line to the nearest minor unit.
3. Sum line amounts into the subtotal.
4. Apply and cap the discount at the subtotal.
5. Apply tax to the post-discount taxable amount.
6. Add tax to produce the total.

The result includes `calculationVersion: "proposal-pricing@1"`.

```ts
const calculation = calculateProposalPricing(pricing)

calculation.lines
calculation.subtotalMinor
calculation.discountMinor
calculation.taxableMinor
calculation.taxMinor
calculation.totalMinor
```

Do not duplicate this formula in NodeViews or renderers.

### Currency precision limitation

`formatMoneyMinor()` currently divides values by `100`. This assumes a
two-decimal currency. Before supporting zero- or three-decimal currencies, add
an explicit currency exponent policy and calculation tests.

## Composition

Composition has its own version and ordered blocks:

```ts
type DocumentComposition = {
  version: 1
  blocks: Array<DocumentBlock>
}
```

Every block has:

- A stable non-empty `id`.
- A discriminating `type`.
- A block-local `version`, currently `1`.

Bound blocks contain a semantic binding:

```ts
{
  id: "proposal-header",
  type: "partyHeader",
  version: 1,
  binding: "proposal.parties",
  config: { layout: "mark-left-dates-right" },
}
```

Deleting this block removes the header presentation, not seller/customer data.
The same rule applies to the pricing block.

## Rich text

`RichTextDoc` is an owned JSON type compatible with the supported TipTap tree:

```ts
type RichTextDoc = {
  type: "doc"
  content: Array<RichTextNode>
}
```

The schema validates structural shape, not a closed list of supported node and
mark names. Renderer support must therefore be tested separately.

## Templates

```ts
type DocumentTemplateRef = {
  id: string
  version: number
  overrides?: Record<string, string | number | boolean | null>
}
```

Template identity and version are canonical. The current app also copies theme
tokens into `overrides` for preview. Production template changes should create
a new version instead of changing the meaning of an old reference.

## Assets

Assets are descriptors, not arbitrary remote URLs:

```ts
type DocumentAsset = {
  id: string
  kind: "logo" | "image" | "signature" | "qr"
  storageKey: string
  mimeType: string
  width?: number
  height?: number
  sha256?: string
}
```

Blocks refer to asset IDs. A future server/worker asset resolver must authorize
the storage key and return safe bytes or a controlled URL. Do not restore URL
attributes as the canonical asset identity.

## Versioning and migrations

There are three independent version axes:

- `schemaVersion` for aggregate changes.
- `composition.version` for composition conventions.
- `block.version` for block-local shapes.

Only version `1` is implemented. When version `2` is introduced:

1. Add a pure `v1ToV2(input)` migration.
2. Validate its output with the version-2 schema.
3. Keep fixtures for version 1.
4. Parse the envelope version before dispatching the migration.
5. Reject unsupported future versions without discarding unknown content.

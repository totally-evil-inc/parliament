# Parliament

## Package manager

- **Bun** (`>=1.1.0`), **not** pnpm/npm/yarn. Lockfile: `bun.lock`.
- `bun install` at root installs everything (Bun resolves `workspaces: ["apps/*", "packages/*"]`).
- The README mentions `pnpm dlx shadcn`; that's stale — use `bunx shadcn@latest`.

## Monorepo

- **Turborepo** orchestrates root scripts. Tasks: `build`, `dev`, `lint`, `format`, `typecheck`.
- Root commands: `bun run <task>` (forwards to turbo). Or `turbo <task>` directly.

## Architecture (three-layer)

```
apps/command  (TanStack Start + React, orchestration)
  → @workspace/document-editor  (TipTap+React, browser-only)
      → @workspace/document  (server-safe domain, zod only)
  → @workspace/database  (Drizzle ORM, PostgreSQL)
  → @workspace/ui  (shadcn/ui components)
```

- `@workspace/document` has **zero** React/DOM/TipTap deps — server-safe.
- `@workspace/document-editor` has **zero** knowledge of `apps/command` — enforced by boundary test.
- `@workspace/document-editor` owns the TipTap runtime; `apps/command` must **not** import `@tiptap/*` — enforced by boundary test.
- No package imports from `apps/command` back to itself — enforced by boundary test.

## Framework

- **TanStack Start** (not Next.js). Vite 7, TanStack Router, TanStack Query, TanStack Form.
- **Tailwind CSS v4** (`@tailwindcss/vite` plugin, NOT PostCSS-based postcss.config).
- `apps/auth` is a standalone **Bun + Hono** server (Better-Auth), port 4000.
- `apps/command` runs on port 3000.

## Key dev commands

| Action | Command |
|--------|---------|
| Dev servers (all) | `bun run dev` (turbo dev) |
| Dev command app | `bun --bun vite dev` (in `apps/command`) |
| Dev auth server | `bun --env-file=.env --hot src/index.ts` (in `apps/auth`) |
| Run all tests | `bun test` (from root runs all workspace tests) |
| Tests (single package) | `cd packages/document && bun test` |
| Typecheck all | `bun run typecheck` |
| Lint & format check | `bun run lint` (turbo lint → biome lint) |
| Format all files | `bun run format` (turbo format → biome format --write) |
| Full check + write | `bunx biome check --write .` |
| CI gate (read-only) | `bunx biome ci .` |
| DB migrate | `cd packages/database && bun run db:migrate` |
| DB generate | `cd packages/database && bun run db:generate` |

## Testing

- **Bun's built-in test runner** (`bun test`). No Jest/Vitest.
- Key test files: `packages/document/src/*.test.ts`, `packages/document-editor/src/**/*.test.ts`.
- **Boundary test** (`packages/document-editor/src/boundary.test.ts`) — enforces no `@/` or `apps/command` imports from editor, and no `@tiptap/` imports from command app.
- No integration/e2e tests. No Playwright.

## Canonical document model

- Business data (parties, dates, currency, pricing) lives **outside** TipTap JSON in structured `ProposalDraft` fields.
- `composition.blocks` (ordered `DocumentBlock[]`) is what TipTap edits.
- Money in **integer minor units** (not floats). Dates as `YYYY-MM-DD`.
- All input crossing a boundary passes a **Zod runtime parser**.
- New block = schema + editor adapter + read renderer + text extraction + tests.

## Hybrid model subpath exports

```
@workspace/document: . /schema /proposal /calculate /render /text /finalize /presentation
@workspace/document-editor: . /store /composition /components /definition /host /proposal /runtime /react /commands
@workspace/ui: ./globals.css ./lib/* ./components/* ./hooks/*
@workspace/database: .
```

## Styling convention

- All design tokens and component CSS live in `packages/ui/src/styles/globals.css` (`@layer base`, `@layer components`, `@layer utilities`).
- Components must **not** use hard-coded Tailwind values (e.g. `bg-white`, `text-gray-900`). Instead use CSS variable tokens mapped through `@theme inline` (e.g. `bg-background`, `text-foreground`, `border-border`).
- This keeps theming (light/dark mode) centralized and makes refactoring safe.

## Git conventions

- Commits are not frequent; no conventional commit standard enforced.
- `.env` files are gitignored. Auth requires `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` in `.env`.

## Known gaps

- Production `vite build` not verified in this environment — tests + typecheck are the CI gates.
- No durable persistence/autosave (store is in-memory, route-scoped).
- No Docker, no CI workflows, no Vercel deployment config.

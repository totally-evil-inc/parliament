# Parliament

## Bun Ecosystem (Runtime, Package Manager, Script & Test Runner)

This project exclusively uses **Bun** (`>=1.1.0`) across all developer workflows. Do **NOT** use `npm`, `npx`, `pnpm`, or `yarn`.

- **Package Manager**: Use `bun install` at the workspace root to install all dependencies. The lockfile is `bun.lock`.
- **Runtime**: Bun is the primary execution runtime (e.g. `bun src/index.ts`). It natively resolves imports, runs TypeScript out of the box, and automatically loads environment variables (e.g. from `.env` files).
- **Script Runner**: Run workspace or package-level tasks using `bun run <task>` (e.g., `bun run dev`, `bun run check`).
- **Dependency Executor**: Use `bunx <package>` (equivalent to `npx` / `pnpx`) to run CLI tools. For example, use `bunx shadcn@latest` instead of `pnpm dlx shadcn`.
- **Test Runner**: Use `bun test` as the built-in fast test runner instead of Jest or Vitest.

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
| Lint check (read-only) | `bun run lint` (turbo → biome lint on all 6 packages) |
| Full check (read-only) | `bun run check` (root `biome check`, scans everything) |
| Safe auto-fix | `bun run check:write` (root `biome check --write`) |
| Format all files | `bun run format` (turbo → biome format --write) |
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

## Logging

- Use `@workspace/logger` for all server-side and workspace logging.
- All new features, route handlers, or server functions going forward **MUST** implement structured logging conforming to the existing Pino-based logging setup.
- Follow the **Wide Events** (canonical log lines) pattern: consolidate execution metadata (timings, outcomes, authentication contexts, request IDs, and environment characteristics) into single structured logs at operation completion rather than scattering unstructured prints.

## Working with shadcn/ui Blocks

Throughout the lifetime of this project, we will periodically install `shadcn` blocks into the repository. Do **not** treat the generated code as production-ready architecture. The generated code is a reference implementation and should instead be considered raw material.

Rebuild it from scratch using the project's architectural conventions:
- Organize files and folders according to the feature/domain rather than mirroring the generated output.
- Extract reusable UI into shared components where appropriate.
- Create shell/layout components when a component is primarily responsible for composition.
- Separate presentation from business logic.
- Move state management, effects, and event handling into custom hooks whenever they improve clarity or reusability.
- Extract utility functions into appropriate utility modules.
- Remove duplication aggressively and improve naming.
- Ensure components have clear, single responsibilities.
- Follow existing project conventions before introducing new patterns.
- Reusability: Extract UI elements (buttons, cards, empty states, dialogs, drawers, etc.) if they have a reasonable chance of being reused.
- Maintainability: Favor small focused components, predictable file structures, minimal prop drilling, composition over configuration, and readability. Avoid creating "God components".
- Functional Equivalence: Rebuilt implementation must preserve the original functionality and user experience unless there is a clear improvement (e.g. accessibility, performance, cleaner state, types).

## Known gaps

- Production `vite build` not verified in this environment — tests + typecheck are the CI gates.
- No durable persistence/autosave (store is in-memory, route-scoped).
- No Docker, no CI workflows, no Vercel deployment config.

---

## Available Agent Skills

The following specialized skills are available to coding agents in this environment. Refer to their description or load their respective `SKILL.md` paths via `view_file` to employ them.

### Core & System
- **`antigravity-guide`** (`/home/muchiri/.gemini/antigravity-cli/builtin/skills/antigravity_guide/SKILL.md`): Quick reference and guide for Google Antigravity, including terminal CLI commands, slash commands, keybindings, and configuration.
- **`google-antigravity-sdk`** (`/home/muchiri/.gemini/config/plugins/google-antigravity-sdk/skills/google-antigravity-sdk/SKILL.md`): Designing, configuring, and orchestrating multi-agent systems using the Google Antigravity SDK.
- **`research`** (`/home/muchiri/.gemini/antigravity-cli/skills/research/SKILL.md`): Running complex, self-correcting research workflows across the codebase.
- **`find-skills`** (`/home/muchiri/.gemini/antigravity-cli/skills/find-skills/SKILL.md`): Discovering and installing relevant agent skills.
- **`full-output-enforcement`** (`/home/muchiri/.gemini/antigravity-cli/skills/full-output-enforcement/SKILL.md`): Disabling code truncation to ensure complete, production-ready outputs instead of placeholders.
- **`logging-best-practices`** (`/home/muchiri/.gemini/antigravity-cli/skills/logging-best-practices/SKILL.md`): Designing wide events and canonical log structures for logging and analytics.
- **`troubleshooting`** (`/home/muchiri/.gemini/config/plugins/chrome-devtools-plugin/skills/troubleshooting/SKILL.md`): Resolving Chrome DevTools connection issues and target failures.

### Frontend Aesthetics, Styling & UI Taste
- **`design-taste-frontend`** (`/home/muchiri/.gemini/antigravity-cli/skills/design-taste-frontend/SKILL.md`): Main frontend design guidance that avoids generic, templated designs by enforcing high-end layout choices, curated colors, typography, and bento grids.
- **`design-taste-frontend-v1`** (`/home/muchiri/.gemini/antigravity-cli/skills/design-taste-frontend-v1/SKILL.md`): Original v1 version of the design taste frontend skill.
- **`minimalist-ui`** (`/home/muchiri/.gemini/antigravity-cli/skills/minimalist-ui/SKILL.md`): Designing clean, editorial interfaces with warm monochrome colors, high typographic contrast, and muted pastels.
- **`industrial-brutalist-ui`** (`/home/muchiri/.gemini/antigravity-cli/skills/industrial-brutalist-ui/SKILL.md`): Grid-rigid print typography with mechanical terminal looks, high-contrast layouts, and analogue-style degradation effects.
- **`high-end-visual-design`** (`/home/muchiri/.gemini/antigravity-cli/skills/high-end-visual-design/SKILL.md`): Implementing shadows, borders, layout structures, and spacing that feel expensive and premium.
- **`frontend-design`** (`/home/muchiri/.gemini/antigravity-cli/skills/frontend-design/SKILL.md`): High-quality typographic scale selection, tracking, layout alignment, and color orchestration.
- **`redesign-existing-projects`** (`/home/muchiri/.gemini/antigravity-cli/skills/redesign-existing-projects/SKILL.md`): Refactoring and upgrading existing designs without breaking underlying application logic.
- **`stitch-design-taste`** (`/home/muchiri/.gemini/antigravity-cli/skills/stitch-design-taste/SKILL.md`): Guidelines for generating Stitch-compatible agent design configuration (`DESIGN.md`).

### Web Frameworks & Tools
- **`tanstack`** (`/home/muchiri/dev/bag/labs/parliament/.agents/skills/tanstack/SKILL.md`): Best practices for TanStack Router, TanStack Query, and TanStack Form inside the Parliament project.
- **`vercel-react-best-practices`** (`/home/muchiri/dev/bag/labs/parliament/.agents/skills/vercel-react-best-practices/SKILL.md`): Performance optimizations for React applications, component structure, rendering pipelines, and bundles.
- **`chrome-devtools`** (`/home/muchiri/.gemini/config/plugins/chrome-devtools-plugin/skills/chrome-devtools/SKILL.md`): Inspecting web structures, network activities, and debugging client-side errors via DevTools.
- **`chrome-extensions`** (`/home/muchiri/.gemini/config/plugins/modern-web-guidance-plugin/skills/chrome-extensions/SKILL.md`): Developing, debugging, and publishing Chrome Extensions using Manifest V3 guidelines.
- **`modern-web-guidance`** (`/home/muchiri/.gemini/config/plugins/modern-web-guidance-plugin/skills/modern-web-guidance/SKILL.md`): Reference search for modern APIs, container queries, `:has()`, and state-of-the-art browser capabilities.

### Motion, Transitions & Animation
- **`gsap-core`** (`/home/muchiri/.gemini/antigravity-cli/skills/gsap-core/SKILL.md`): Creating timelines, tweens, responsive matchMedia rules, and core GSAP interactions.
- **`gsap-frameworks`** (`/home/muchiri/.gemini/antigravity-cli/skills/gsap-frameworks/SKILL.md`): Setting up GSAP transitions safely within non-React environments like Vue or Svelte.
- **`gsap-react`** (`/home/muchiri/.gemini/antigravity-cli/skills/gsap-react/SKILL.md`): Working with GSAP's `useGSAP` hook, context targeting, and cleanup in React apps.
- **`gsap-scrolltrigger`** (`/home/muchiri/.gemini/antigravity-cli/skills/gsap-scrolltrigger/SKILL.md`): Creating scroll-linked animations, parallax effects, and pinning sections.
- **`gsap-timeline`** (`/home/muchiri/.gemini/antigravity-cli/skills/gsap-timeline/SKILL.md`): Choreographing sequence orders and timing offsets in complex animation paths.
- **`gsap-plugins`** (`/home/muchiri/.gemini/antigravity-cli/skills/gsap-plugins/SKILL.md`): Registering and using GSAP plugins (Flip, Draggable, ScrollSmoother, SplitText, etc.).
- **`gsap-utils`** (`/home/muchiri/.gemini/antigravity-cli/skills/gsap-utils/SKILL.md`): Using GSAP helpers like `clamp`, `mapRange`, `snap`, `random`, and interpolation functions.
- **`gsap-performance`** (`/home/muchiri/.gemini/antigravity-cli/skills/gsap-performance/SKILL.md`): Optimizing animations, hardware acceleration, avoiding layout thrashing, and using `will-change`.
- **`12-principles-of-animation`** (`/home/muchiri/.gemini/antigravity-cli/skills/12-principles-of-animation/SKILL.md`): Auditing UI animations against Disney's 12 principles of physical motion adjusted for web interfaces.
- **`animation-vocabulary`** (`/home/muchiri/.gemini/antigravity-cli/skills/animation-vocabulary/SKILL.md`): Glossary mapping informal UX descriptions (e.g. "bouncy menu opening") to exact animation terms.
- **`apple-design`** (`/home/muchiri/.gemini/antigravity-cli/skills/apple-design/SKILL.md`): Physical modeling, gesture-driven motion, spring coefficients, sheet transitions, and optical design.
- **`fixing-motion-performance`** (`/home/muchiri/.gemini/antigravity-cli/skills/fixing-motion-performance/SKILL.md`): Spotting and resolving compositor lag, scroll-linked delays, and visual animation jank.
- **`improve-animations`** (`/home/muchiri/.gemini/antigravity-cli/skills/improve-animations/SKILL.md`): Reviewing codebase motion quality as an expert advisor and planning motion updates.
- **`to-spring-or-not-to-spring`** (`/home/muchiri/.gemini/antigravity-cli/skills/to-spring-or-not-to-spring/SKILL.md`): Choosing appropriately between linear/ease curves and physical spring simulations.
- **`transitions-dev`** (`/home/muchiri/.gemini/antigravity-cli/skills/transitions-dev/SKILL.md`): Applying microinteractions, layout transitions, modal reveals, and form error shakes.
- **`text-to-lottie`** (`/home/muchiri/.gemini/antigravity-cli/skills/text-to-lottie/SKILL.md`): Customizing, editing, or fixing vector Lottie files played via Skia Skottie.

### Visual Audits, Copy & Prototyping Assets
- **`visual-auditor`** (`/home/muchiri/.gemini/antigravity-cli/skills/visual-auditor/SKILL.md`): Auditing landing page visual assets for relevancy, abstract vs. literal representation, and narrative fit.
- **`attention-architect`** (`/home/muchiri/.gemini/antigravity-cli/skills/attention-architect/SKILL.md`): Designing landing page layout narrative flow, scroll pacing, and directing visual interest.
- **`copy-auditor`** (`/home/muchiri/.gemini/antigravity-cli/skills/copy-auditor/SKILL.md`): Evaluating landing page copy structure, readability, and information density.
- **`editorial-designer`** (`/home/muchiri/.gemini/antigravity-cli/skills/editorial-designer/SKILL.md`): Creating visual rhythm, layouts, asymmetrical elements, and magazine-like text spacing.
- **`imagegen-frontend-web`** (`/home/muchiri/.gemini/antigravity-cli/skills/imagegen-frontend-web/SKILL.md`): Creating clean website mockups, single-section layout templates, and creative assets.
- **`imagegen-frontend-mobile`** (`/home/muchiri/.gemini/antigravity-cli/skills/imagegen-frontend-mobile/SKILL.md`): Generating mobile UI/UX layouts placed inside clean, high-end mobile mockups.
- **`image-to-code`** (`/home/muchiri/.gemini/antigravity-cli/skills/image-to-code/SKILL.md`): Creating assets and matching mockups to code with strict visual alignment.
- **`brandkit`** (`/home/muchiri/.gemini/antigravity-cli/skills/brandkit/SKILL.md`): Generating brand guideline boards, corporate identities, typography grids, and minimal mockup assets.
- **`a11y-debugging`** (`/home/muchiri/.gemini/config/plugins/chrome-devtools-plugin/skills/a11y-debugging/SKILL.md`): Conducting accessibility reviews, color contrast checks, tab-focus indicators, and ARIA audits.
- **`debug-optimize-lcp`** (`/home/muchiri/.gemini/config/plugins/chrome-devtools-plugin/skills/debug-optimize-lcp/SKILL.md`): Finding rendering blockages and speed improvements for Largest Contentful Paint (LCP).
- **`memory-leak-debugging`** (`/home/muchiri/.gemini/config/plugins/chrome-devtools-plugin/skills/memory-leak-debugging/SKILL.md`): Profiling JavaScript heaps, leak detection, and resolving Node or browser OOM errors.

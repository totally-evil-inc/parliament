# Refactor `apps/command` Structure And Names

## Summary

Reorganize the current `workspace/components` bucket into clearer role-based locations while keeping true workspace-domain names where they still mean "workspace." Keep the TanStack pathless route group `routes/_workspace` unchanged to avoid unnecessary route ID churn.

## Key Changes

- Add `src/layouts/` for app chrome:
  - `WorkspaceLayout` -> `AppShell`
  - `WorkspaceSidebar` -> `AppSidebar`
  - `PrimaryNav` -> `SidebarPrimaryNav`
  - `WorkspaceSearch` -> `SidebarSearch`
  - `WorkspaceUser` -> `AccountMenu`
  - keep `WorkspaceSwitcher` name because it is domain-specific.
- Add generic shared UI components:
  - `WorkspacePageHeader` -> `PageHeader` in `src/components/page-header.tsx`
  - `WorkspaceStat` -> `MetricCard` in `src/components/metric-card.tsx`
- Keep workspace settings under `src/features/workspace/settings/`, but remove noisy prefixes from component names:
  - `WorkspaceSettingsProvider` -> `SettingsProvider`
  - `useWorkspaceSettings` -> `useSettings`
  - `WorkspaceSettingsForm` -> `SettingsForm`
  - `WorkspaceSettingsActions` -> `SettingsActions`
  - `WorkspaceSettingsSection` -> `SettingsSection`
  - `WorkspaceSettingsPlaceholder` -> `SettingsPlaceholder`
  - `WorkspaceSettingsGeneral` -> `GeneralSettings`
- Keep workspace-domain config/types in `features/workspace/config.ts` and `features/workspace/settings.ts`, including `WorkspaceIdentity`, `WorkspaceNavItem`, and workspace tab types.

## Implementation Notes

- Update imports in `routes/_workspace/*` and settings routes to the new component paths.
- Do not change public URLs or the `routes/_workspace` directory.
- Let TanStack Router regenerate `routeTree.gen.ts` only if the tooling does it during checks; no manual edits unless needed.
- Keep behavior and styling unchanged; this is a naming and structure refactor, not a UI redesign.

## Follow-On Refactors

- Thin out auth route files so `routes/auth/*` only handles route wiring:
  - Move `AuthSplitLayout` to `src/layouts/auth-shell.tsx`.
  - Move sign-in page pieces to `src/features/auth/sign-in/components/`.
  - Move onboarding flow pieces to `src/features/auth/onboarding/`.
- Extract shared auth UI primitives:
  - Move duplicated or route-trapped `OrSeparator`, `OAuthButtons`, `GoogleIcon`, `AppleIcon`, and `TextField` into `src/features/auth/components/`.
  - Use names such as `AuthSeparator`, `SocialAuthButtons`, and `AuthTextField`.
- Split onboarding orchestration from presentation:
  - Move flow state, navigation, session checks, organization creation, and invite submission into a `useOnboardingFlow` hook.
  - Move session-storage draft handling into an `onboarding-draft.ts` helper.
  - Keep presentational steps as focused components: `OrganizationStep`, `AccountStep`, `InviteStep`, and `ReadyStep`.
- Revisit product-specific theme naming:
  - If "Orbit" is no longer intentional product language, rename `OrbitThemePreference`, `OrbitThemePalette`, and `orbit-theme*` storage keys to app-neutral or Command-specific names.
  - Keep a compatibility read path for old localStorage keys if preserving existing user preferences matters.
- Split workspace config by responsibility:
  - Separate shell/sidebar navigation config from workspace identity fixtures and dashboard/home metrics.
  - Keep domain types near workspace data, and keep shell nav models near layout/sidebar code.
- Keep generic dashboard UI out of the workspace feature:
  - Treat cards like `MetricCard` and any future dashboard summary components as shared UI unless they depend on workspace-specific data contracts.
- Avoid adding barrel files during the refactor:
  - Keep direct imports to preserve analyzable module paths and avoid accidental bundle broadening.

## Test Plan

- Run `bun --bun vite build` from `apps/command`.
- Run `bun --bun tsc --noEmit` or the app's `typecheck` script.
- Run `bun --bun eslint` or the app's `lint` script.
- Manually verify Home, Settings index, Settings tab routes, sidebar collapse behavior, workspace switcher, account menu, and theme menu still render.
- For auth follow-on refactors, manually verify sign-in, onboarding step navigation, draft persistence, organization creation, invite add/remove, OAuth button behavior, and the ready state.

## Assumptions

- "Workspace" should remain only for actual workspace/domain data and user-facing workspace actions.
- Layout/chrome components should be product/app role names, not domain names.
- No route path changes are desired in this refactor.

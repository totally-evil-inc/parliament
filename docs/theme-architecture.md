# Production Theme & Palette Architecture

## Overview
Parliament Command implements an ultra-defensive, zero-FOUC (Flash of Unstyled Content) theme and palette management system. It resolves user theme preferences (`light | dark | system`) and custom palette configurations before the browser's first paint, synchronizing state with a React runtime provider without route coupling or hydration mismatches.

---

## Key Invariants & Behavioral Contract

1. **Pre-Paint Resolution (Zero-FOUC)**:
   - Emits an inline, self-executing IIFE script via TanStack Router's `<ScriptOnce>` in the root document `<head>`.
   - Reads storage, validates preferences against whitelist tokens, queries OS media queries defensively, toggles `.dark` on `document.documentElement`, sets `document.documentElement.style.colorScheme`, and applies `data-palette`.
2. **Defensive Programming & Fail-Safe Degradation**:
   - Resilient against throwing `localStorage` (e.g. `SecurityError` in private browsing or sandboxed iframes).
   - Safe against missing or throwing `window.matchMedia`.
   - Safe on server-side rendering (SSR) environments with zero window/DOM leaks.
   - Transparent migration of legacy keys (`orbit-theme` → `command-theme`, `orbit-theme-palette` → `command-palette`).
3. **Synchronous React DOM Mutation**:
   - `ThemeProvider`'s `setPreference` and `setPalette` update `document.documentElement` synchronously *before* scheduling React state updates to eliminate visual lag.
4. **Cross-Tab Synchronization**:
   - Listens to window `storage` events (including `localStorage.clear()` where `event.key === null`) to synchronize theme and palette updates across open tabs in real-time.
5. **CSP Nonce Compliance**:
   - The `<ScriptOnce>` component natively receives CSP nonces when configured via `router.options.ssr?.nonce`.

---

## Architectural Structure

```
apps/command/src/
├── lib/themes/
│   ├── constants.ts        # Storage keys, legacy keys, DOM classes, and fallback defaults
│   ├── types.ts            # Type definitions & pure runtime type guards
│   ├── palettes.ts         # Palette definitions and re-exports
│   ├── contract.ts         # Pure theme resolution, guarded storage accessors, DOM mutation helpers
│   ├── bootstrap.ts        # Self-contained pre-paint script generator (IIFE string for ScriptOnce)
│   ├── contract.test.ts    # Comprehensive unit tests for contract logic & edge cases
│   └── bootstrap.test.ts   # Sandbox evaluation tests for pre-paint bootstrap script
├── components/
│   ├── theme-provider.tsx  # Runtime React provider, synchronous setters, media/storage listeners
│   ├── theme-provider.test.tsx # Unit tests for ThemeProvider & useTheme hook
│   ├── theme-toggle.tsx    # Button consumer toggling active theme
│   └── theme-toggle.test.tsx # Unit test for ThemeToggle
└── routes/__root.tsx       # Root shell emitting ScriptOnce and suppressHydrationWarning
```

---

## Storage & DOM Tokens

| Token | Type / Value | Description |
| :--- | :--- | :--- |
| **`command-theme`** | `"light" \| "dark" \| "system"` | Primary localStorage key for theme mode preference |
| **`command-palette`** | `"graphite" \| "indigo" \| "crimson" \| "sage" \| "amber" \| "violet"` | Primary localStorage key for palette preference |
| **`orbit-theme`** | Legacy string | Backwards-compatible legacy key migrated on read |
| **`orbit-theme-palette`** | Legacy string | Backwards-compatible legacy key migrated on read |
| **`.dark`** | CSS class on `<html>` | Activated when resolved theme is `"dark"` |
| **`data-palette`** | HTML attribute on `<html>` | Stores the active color palette identifier |
| **`style.colorScheme`** | `"light" \| "dark"` | Native CSS color scheme for scrollbars and browser controls |

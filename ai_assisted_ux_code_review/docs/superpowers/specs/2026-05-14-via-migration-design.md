# Via Design System Migration — Design Spec
**Date:** 2026-05-14
**Status:** Draft

---

## Context

The UX Review Copilot currently uses MongoDB's LeafyGreen design system (`@leafygreen-ui/*`) for all UI components. Via (`@via-ds/*`) is LeafyGreen 3.0 — MongoDB's next-generation design system. The goal is to swap all LeafyGreen components for their Via equivalents while keeping the existing two-column layout, spacing, and structure intact. Via's default theme (light mode, Via color tokens) replaces LeafyGreen's visual styling.

The tool's system prompt and review output continue to reference LeafyGreen — those recommendations target the product teams being reviewed, not this tool's own UI.

---

## Approach

File-by-file component swap. For each file, pull the exact Via component API from the Via MCP server before writing code. No guessing props or variants.

---

## Files Changed

### `package.json`
- **Add:** `@via-ds/components`, `@via-ds/icons`, `@via-ds/tokens`
- **Keep:** all `@leafygreen-ui/*` packages as fallback — Via is canary; LeafyGreen remains available if a Via component is missing or broken
- **Remove:** npm `overrides` block (was needed to force LeafyGreen to use React 19 — Via should not have this conflict)

### `app/globals.css`
- **Add:** `@import '@via-ds/components/index.css'` — Via component base styles
- **Add:** `@import '@via-ds/tokens/tailwind.css'` — Via design tokens as Tailwind v4 theme
- **Remove:** any LeafyGreen-specific CSS

### `app/providers.tsx`
- Swap `LeafyGreenProvider` → `ViaProvider` from `@via-ds/components/provider`

### `components/ArtifactInput.tsx`
| LeafyGreen | Via |
|---|---|
| `Tabs`, `Tab` from `@leafygreen-ui/tabs` | `Tabs` from `@via-ds/components/tabs` |
| `TextInput` from `@leafygreen-ui/text-input` | `TextField` from `@via-ds/components/text-field` |

### `components/ContextForm.tsx`
| LeafyGreen | Via |
|---|---|
| `TextArea` from `@leafygreen-ui/text-area` | `TextArea` from `@via-ds/components/text-area` |
| `TextInput` from `@leafygreen-ui/text-input` | `TextField` from `@via-ds/components/text-field` |

### `components/PackSelector.tsx`
| LeafyGreen | Via |
|---|---|
| `Checkbox` from `@leafygreen-ui/checkbox` | `Checkbox` from `@via-ds/components/checkbox` |
| `TextArea` from `@leafygreen-ui/text-area` | `TextArea` from `@via-ds/components/text-area` |

### `components/FindingCard.tsx`
| LeafyGreen | Via |
|---|---|
| `Card` from `@leafygreen-ui/card` | `Card` from `@via-ds/components/card` |
| `Badge` from `@leafygreen-ui/badge` | `Badge` from `@via-ds/components/badge` |
| `Body`, `InlineCode` from `@leafygreen-ui/typography` | `Text` from `@via-ds/components/typography` |

### `components/LoadingState.tsx`
| LeafyGreen | Via |
|---|---|
| `Spinner` from `@leafygreen-ui/loading-indicator` | `ProgressBar` from `@via-ds/components/progress-bar` |

### `components/ReviewResults.tsx`
| LeafyGreen | Via |
|---|---|
| `Banner` from `@leafygreen-ui/banner` | `Banner` from `@via-ds/components/banner` |
| `BasicEmptyState` from `@leafygreen-ui/empty-state` | `Card` + `Text` (Via has no EmptyState component) |
| `Badge` from `@leafygreen-ui/badge` | `Badge` from `@via-ds/components/badge` |
| `Body` from `@leafygreen-ui/typography` | `Text` from `@via-ds/components/typography` |

---

## Constraints

- Layout, two-column structure, and Tailwind spacing classes are unchanged
- No new features or behavior changes — pure component swap
- `React.ComponentType<any>` casts used for LeafyGreen JSX type incompatibility should be removed — Via is built for React 19
- The `overrides` block in `package.json` that forced LeafyGreen to use root React 19 should be removed since Via should not have this conflict

---

## Not in scope

- Dark mode / color scheme switching
- Layout redesign
- System prompt changes
- Testing infrastructure changes

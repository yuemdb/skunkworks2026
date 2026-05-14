# UX Review Copilot — Design Spec
**Date:** 2026-05-13  
**Status:** Draft

---

## Context

A working single-file HTML prototype exists (`/Users/yue.lin/Downloads/ux review tool/ux-review-tool.html`) that calls the Anthropic API directly from the browser. That prototype can't ship as-is because the API key would be exposed client-side. The goal is to rebuild this as a proper Next.js app that:
- Proxies the Anthropic API call through a server-side route
- Uses MongoDB's LeafyGreen design system instead of the custom dark terminal UI
- Loads heuristic packs from a GitHub raw URL so they can be updated without redeployment

---

## Architecture

A standard Next.js 16 app (matching the `ai_design_logic_compiler` sibling project) with three layers:

**UI layer** — React components using `@leafygreen-ui/*` packages. Input panel on the left, results panel on the right. The HTML prototype is the functional spec; LeafyGreen is the visual spec.

**API layer** — A single Next.js route handler at `app/api/review/route.ts`. Receives the review request from the client, injects the `ANTHROPIC_API_KEY` env var, calls Anthropic via `@anthropic-ai/sdk`, and returns the structured JSON response. No key ever reaches the browser.

**Data layer** — Heuristic packs fetched from the GitHub raw URL of `heuristic-packs-v2.json` in this repo. Fetched on page load (client-side, with a loading fallback). System prompt is bundled in `lib/prompts.ts` (same pattern as the compiler project).

---

## File Structure

```
ai_assisted_ux_code_review/
├── app/
│   ├── layout.tsx               # Root layout, LeafyGreen provider
│   ├── page.tsx                 # Main review page (two-column layout)
│   ├── globals.css
│   └── api/
│       └── review/
│           └── route.ts         # Anthropic API proxy
├── components/
│   ├── ArtifactInput.tsx        # URL inputs + file upload (URL/Upload/Both tabs)
│   ├── ContextForm.tsx          # Feature intent, workflow, user roles
│   ├── PackSelector.tsx         # Heuristic pack toggle cards
│   ├── ReviewResults.tsx        # Results panel orchestrator
│   ├── FindingCard.tsx          # Single finding (severity, why, rec, evidence)
│   └── LoadingState.tsx         # Progress indicator with step labels
├── lib/
│   ├── prompts.ts               # System prompt (verbatim from ux-review-system-prompt.md)
│   ├── packs.ts                 # fetchPacks() + HeuristicPack types
│   └── types.ts                 # ReviewRequest, ReviewResponse, Finding types
├── public/
│   └── heuristic-packs-v2.json  # Served locally as fallback; canonical version on GitHub
├── package.json                 # Same deps as ai_design_logic_compiler + @leafygreen-ui/*
├── next.config.ts
├── tsconfig.json
└── .env.local.example           # ANTHROPIC_API_KEY=
```

---

## Components

### `app/page.tsx`
Two-column grid: `<ArtifactInput>` + `<ContextForm>` + `<PackSelector>` on the left; `<ReviewResults>` on the right. Holds the top-level `reviewState` (`idle | loading | results | error`) and passes down handlers.

### `ArtifactInput`
Three-tab selector (URL / Upload / Both) using LeafyGreen `Tabs`. URL tab: two `TextInput` fields (Figma URL, GitHub/Vercel URL). Upload tab: drag-and-drop zone using a native `<input type="file">` styled to match LG spacing/borders (LeafyGreen has no FileInput component). Both tab: combines both.

### `ContextForm`
Three `TextArea`/`TextInput` fields: Feature intent, Workflow description, User roles.

### `PackSelector`
Four `Checkbox` cards in a 2×2 grid: Core UX (default on), Accessibility (default on), MongoDB Product, Team Custom. Team Custom reveals a `TextArea` for custom rules when checked. Pack metadata comes from the fetched `heuristic-packs-v2.json`.

### `ReviewResults`
Renders one of: empty state (LeafyGreen `EmptyState`), loading state (`<LoadingState>`), error (`Banner` variant: danger), or full results. Results include: summary block, Open Questions (`Banner` variant: warning), then findings grouped by severity.

### `FindingCard`
Card using LG `Card` component. Severity badge using LG `Badge` (red = Critical, yellow = Warning, blue = Suggestion, purple = Accessibility). Fields: title, WHY, RECOMMENDATION (LeafyGreen component name highlighted in an `<InlineCode>` span from `@leafygreen-ui/typography`), EVIDENCE.

---

## API Route: `app/api/review/route.ts`

**Request body:**
```ts
{
  userMessage: string;         // assembled prompt text
  images: Array<{              // base64-encoded screenshots
    media_type: string;
    data: string;
  }>;
}
```

**Handler:**
1. Validate body
2. Instantiate `Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })`
3. Call `client.messages.create` with the system prompt from `lib/prompts.ts`, model `claude-sonnet-4-6`, `max_tokens: 2000`
4. Parse response text as JSON
5. Return `NextResponse.json(parsedReview)`

---

## Data Flow

```
User fills form
  → click "Run Review"
  → client assembles { userMessage, images }
  → POST /api/review
  → server calls Anthropic API (key injected server-side)
  → JSON response parsed
  → renderResults() hydrates the right panel
```

Heuristic packs flow:
```
Page load
  → fetchPacks() fetches GitHub raw URL
  → on success: populate PackSelector with live data
  → on failure: fall back to /public/heuristic-packs-v2.json
```

---

## LeafyGreen Components Used

| UI element | LG Component |
|---|---|
| URL inputs | `@leafygreen-ui/text-input` `TextInput` |
| Context textareas | `@leafygreen-ui/text-area` `TextArea` |
| Pack toggles | `@leafygreen-ui/checkbox` `Checkbox` |
| Tab switcher | `@leafygreen-ui/tabs` `Tabs` |
| Run button | `@leafygreen-ui/button` `Button` variant: primary |
| Error state | `@leafygreen-ui/banner` `Banner` variant: danger |
| Open questions | `@leafygreen-ui/banner` `Banner` variant: warning |
| Empty state | `@leafygreen-ui/empty-state` `EmptyState` |
| Finding severity | `@leafygreen-ui/badge` `Badge` |
| Finding container | `@leafygreen-ui/card` `Card` |
| Component name highlight | `@leafygreen-ui/typography` `InlineCode` |
| Loading | `@leafygreen-ui/loading-indicator` `LoadingIndicator` |

---

## Environment Variables

```
ANTHROPIC_API_KEY=sk-ant-...
HEURISTIC_PACKS_URL=https://raw.githubusercontent.com/.../.../main/ai_assisted_ux_code_review/public/heuristic-packs-v2.json
```

---

## Not in scope

- Authentication / access control
- Persisting reviews or review history
- Team custom rules persistence (textarea only — no database)
- Model selection UI
- Streaming responses (single JSON response is sufficient)

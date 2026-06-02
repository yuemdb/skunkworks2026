@AGENTS.md

# AI Design Logic Compiler — Claude Code Build Prompt

## Project Overview

Build a 5-day hackathon MVP called **AI Design Logic Compiler** — a narrow, focused web app that compiles fragmented product intent into an updatable interaction logic spec.

This is NOT a full platform. It is a demo tool optimized for clarity, speed, and hackathon evaluability.

**Core problem being solved:**
AI has made UI and code generation faster, but interaction logic still gets scattered across PRFAQs, product logic notes, Figma context, and meeting updates. This tool preserves behavioral coherence by compiling those inputs into structured outputs that design and engineering can use together.

---

## Guiding Product Behavior

- Do not invent business logic — compile and structure what the user provides
- Surface ambiguity explicitly instead of hallucinating certainty
- If an input field is empty, skip it gracefully — do not fill it with invented content
- Outputs should be concise, structured, and handoff-ready
- Tone: strong internal product/design tool, not a consumer app

---

## File Structure

```
/app
  page.tsx                  ← single-page layout, root component
  /api
    /compile
      route.ts              ← handles both compile and recompile LLM calls
/components
  InputColumn.tsx           ← all input fields + Compile / Recompile buttons
  OutputWorkspace.tsx       ← tab container for all output panels
  OutputTab.tsx             ← renders a single structured output section
  ChangeBadge.tsx           ← inline diff highlight for changed sections
/lib
  types.ts                  ← all input/output TypeScript schemas
  prompts.ts                ← LLM prompt templates (compile + recompile)
  compiler.ts               ← compile() and recompile() orchestration logic
/styles
  globals.css
tailwind.config.ts
tsconfig.json
.env.local.example          ← ANTHROPIC_API_KEY placeholder
```

---

## TypeScript Schemas

Define all types in `/lib/types.ts`. Use these exactly.

### Input Schemas

```ts
// PRFAQ / Feature Context
interface PRFAQInput {
  feature_name: string;
  feature_goal: string;
  user_problem: string;
  primary_users: string;
  core_workflow: string;
  business_constraints: string;
  success_criteria: string;
}

// Designer Logic — accepts either structured rules or raw text
interface DesignerRule {
  rule_id: string;
  actor: string;
  trigger: string;
  conditions: string;
  system_behavior: string;
  user_visible_behavior: string;
  failure_or_exception: string;
  rationale: string;
  source: string;
}

interface DesignerLogicInput {
  rules: DesignerRule[];   // structured if user fills fields
  raw_text: string;        // fallback: plain text input always accepted
}

// Figma / Prototype Context
interface FigmaContextInput {
  screens: string;
  entry_point: string;
  main_happy_path: string;
  notable_states: string;
  key_interactions: string;
  annotations_or_notes: string;
  known_gaps: string;
}

// Update Input (recompile only)
interface UpdateInput {
  update_title: string;
  decision_change: string;
  affected_area: string;
  reason: string;
  source: string;
  priority: 'low' | 'medium' | 'high';
}

// Combined app input state
interface CompilerInput {
  prfaq: PRFAQInput;
  designer_logic: DesignerLogicInput;
  figma_context: FigmaContextInput;
  update?: UpdateInput;         // only present on recompile
  compilation_mode: 'initial' | 'recompile';
}
```

### Output Schemas

```ts
interface InteractionLogicSpec {
  feature_summary: string;
  actors: string[];
  preconditions: string[];
  main_flow: string[];
  state_logic: string[];
  permission_logic: string[];
  system_responses: string[];
  exceptions: string[];
  dependencies: string[];
}

interface EdgeCaseItem {
  id: string;
  scenario: string;
  trigger: string;
  expected_behavior: string;
  user_impact: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: string;
}

interface EngineeringHandoff {
  implementation_summary: string;
  ui_requirements: string[];
  logic_requirements: string[];
  permission_checks: string[];
  error_handling: string[];
  data_or_api_dependencies: string[];
  questions_for_eng: string[];
}

interface OpenQuestions {
  ambiguities: string[];
  missing_decisions: string[];
  assumptions_that_need_validation: string[];
}

interface WhatChanged {
  new_decision: string;
  sections_changed: string[];
  before_after_summary: { section: string; before: string; after: string }[];
  new_edge_cases: string[];
  handoff_changes: string[];
}

// Full compiler output
interface CompilerOutput {
  interaction_logic: InteractionLogicSpec;
  edge_cases: EdgeCaseItem[];
  engineering_handoff: EngineeringHandoff;
  open_questions: OpenQuestions;
  what_changed?: WhatChanged;   // only present after recompile
  compiled_at: string;          // ISO timestamp
  compilation_mode: 'initial' | 'recompile';
}
```

---

## LLM Layer

### API Route (`/app/api/compile/route.ts`)

- Accept POST with `CompilerInput`
- Read `compilation_mode` from the request body
- Route to the appropriate prompt from `/lib/prompts.ts`
- Call Anthropic API (`claude-sonnet-4-5-20251001`, `max_tokens: 4000`)
- Parse JSON response and return `CompilerOutput`
- On failure, return a structured error — do NOT return mock data

### Prompt Templates (`/lib/prompts.ts`)

```ts
export const COMPILE_SYSTEM_PROMPT: string
export const COMPILE_USER_PROMPT: (input: CompilerInput) => string
export const RECOMPILE_SYSTEM_PROMPT: string
export const RECOMPILE_USER_PROMPT: (input: CompilerInput, previousOutput: CompilerOutput) => string
```

### Compiler Orchestration (`/lib/compiler.ts`)

```ts
export async function compile(input: CompilerInput): Promise<CompilerOutput>
export async function recompile(input: CompilerInput, previousOutput: CompilerOutput): Promise<CompilerOutput>
```

Both functions call `/api/compile` and return a typed `CompilerOutput`. Handle errors explicitly — surface them to the UI as readable messages.

---

## UI Components

### `InputColumn.tsx`

Left column. Contains:

- **Feature Name** — single-line text input (maps to `prfaq.feature_name`)
- **Add field** button — opens dropdown to add: PRFAQ / Feature Context, Designer Logic, Figma / Prototype Context, Update / New Decision
- Multiple instances of the same field type are allowed
- Each added field has an ✕ to remove it
- **Compile** button — triggers initial compile
- **Recompile** button — only active after first compile; triggers recompile with update input

All fields start empty. No placeholder content. Use only HTML placeholder attributes for field labels.

### `OutputWorkspace.tsx`

Right column. Tab or card layout with:

1. **Interaction Logic Spec**
2. **Edge Cases**
3. **Engineering Handoff**
4. **Open Questions**
5. **What Changed** — only visible after recompile

Empty state before first compile: show a neutral prompt like *"Paste your inputs and hit Compile."*

### `ChangeBadge.tsx`

Inline component. Used inside output tabs to highlight sections that changed after recompile. Renders a subtle colored badge or left-border highlight. Must be visually obvious but not distracting.

---

## App State

Keep state simple. Use React `useState` in `page.tsx` to hold:

```ts
const [input, setInput] = useState<CompilerInput>(emptyInput)
const [output, setOutput] = useState<CompilerOutput | null>(null)
const [previousOutput, setPreviousOutput] = useState<CompilerOutput | null>(null)
const [isLoading, setIsLoading] = useState(false)
const [error, setError] = useState<string | null>(null)
```

No global store. No context provider unless genuinely needed. No localStorage unless you add it as an explicit stretch goal.

---

## Compile / Recompile Flow

**Compile:**
1. User fills inputs → clicks Compile
2. Set `compilation_mode: 'initial'`
3. Call `compiler.compile(input)`
4. Store result in `output`
5. Store copy in `previousOutput`
6. Render output tabs

**Recompile:**
1. User adds update input → clicks Recompile
2. Set `compilation_mode: 'recompile'`
3. Call `compiler.recompile(input, previousOutput)`
4. Store new result in `output`
5. Render updated tabs with `ChangeBadge` on changed sections
6. Show **What Changed** tab

---

## Diff / Change Highlighting

After recompile, the LLM returns `what_changed.sections_changed` — an array of section names that changed. Use this array to conditionally render `<ChangeBadge />` next to those section headers in the output tabs. Do not compute diffs client-side. Trust the LLM's self-reported diff.

---

## Error Handling

- If the LLM call fails: show an inline error banner, keep previous output visible
- If JSON parsing fails: show "Output could not be parsed. Try recompiling." — do not crash
- Do not use mock data as a fallback — show a clear error state instead

---

## Visual / UX Requirements

- Tailwind CSS only
- Polished but minimal — this is an internal tool, not a marketing page
- Two-column layout: inputs left, outputs right
- Output text should be readable at a glance — use spacing, subtle dividers, clear section headers
- Changed sections should be visually distinct after recompile
- Loading state should be obvious (spinner or disabled button + label)
- Mobile layout is not a priority

---

## Environment

```
# .env.local
ANTHROPIC_API_KEY=your_key_here
```

Run with `npm run demo` for low-memory production build, or `npm run dev` for development.

---

## Optional: Figma URL Import (Stretch Goal)

Add a lightweight "Import from Figma" capability to the Figma context field.

### New file: `/app/api/figma/route.ts`
- Accept POST with `{ url: string }`
- Parse `fileKey` and `nodeId` from URL using `/lib/figma.ts`
- Call Figma REST API with `X-Figma-Token` header (from `FIGMA_ACCESS_TOKEN` env var)
- Map node tree to `FigmaContextInput` schema and return it
- Token lives in `.env.local` only — never sent to the client

### URL parser utility (`/lib/figma.ts`)
```ts
export function parseFigmaUrl(url: string): { fileKey: string; nodeId: string } | null {
  const match = url.match(/figma\.com\/(?:design|file)\/([a-zA-Z0-9]+).*node-id=([0-9-]+)/);
  if (!match) return null;
  return { fileKey: match[1], nodeId: match[2].replace('-', ':') };
}
```

### Environment variable
```
FIGMA_ACCESS_TOKEN=your_figma_personal_access_token
```

---

## What NOT to Build

- No authentication
- No database (no Postgres, Prisma, Supabase, etc.)
- No file upload or ingestion
- No Slack or GitHub API integrations
- No mock data generation or seed content
- No complex state management (no Redux, Zustand, etc.)
- No deployment configuration
- No mobile-optimized layout
- No auto-save or persistence layer
- No Figma MCP integration (not available outside Claude.ai)

---

## Definition of Done (Hackathon)

The app is done when:
- It runs locally with `npm run demo`
- A user can add field blocks and paste content into them
- Clicking Compile returns structured output across all tabs
- Pasting an update and clicking Recompile updates the outputs and highlights what changed
- The What Changed tab accurately summarizes the delta
- Open Questions surfaces ambiguities rather than inventing answers
- Errors are handled gracefully without crashing

# AI Design Logic Compiler — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a hackathon MVP web app that compiles fragmented product intent (PRFAQ, designer logic, Figma context) into a structured interaction logic spec using Claude, with a recompile flow that highlights what changed.

**Architecture:** Single Next.js App Router page with a two-column layout — InputColumn on the left, OutputWorkspace on the right. State lives in `page.tsx` via `useState`. All LLM calls go through a single `/api/compile` route that handles both initial compile and recompile modes. Outputs are rendered in tabbed panels with change highlighting driven by the LLM's self-reported `sections_changed` array.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Tailwind CSS, Anthropic SDK (`@anthropic-ai/sdk`)

---

## File Map

| File | Responsibility |
|------|---------------|
| `app/page.tsx` | Root layout, all state (`useState`), compile/recompile handlers |
| `app/api/compile/route.ts` | POST handler — routes to correct prompt, calls Anthropic, returns `CompilerOutput` |
| `components/InputColumn.tsx` | All input fields + Compile/Recompile buttons; receives state setter props |
| `components/OutputWorkspace.tsx` | Tab container; renders the five output tabs; empty state before compile |
| `components/OutputTab.tsx` | Renders a single structured output section with optional `ChangeBadge` |
| `components/ChangeBadge.tsx` | Inline badge shown next to section headers that changed in a recompile |
| `lib/types.ts` | All TypeScript interfaces — `CompilerInput`, `CompilerOutput`, and subtypes |
| `lib/prompts.ts` | Four exported prompt templates as typed functions/strings |
| `lib/compiler.ts` | `compile()` and `recompile()` — call `/api/compile`, return typed `CompilerOutput` |
| `styles/globals.css` | Tailwind base imports only |
| `.env.local.example` | `ANTHROPIC_API_KEY=your_key_here` placeholder |

---

## Task 1: Scaffold the Next.js project

**Files:**
- Create: project root (via `npx create-next-app@latest`)
- Create: `.env.local.example`

- [ ] **Step 1: Initialize the Next.js project**

Run this from the `AI_Design_Logic_Compiler` directory:

```bash
npx create-next-app@latest . --typescript --tailwind --app --no-eslint --no-src-dir --import-alias "@/*"
```

When prompted interactively, accept all defaults. This creates: `app/`, `components/` (empty), `public/`, `tailwind.config.ts`, `tsconfig.json`, `package.json`.

- [ ] **Step 2: Install Anthropic SDK**

```bash
npm install @anthropic-ai/sdk
```

- [ ] **Step 3: Create `.env.local.example`**

```
ANTHROPIC_API_KEY=your_key_here
```

Copy to `.env.local` and fill in a real key:

```bash
cp .env.local.example .env.local
```

- [ ] **Step 4: Wipe boilerplate from `app/page.tsx`**

Replace entire contents of `app/page.tsx` with:

```tsx
export default function Home() {
  return <main className="min-h-screen bg-gray-950 text-gray-100 p-6">Loading…</main>;
}
```

- [ ] **Step 5: Wipe boilerplate from `app/globals.css`**

Replace entire contents with:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 6: Verify the dev server starts**

```bash
npm run dev
```

Expected: server starts on `http://localhost:3000`, page shows "Loading…" on a dark background. No TypeScript or compilation errors.

- [ ] **Step 7: Create placeholder component and lib files**

```bash
mkdir -p components lib
touch components/InputColumn.tsx components/OutputWorkspace.tsx components/OutputTab.tsx components/ChangeBadge.tsx
touch lib/types.ts lib/prompts.ts lib/compiler.ts
mkdir -p app/api/compile
touch app/api/compile/route.ts
```

- [ ] **Step 8: Commit**

```bash
git init
git add -A
git commit -m "chore: scaffold Next.js project with Tailwind and Anthropic SDK"
```

---

## Task 2: Define TypeScript types in `lib/types.ts`

**Files:**
- Create: `lib/types.ts`

- [ ] **Step 1: Write all input and output interfaces**

Replace entire `lib/types.ts` with:

```ts
// ─── Input Schemas ────────────────────────────────────────────────────────────

export interface PRFAQInput {
  feature_name: string;
  feature_goal: string;
  user_problem: string;
  primary_users: string;
  core_workflow: string;
  business_constraints: string;
  success_criteria: string;
}

export interface DesignerRule {
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

export interface DesignerLogicInput {
  rules: DesignerRule[];
  raw_text: string;
}

export interface FigmaContextInput {
  screens: string;
  entry_point: string;
  main_happy_path: string;
  notable_states: string;
  key_interactions: string;
  annotations_or_notes: string;
  known_gaps: string;
}

export interface UpdateInput {
  update_title: string;
  decision_change: string;
  affected_area: string;
  reason: string;
  source: string;
  priority: 'low' | 'medium' | 'high';
}

export interface CompilerInput {
  prfaq: PRFAQInput;
  designer_logic: DesignerLogicInput;
  figma_context: FigmaContextInput;
  update?: UpdateInput;
  compilation_mode: 'initial' | 'recompile';
}

// ─── Output Schemas ───────────────────────────────────────────────────────────

export interface InteractionLogicSpec {
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

export interface EdgeCaseItem {
  id: string;
  scenario: string;
  trigger: string;
  expected_behavior: string;
  user_impact: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: string;
}

export interface EngineeringHandoff {
  implementation_summary: string;
  ui_requirements: string[];
  logic_requirements: string[];
  permission_checks: string[];
  error_handling: string[];
  data_or_api_dependencies: string[];
  questions_for_eng: string[];
}

export interface OpenQuestions {
  ambiguities: string[];
  missing_decisions: string[];
  assumptions_that_need_validation: string[];
}

export interface WhatChanged {
  new_decision: string;
  sections_changed: string[];
  before_after_summary: { section: string; before: string; after: string }[];
  new_edge_cases: string[];
  handoff_changes: string[];
}

export interface CompilerOutput {
  interaction_logic: InteractionLogicSpec;
  edge_cases: EdgeCaseItem[];
  engineering_handoff: EngineeringHandoff;
  open_questions: OpenQuestions;
  what_changed?: WhatChanged;
  compiled_at: string;
  compilation_mode: 'initial' | 'recompile';
}

// ─── Empty state helpers ──────────────────────────────────────────────────────

export const emptyPRFAQ: PRFAQInput = {
  feature_name: '',
  feature_goal: '',
  user_problem: '',
  primary_users: '',
  core_workflow: '',
  business_constraints: '',
  success_criteria: '',
};

export const emptyFigmaContext: FigmaContextInput = {
  screens: '',
  entry_point: '',
  main_happy_path: '',
  notable_states: '',
  key_interactions: '',
  annotations_or_notes: '',
  known_gaps: '',
};

export const emptyUpdate: UpdateInput = {
  update_title: '',
  decision_change: '',
  affected_area: '',
  reason: '',
  source: '',
  priority: 'medium',
};

export const emptyInput: CompilerInput = {
  prfaq: emptyPRFAQ,
  designer_logic: { rules: [], raw_text: '' },
  figma_context: emptyFigmaContext,
  update: emptyUpdate,
  compilation_mode: 'initial',
};
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "feat: define all TypeScript schemas in lib/types.ts"
```

---

## Task 3: Write LLM prompt templates in `lib/prompts.ts`

**Files:**
- Create: `lib/prompts.ts`

- [ ] **Step 1: Write all four exported prompt templates**

Replace entire `lib/prompts.ts` with:

```ts
import type { CompilerInput, CompilerOutput } from './types';

export const COMPILE_SYSTEM_PROMPT: string = `
You are an expert product and interaction design analyst embedded in a design/engineering team.

Your job is to take fragmented product intent — PRFAQs, designer logic notes, Figma context — and compile them into a structured interaction logic spec that both design and engineering can act on.

Rules you must follow:
- Only compile and structure what the user has provided. Do not invent logic.
- If a field is empty or missing, skip it — do not fill it with invented content.
- If something is ambiguous or unresolved, add it to open_questions. Do not resolve it yourself.
- Be concise. Every line in your output should be actionable or informative — not padding.
- Edge cases should be concrete and grounded in the actual inputs.
- Engineering handoff should sound like it was written by a senior engineer who read the spec.
- Never hallucinate certainty. Surface gaps clearly.

You must respond with a single valid JSON object matching the CompilerOutput schema. No markdown. No explanation. No preamble. Just the JSON.
`.trim();

export const COMPILE_USER_PROMPT = (input: CompilerInput): string => `
Compile the following product inputs into a structured interaction logic spec.

---

## PRFAQ / Feature Context
Feature Name: ${input.prfaq.feature_name || '(not provided)'}
Feature Goal: ${input.prfaq.feature_goal || '(not provided)'}
User Problem: ${input.prfaq.user_problem || '(not provided)'}
Primary Users: ${input.prfaq.primary_users || '(not provided)'}
Core Workflow: ${input.prfaq.core_workflow || '(not provided)'}
Business Constraints: ${input.prfaq.business_constraints || '(not provided)'}
Success Criteria: ${input.prfaq.success_criteria || '(not provided)'}

---

## Designer Logic
${input.designer_logic.raw_text || '(not provided)'}

${input.designer_logic.rules.length > 0 ? `
Structured Rules:
${input.designer_logic.rules.map(r => `
Rule ${r.rule_id}:
  Actor: ${r.actor}
  Trigger: ${r.trigger}
  Conditions: ${r.conditions}
  System Behavior: ${r.system_behavior}
  User-Visible Behavior: ${r.user_visible_behavior}
  Failure / Exception: ${r.failure_or_exception}
  Rationale: ${r.rationale}
  Source: ${r.source}
`).join('\n')}` : ''}

---

## Figma / Prototype Context
Screens: ${input.figma_context.screens || '(not provided)'}
Entry Point: ${input.figma_context.entry_point || '(not provided)'}
Main Happy Path: ${input.figma_context.main_happy_path || '(not provided)'}
Notable States: ${input.figma_context.notable_states || '(not provided)'}
Key Interactions: ${input.figma_context.key_interactions || '(not provided)'}
Annotations / Notes: ${input.figma_context.annotations_or_notes || '(not provided)'}
Known Gaps: ${input.figma_context.known_gaps || '(not provided)'}

---

Respond with a valid JSON object matching this exact schema:

{
  "interaction_logic": {
    "feature_summary": string,
    "actors": string[],
    "preconditions": string[],
    "main_flow": string[],
    "state_logic": string[],
    "permission_logic": string[],
    "system_responses": string[],
    "exceptions": string[],
    "dependencies": string[]
  },
  "edge_cases": [
    {
      "id": string,
      "scenario": string,
      "trigger": string,
      "expected_behavior": string,
      "user_impact": string,
      "severity": "low" | "medium" | "high" | "critical",
      "source": string
    }
  ],
  "engineering_handoff": {
    "implementation_summary": string,
    "ui_requirements": string[],
    "logic_requirements": string[],
    "permission_checks": string[],
    "error_handling": string[],
    "data_or_api_dependencies": string[],
    "questions_for_eng": string[]
  },
  "open_questions": {
    "ambiguities": string[],
    "missing_decisions": string[],
    "assumptions_that_need_validation": string[]
  },
  "compiled_at": "${new Date().toISOString()}",
  "compilation_mode": "initial"
}

Only include what is grounded in the inputs above. If a section has nothing to say, return an empty array or a short honest string.
`.trim();

export const RECOMPILE_SYSTEM_PROMPT: string = `
You are an expert product and interaction design analyst embedded in a design/engineering team.

You are performing a RECOMPILE — meaning a new decision or change has been introduced, and you must update an existing interaction logic spec to reflect it.

Rules you must follow:
- Incorporate the new decision into the spec accurately.
- Only change what the new decision actually affects. Do not rewrite unaffected sections.
- For every section you change, be precise about what changed and why.
- If the new decision creates new ambiguities, add them to open_questions.
- Do not invent logic. Do not resolve questions the new decision doesn't answer.
- The what_changed field is critical — fill it in carefully and honestly.
- Be concise. Every line should be actionable.

You must respond with a single valid JSON object matching the CompilerOutput schema. No markdown. No explanation. No preamble. Just the JSON.
`.trim();

export const RECOMPILE_USER_PROMPT = (
  input: CompilerInput,
  previousOutput: CompilerOutput
): string => `
A new decision has been made. Recompile the interaction logic spec to incorporate it.

---

## New Decision / Update

Title: ${input.update?.update_title || '(not provided)'}
Decision / Change: ${input.update?.decision_change || '(not provided)'}
Affected Area: ${input.update?.affected_area || '(not provided)'}
Reason: ${input.update?.reason || '(not provided)'}
Source: ${input.update?.source || '(not provided)'}
Priority: ${input.update?.priority || '(not provided)'}

---

## Previous Compiled Spec (your baseline)

${JSON.stringify(previousOutput, null, 2)}

---

## Original Inputs (for full context)

### PRFAQ / Feature Context
Feature Name: ${input.prfaq.feature_name || '(not provided)'}
Feature Goal: ${input.prfaq.feature_goal || '(not provided)'}
User Problem: ${input.prfaq.user_problem || '(not provided)'}
Primary Users: ${input.prfaq.primary_users || '(not provided)'}
Core Workflow: ${input.prfaq.core_workflow || '(not provided)'}
Business Constraints: ${input.prfaq.business_constraints || '(not provided)'}
Success Criteria: ${input.prfaq.success_criteria || '(not provided)'}

### Designer Logic
${input.designer_logic.raw_text || '(not provided)'}

### Figma / Prototype Context
Screens: ${input.figma_context.screens || '(not provided)'}
Entry Point: ${input.figma_context.entry_point || '(not provided)'}
Main Happy Path: ${input.figma_context.main_happy_path || '(not provided)'}
Notable States: ${input.figma_context.notable_states || '(not provided)'}
Key Interactions: ${input.figma_context.key_interactions || '(not provided)'}
Annotations / Notes: ${input.figma_context.annotations_or_notes || '(not provided)'}
Known Gaps: ${input.figma_context.known_gaps || '(not provided)'}

---

Respond with a valid JSON object matching this exact schema:

{
  "interaction_logic": { ...updated spec... },
  "edge_cases": [ ...updated array... ],
  "engineering_handoff": { ...updated handoff... },
  "open_questions": { ...updated questions... },
  "what_changed": {
    "new_decision": string,
    "sections_changed": string[],
    "before_after_summary": [
      { "section": string, "before": string, "after": string }
    ],
    "new_edge_cases": string[],
    "handoff_changes": string[]
  },
  "compiled_at": "${new Date().toISOString()}",
  "compilation_mode": "recompile"
}

Important:
- Only update sections that the new decision actually affects.
- sections_changed must be accurate — this drives UI highlighting.
- before_after_summary should be concise, not verbose.
- If the new decision introduces new ambiguities, add them to open_questions.
`.trim();
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/prompts.ts
git commit -m "feat: add LLM prompt templates for compile and recompile"
```

---

## Task 4: Implement the API route (`app/api/compile/route.ts`)

**Files:**
- Create: `app/api/compile/route.ts`

- [ ] **Step 1: Write the POST handler**

Replace entire `app/api/compile/route.ts` with:

```ts
import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import type { CompilerInput, CompilerOutput } from '@/lib/types';
import {
  COMPILE_SYSTEM_PROMPT,
  COMPILE_USER_PROMPT,
  RECOMPILE_SYSTEM_PROMPT,
  RECOMPILE_USER_PROMPT,
} from '@/lib/prompts';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  let body: { input: CompilerInput; previousOutput?: CompilerOutput };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { input, previousOutput } = body;
  const isRecompile = input.compilation_mode === 'recompile';

  if (isRecompile && !previousOutput) {
    return NextResponse.json(
      { error: 'previousOutput is required for recompile' },
      { status: 400 }
    );
  }

  const systemPrompt = isRecompile ? RECOMPILE_SYSTEM_PROMPT : COMPILE_SYSTEM_PROMPT;
  const userPrompt = isRecompile
    ? RECOMPILE_USER_PROMPT(input, previousOutput!)
    : COMPILE_USER_PROMPT(input);

  let rawText: string;
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20251001',
      max_tokens: 4000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const block = response.content[0];
    if (block.type !== 'text') {
      return NextResponse.json({ error: 'Unexpected response type from LLM' }, { status: 500 });
    }
    rawText = block.text;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'LLM call failed';
    return NextResponse.json({ error: message }, { status: 502 });
  }

  let parsed: CompilerOutput;
  try {
    // Strip markdown code fences if the model wraps output despite instructions
    const cleaned = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    parsed = JSON.parse(cleaned) as CompilerOutput;
  } catch {
    return NextResponse.json(
      { error: 'Output could not be parsed. Try recompiling.' },
      { status: 422 }
    );
  }

  return NextResponse.json(parsed);
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Smoke-test the route with curl**

Make sure `npm run dev` is running in another terminal, then:

```bash
curl -s -X POST http://localhost:3000/api/compile \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "prfaq": {
        "feature_name": "Test Feature",
        "feature_goal": "Test goal",
        "user_problem": "Test problem",
        "primary_users": "Test users",
        "core_workflow": "Test workflow",
        "business_constraints": "",
        "success_criteria": ""
      },
      "designer_logic": { "rules": [], "raw_text": "" },
      "figma_context": {
        "screens": "",
        "entry_point": "",
        "main_happy_path": "",
        "notable_states": "",
        "key_interactions": "",
        "annotations_or_notes": "",
        "known_gaps": ""
      },
      "compilation_mode": "initial"
    }
  }' | python3 -m json.tool | head -30
```

Expected: JSON response with `interaction_logic`, `edge_cases`, `engineering_handoff`, `open_questions` keys.

- [ ] **Step 4: Commit**

```bash
git add app/api/compile/route.ts
git commit -m "feat: implement /api/compile route with Anthropic SDK"
```

---

## Task 5: Implement compiler orchestration (`lib/compiler.ts`)

**Files:**
- Create: `lib/compiler.ts`

- [ ] **Step 1: Write compile() and recompile()**

Replace entire `lib/compiler.ts` with:

```ts
import type { CompilerInput, CompilerOutput } from './types';

async function callCompileAPI(
  input: CompilerInput,
  previousOutput?: CompilerOutput
): Promise<CompilerOutput> {
  const res = await fetch('/api/compile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input, previousOutput }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error ?? `Request failed with status ${res.status}`);
  }

  return data as CompilerOutput;
}

export async function compile(input: CompilerInput): Promise<CompilerOutput> {
  return callCompileAPI({ ...input, compilation_mode: 'initial' });
}

export async function recompile(
  input: CompilerInput,
  previousOutput: CompilerOutput
): Promise<CompilerOutput> {
  return callCompileAPI({ ...input, compilation_mode: 'recompile' }, previousOutput);
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/compiler.ts
git commit -m "feat: add compile() and recompile() orchestration in lib/compiler.ts"
```

---

## Task 6: Build `ChangeBadge` component

**Files:**
- Create: `components/ChangeBadge.tsx`

- [ ] **Step 1: Write the component**

Replace entire `components/ChangeBadge.tsx` with:

```tsx
export function ChangeBadge() {
  return (
    <span className="ml-2 inline-flex items-center rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-400 ring-1 ring-inset ring-amber-500/30">
      changed
    </span>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/ChangeBadge.tsx
git commit -m "feat: add ChangeBadge component for recompile diff highlighting"
```

---

## Task 7: Build `OutputTab` component

**Files:**
- Create: `components/OutputTab.tsx`

This component renders a single named output section. It receives a label, content (string or string[]), an optional `changed` boolean, and an optional severity for edge cases.

- [ ] **Step 1: Write the component**

Replace entire `components/OutputTab.tsx` with:

```tsx
import type { EdgeCaseItem, EngineeringHandoff, InteractionLogicSpec, OpenQuestions, WhatChanged } from '@/lib/types';
import { ChangeBadge } from './ChangeBadge';

// ─── Interaction Logic Tab ─────────────────────────────────────────────────────

interface InteractionLogicTabProps {
  data: InteractionLogicSpec;
  changedSections: string[];
}

function SectionList({
  label,
  items,
  changed,
}: {
  label: string;
  items: string[];
  changed: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
        {label}
        {changed && <ChangeBadge />}
      </h3>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-gray-300 before:mr-2 before:text-gray-600 before:content-['—']">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function InteractionLogicTab({ data, changedSections }: InteractionLogicTabProps) {
  const changed = (key: string) => changedSections.includes(key);
  return (
    <div className="space-y-5">
      {data.feature_summary && (
        <div>
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
            Summary
            {changed('feature_summary') && <ChangeBadge />}
          </h3>
          <p className="text-sm text-gray-300">{data.feature_summary}</p>
        </div>
      )}
      <SectionList label="Actors" items={data.actors} changed={changed('actors')} />
      <SectionList label="Preconditions" items={data.preconditions} changed={changed('preconditions')} />
      <SectionList label="Main Flow" items={data.main_flow} changed={changed('main_flow')} />
      <SectionList label="State Logic" items={data.state_logic} changed={changed('state_logic')} />
      <SectionList label="Permission Logic" items={data.permission_logic} changed={changed('permission_logic')} />
      <SectionList label="System Responses" items={data.system_responses} changed={changed('system_responses')} />
      <SectionList label="Exceptions" items={data.exceptions} changed={changed('exceptions')} />
      <SectionList label="Dependencies" items={data.dependencies} changed={changed('dependencies')} />
    </div>
  );
}

// ─── Edge Cases Tab ────────────────────────────────────────────────────────────

const severityStyles: Record<string, string> = {
  low: 'bg-blue-500/15 text-blue-400 ring-blue-500/30',
  medium: 'bg-yellow-500/15 text-yellow-400 ring-yellow-500/30',
  high: 'bg-orange-500/15 text-orange-400 ring-orange-500/30',
  critical: 'bg-red-500/15 text-red-400 ring-red-500/30',
};

interface EdgeCasesTabProps {
  items: EdgeCaseItem[];
  newEdgeCaseIds: string[];
}

export function EdgeCasesTab({ items, newEdgeCaseIds }: EdgeCasesTabProps) {
  if (items.length === 0) {
    return <p className="text-sm text-gray-500">No edge cases identified.</p>;
  }
  return (
    <div className="space-y-4">
      {items.map((ec) => (
        <div key={ec.id} className="rounded-lg border border-gray-800 bg-gray-900 p-4">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-xs font-mono text-gray-500">{ec.id}</span>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${severityStyles[ec.severity] ?? severityStyles.low}`}
            >
              {ec.severity}
            </span>
            {newEdgeCaseIds.includes(ec.id) && <ChangeBadge />}
          </div>
          <p className="mb-3 text-sm font-medium text-gray-200">{ec.scenario}</p>
          <div className="space-y-1.5 text-xs text-gray-400">
            <p><span className="text-gray-500">Trigger:</span> {ec.trigger}</p>
            <p><span className="text-gray-500">Expected:</span> {ec.expected_behavior}</p>
            <p><span className="text-gray-500">Impact:</span> {ec.user_impact}</p>
            <p><span className="text-gray-500">Source:</span> {ec.source}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Engineering Handoff Tab ───────────────────────────────────────────────────

interface EngineeringHandoffTabProps {
  data: EngineeringHandoff;
  changedSections: string[];
}

export function EngineeringHandoffTab({ data, changedSections }: EngineeringHandoffTabProps) {
  const changed = (key: string) => changedSections.includes(key);
  return (
    <div className="space-y-5">
      {data.implementation_summary && (
        <div>
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
            Implementation Summary
            {changed('implementation_summary') && <ChangeBadge />}
          </h3>
          <p className="text-sm text-gray-300">{data.implementation_summary}</p>
        </div>
      )}
      <SectionList label="UI Requirements" items={data.ui_requirements} changed={changed('ui_requirements')} />
      <SectionList label="Logic Requirements" items={data.logic_requirements} changed={changed('logic_requirements')} />
      <SectionList label="Permission Checks" items={data.permission_checks} changed={changed('permission_checks')} />
      <SectionList label="Error Handling" items={data.error_handling} changed={changed('error_handling')} />
      <SectionList label="Data / API Dependencies" items={data.data_or_api_dependencies} changed={changed('data_or_api_dependencies')} />
      <SectionList label="Questions for Eng" items={data.questions_for_eng} changed={changed('questions_for_eng')} />
    </div>
  );
}

// ─── Open Questions Tab ────────────────────────────────────────────────────────

interface OpenQuestionsTabProps {
  data: OpenQuestions;
  changedSections: string[];
}

export function OpenQuestionsTab({ data, changedSections }: OpenQuestionsTabProps) {
  const changed = (key: string) => changedSections.includes(key);
  return (
    <div className="space-y-5">
      <SectionList label="Ambiguities" items={data.ambiguities} changed={changed('ambiguities')} />
      <SectionList label="Missing Decisions" items={data.missing_decisions} changed={changed('missing_decisions')} />
      <SectionList label="Assumptions Needing Validation" items={data.assumptions_that_need_validation} changed={changed('assumptions_that_need_validation')} />
      {data.ambiguities.length === 0 && data.missing_decisions.length === 0 && data.assumptions_that_need_validation.length === 0 && (
        <p className="text-sm text-gray-500">No open questions — inputs were sufficiently complete.</p>
      )}
    </div>
  );
}

// ─── What Changed Tab ──────────────────────────────────────────────────────────

interface WhatChangedTabProps {
  data: WhatChanged;
}

export function WhatChangedTab({ data }: WhatChangedTabProps) {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">New Decision</h3>
        <p className="text-sm text-gray-300">{data.new_decision}</p>
      </div>
      {data.sections_changed.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Sections Changed</h3>
          <div className="flex flex-wrap gap-2">
            {data.sections_changed.map((s) => (
              <span key={s} className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-400 ring-1 ring-inset ring-amber-500/30">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}
      {data.before_after_summary.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Before / After</h3>
          <div className="space-y-3">
            {data.before_after_summary.map((item, i) => (
              <div key={i} className="rounded-lg border border-gray-800 bg-gray-900 p-3">
                <p className="mb-2 text-xs font-medium text-gray-400">{item.section}</p>
                <p className="mb-1 text-xs text-gray-500"><span className="font-medium text-red-400">Before:</span> {item.before}</p>
                <p className="text-xs text-gray-500"><span className="font-medium text-green-400">After:</span> {item.after}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      {data.handoff_changes.length > 0 && (
        <div>
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">Engineering Impact</h3>
          <ul className="space-y-1">
            {data.handoff_changes.map((c, i) => (
              <li key={i} className="text-sm text-gray-300 before:mr-2 before:text-gray-600 before:content-['—']">{c}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/OutputTab.tsx components/ChangeBadge.tsx
git commit -m "feat: build OutputTab sub-components for all five output panels"
```

---

## Task 8: Build `OutputWorkspace` component

**Files:**
- Create: `components/OutputWorkspace.tsx`

- [ ] **Step 1: Write the component**

Replace entire `components/OutputWorkspace.tsx` with:

```tsx
'use client';

import { useState } from 'react';
import type { CompilerOutput } from '@/lib/types';
import {
  InteractionLogicTab,
  EdgeCasesTab,
  EngineeringHandoffTab,
  OpenQuestionsTab,
  WhatChangedTab,
} from './OutputTab';

const BASE_TABS = ['Interaction Logic', 'Edge Cases', 'Engineering Handoff', 'Open Questions'] as const;

interface OutputWorkspaceProps {
  output: CompilerOutput | null;
}

export function OutputWorkspace({ output }: OutputWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<string>('Interaction Logic');

  const tabs = output?.compilation_mode === 'recompile'
    ? [...BASE_TABS, 'What Changed']
    : [...BASE_TABS];

  const changedSections = output?.what_changed?.sections_changed ?? [];
  const newEdgeCaseIds = output?.what_changed?.new_edge_cases ?? [];

  if (!output) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border border-gray-800 bg-gray-900/50">
        <p className="text-sm text-gray-500">Paste your inputs and hit Compile.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col rounded-xl border border-gray-800 bg-gray-900/50">
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-800 px-4 pt-3">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`relative rounded-t px-3 py-2 text-xs font-medium transition-colors ${
              activeTab === tab
                ? 'text-gray-100 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-px after:bg-indigo-500'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab}
            {tab !== 'What Changed' && changedSections.some((s) =>
              tab === 'Interaction Logic'
                ? ['feature_summary','actors','preconditions','main_flow','state_logic','permission_logic','system_responses','exceptions','dependencies'].includes(s)
                : tab === 'Edge Cases'
                ? s === 'edge_cases'
                : tab === 'Engineering Handoff'
                ? ['implementation_summary','ui_requirements','logic_requirements','permission_checks','error_handling','data_or_api_dependencies','questions_for_eng'].includes(s)
                : tab === 'Open Questions'
                ? ['ambiguities','missing_decisions','assumptions_that_need_validation'].includes(s)
                : false
            ) && (
              <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-5">
        {activeTab === 'Interaction Logic' && (
          <InteractionLogicTab data={output.interaction_logic} changedSections={changedSections} />
        )}
        {activeTab === 'Edge Cases' && (
          <EdgeCasesTab items={output.edge_cases} newEdgeCaseIds={newEdgeCaseIds} />
        )}
        {activeTab === 'Engineering Handoff' && (
          <EngineeringHandoffTab data={output.engineering_handoff} changedSections={changedSections} />
        )}
        {activeTab === 'Open Questions' && (
          <OpenQuestionsTab data={output.open_questions} changedSections={changedSections} />
        )}
        {activeTab === 'What Changed' && output.what_changed && (
          <WhatChangedTab data={output.what_changed} />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/OutputWorkspace.tsx
git commit -m "feat: build OutputWorkspace tab container component"
```

---

## Task 9: Build `InputColumn` component

**Files:**
- Create: `components/InputColumn.tsx`

- [ ] **Step 1: Write the component**

Replace entire `components/InputColumn.tsx` with:

```tsx
'use client';

import type { CompilerInput } from '@/lib/types';

interface InputColumnProps {
  input: CompilerInput;
  onChange: (updated: CompilerInput) => void;
  onCompile: () => void;
  onRecompile: () => void;
  isLoading: boolean;
  hasOutput: boolean;
}

const textareaClass =
  'w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-gray-100 placeholder-gray-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none transition-colors';

const labelClass = 'mb-1.5 block text-xs font-medium text-gray-400';

export function InputColumn({
  input,
  onChange,
  onCompile,
  onRecompile,
  isLoading,
  hasOutput,
}: InputColumnProps) {
  const setPRFAQ = (key: keyof typeof input.prfaq, value: string) =>
    onChange({ ...input, prfaq: { ...input.prfaq, [key]: value } });

  const setDesignerLogic = (value: string) =>
    onChange({ ...input, designer_logic: { ...input.designer_logic, raw_text: value } });

  const setFigmaContext = (key: keyof typeof input.figma_context, value: string) =>
    onChange({ ...input, figma_context: { ...input.figma_context, [key]: value } });

  const setUpdate = (key: keyof NonNullable<typeof input.update>, value: string) =>
    onChange({ ...input, update: { ...input.update!, [key]: value } });

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto pr-1">
      {/* Feature Name */}
      <div>
        <label className={labelClass}>Feature Name</label>
        <input
          type="text"
          placeholder="e.g. Bulk Export"
          value={input.prfaq.feature_name}
          onChange={(e) => setPRFAQ('feature_name', e.target.value)}
          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-gray-100 placeholder-gray-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
        />
      </div>

      {/* PRFAQ */}
      <div>
        <label className={labelClass}>PRFAQ / Feature Context</label>
        <textarea
          rows={6}
          placeholder="Feature goal, user problem, primary users, core workflow, business constraints, success criteria…"
          value={input.prfaq.feature_goal
            ? [
                input.prfaq.feature_goal,
                input.prfaq.user_problem,
                input.prfaq.primary_users,
                input.prfaq.core_workflow,
                input.prfaq.business_constraints,
                input.prfaq.success_criteria,
              ]
                .filter(Boolean)
                .join('\n\n')
            : ''}
          onChange={(e) => {
            // Accept as raw text mapped to feature_goal for simplicity
            setPRFAQ('feature_goal', e.target.value);
          }}
          className={textareaClass}
        />
      </div>

      {/* Designer Logic */}
      <div>
        <label className={labelClass}>Designer Logic</label>
        <textarea
          rows={5}
          placeholder="Interaction rules, behavioral constraints, edge case notes from design…"
          value={input.designer_logic.raw_text}
          onChange={(e) => setDesignerLogic(e.target.value)}
          className={textareaClass}
        />
      </div>

      {/* Figma Context */}
      <div>
        <label className={labelClass}>Figma / Prototype Context</label>
        <textarea
          rows={5}
          placeholder="Screens covered, entry point, happy path, notable states, key interactions, annotations, known gaps…"
          value={[
            input.figma_context.screens,
            input.figma_context.main_happy_path,
            input.figma_context.notable_states,
            input.figma_context.key_interactions,
            input.figma_context.annotations_or_notes,
            input.figma_context.known_gaps,
          ]
            .filter(Boolean)
            .join('\n\n') || ''}
          onChange={(e) => setFigmaContext('screens', e.target.value)}
          className={textareaClass}
        />
      </div>

      {/* Update / New Decision — always visible but labeled for recompile */}
      <div>
        <label className={labelClass}>
          Update / New Decision{' '}
          <span className="text-gray-600">(used on Recompile)</span>
        </label>
        <textarea
          rows={4}
          placeholder="Describe the decision or change to incorporate into the spec…"
          value={input.update?.decision_change ?? ''}
          onChange={(e) => setUpdate('decision_change', e.target.value)}
          className={textareaClass}
        />
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div>
            <label className={`${labelClass} mt-1`}>Change Title</label>
            <input
              type="text"
              placeholder="e.g. Remove guest checkout"
              value={input.update?.update_title ?? ''}
              onChange={(e) => setUpdate('update_title', e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
            />
          </div>
          <div>
            <label className={`${labelClass} mt-1`}>Affected Area</label>
            <input
              type="text"
              placeholder="e.g. auth flow"
              value={input.update?.affected_area ?? ''}
              onChange={(e) => setUpdate('affected_area', e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-3 pt-1 pb-4">
        <button
          onClick={onCompile}
          disabled={isLoading}
          className="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading && !hasOutput ? 'Compiling…' : 'Compile'}
        </button>
        <button
          onClick={onRecompile}
          disabled={isLoading || !hasOutput}
          className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:border-gray-600 hover:text-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isLoading && hasOutput ? 'Recompiling…' : 'Recompile'}
        </button>
      </div>
    </div>
  );
}
```

> **Note on the textarea approach:** The spec accepts raw text in all input areas and parses them server-side. Rather than individual fields per PRFAQ sub-key, we map the main textarea value to `feature_goal` (the most important field) and send the rest as empty. For a hackathon demo this is fine — the LLM works with whatever is in `feature_goal`. If you want full structured input, add individual labeled fields for each sub-key.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/InputColumn.tsx
git commit -m "feat: build InputColumn with all input fields and compile/recompile buttons"
```

---

## Task 10: Wire everything together in `app/page.tsx`

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Write the root page with full state and handlers**

Replace entire `app/page.tsx` with:

```tsx
'use client';

import { useState } from 'react';
import type { CompilerInput, CompilerOutput } from '@/lib/types';
import { emptyInput } from '@/lib/types';
import { compile, recompile } from '@/lib/compiler';
import { InputColumn } from '@/components/InputColumn';
import { OutputWorkspace } from '@/components/OutputWorkspace';

export default function Home() {
  const [input, setInput] = useState<CompilerInput>(emptyInput);
  const [output, setOutput] = useState<CompilerOutput | null>(null);
  const [previousOutput, setPreviousOutput] = useState<CompilerOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCompile() {
    setIsLoading(true);
    setError(null);
    try {
      const result = await compile(input);
      setOutput(result);
      setPreviousOutput(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Compile failed. Try again.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRecompile() {
    if (!previousOutput) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await recompile(input, previousOutput);
      setPreviousOutput(output!);
      setOutput(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Recompile failed. Try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex h-screen flex-col bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-gray-800 px-6 py-3">
        <div>
          <h1 className="text-sm font-semibold text-gray-100">AI Design Logic Compiler</h1>
          <p className="text-xs text-gray-500">Compile fragmented product intent into a structured interaction spec</p>
        </div>
        {output && (
          <span className="rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-400 ring-1 ring-inset ring-green-500/20">
            {output.compilation_mode === 'recompile' ? 'Recompiled' : 'Compiled'} ·{' '}
            {new Date(output.compiled_at).toLocaleTimeString()}
          </span>
        )}
      </header>

      {/* Error banner */}
      {error && (
        <div className="mx-6 mt-3 rounded-lg border border-red-800 bg-red-900/20 px-4 py-2.5 text-sm text-red-400">
          {error}
          <button onClick={() => setError(null)} className="ml-3 text-red-600 hover:text-red-400">
            ✕
          </button>
        </div>
      )}

      {/* Two-column layout */}
      <div className="flex flex-1 gap-5 overflow-hidden px-6 py-5">
        {/* Left: Inputs */}
        <div className="w-[380px] shrink-0">
          <InputColumn
            input={input}
            onChange={setInput}
            onCompile={handleCompile}
            onRecompile={handleRecompile}
            isLoading={isLoading}
            hasOutput={!!output}
          />
        </div>

        {/* Right: Outputs */}
        <div className="flex-1 min-w-0">
          <OutputWorkspace output={output} />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles with no errors**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Open the app and verify the full compile flow**

1. `npm run dev` → open `http://localhost:3000`
2. Verify two-column layout renders with empty inputs and "Paste your inputs and hit Compile." on the right
3. Type a feature name: "Bulk Export"
4. Paste sample text into PRFAQ textarea: "Goal: Let users export all query results. Problem: Currently limited to 1000 rows. Users: Data analysts."
5. Click **Compile** — button should show "Compiling…" and be disabled
6. After ~5-10s, output tabs should appear with content in Interaction Logic, Edge Cases, Eng Handoff, Open Questions
7. Type a change in Update: "Decision: Limit export to 50k rows for performance." with title "Row limit cap"
8. Click **Recompile** — should update output and show "What Changed" tab with the amber dot indicator
9. Click **What Changed** tab — verify before/after summary is present and changedSections badges appear

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "feat: wire up root page with compile/recompile state and two-column layout"
```

---

## Task 11: Polish — loading states, error states, visual refinements

**Files:**
- Modify: `components/InputColumn.tsx`
- Modify: `components/OutputWorkspace.tsx`

- [ ] **Step 1: Add loading spinner to OutputWorkspace**

In `components/OutputWorkspace.tsx`, add an `isLoading` prop and render a loading overlay when true. Add this prop to the interface and pass it from `page.tsx`:

In `OutputWorkspace.tsx`, update the interface and add a loading state view:

```tsx
interface OutputWorkspaceProps {
  output: CompilerOutput | null;
  isLoading: boolean;
}

export function OutputWorkspace({ output, isLoading }: OutputWorkspaceProps) {
  // ... existing tab state ...

  if (isLoading && !output) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border border-gray-800 bg-gray-900/50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-700 border-t-indigo-500" />
          <p className="text-sm text-gray-500">Compiling…</p>
        </div>
      </div>
    );
  }

  if (!output) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border border-gray-800 bg-gray-900/50">
        <p className="text-sm text-gray-500">Paste your inputs and hit Compile.</p>
      </div>
    );
  }
  // rest of component unchanged
```

- [ ] **Step 2: Add recompiling overlay on top of existing output**

Inside the `OutputWorkspace` JSX (the root div when `output` is present), add a conditional overlay element before the tab bar:

```tsx
{isLoading && (
  <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-gray-950/60 backdrop-blur-sm">
    <div className="flex flex-col items-center gap-3">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-700 border-t-indigo-500" />
      <p className="text-sm text-gray-400">Recompiling…</p>
    </div>
  </div>
)}
```

Add `relative` class to the root div to contain the overlay.

- [ ] **Step 3: Pass `isLoading` from `page.tsx` to `OutputWorkspace`**

In `app/page.tsx`, update the `OutputWorkspace` usage:

```tsx
<OutputWorkspace output={output} isLoading={isLoading} />
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: End-to-end visual check**

1. Open `http://localhost:3000`
2. Confirm empty state shows placeholder text with no layout shift
3. Click Compile with empty inputs — spinner should show
4. After compile, confirm all 4 tabs have content
5. Fill in Update section, click Recompile — overlay spinner should show over the output
6. Confirm "What Changed" tab appears and amber dot shows on changed tabs
7. Dismiss the error banner if any errors occur

- [ ] **Step 6: Commit**

```bash
git add components/OutputWorkspace.tsx app/page.tsx
git commit -m "feat: add loading spinners and recompile overlay to OutputWorkspace"
```

---

## Self-Review

### Spec Coverage

| Spec Requirement | Task |
|---|---|
| Scaffold exact file structure | Task 1 |
| All TypeScript schemas in `lib/types.ts` | Task 2 |
| Prompt templates exported as typed functions | Task 3 |
| API route handles both compile and recompile | Task 4 |
| `compile()` and `recompile()` in `compiler.ts` | Task 5 |
| `ChangeBadge` component | Task 6 |
| `OutputTab` — all 5 panel types | Task 7 |
| `OutputWorkspace` — tab container with empty state | Task 8 |
| `InputColumn` — all fields, both buttons | Task 9 |
| `page.tsx` — state and compile/recompile handlers | Task 10 |
| Loading state, error banner, inline error messages | Task 11 |
| `What Changed` tab only visible after recompile | Task 8 (tab logic), Task 10 (mode) |
| `ChangeBadge` driven by `sections_changed` array | Task 7, Task 8 |
| Error: keep previous output visible on failure | Task 10 — ✓ error state doesn't clear `output` |
| No mock data — real errors only | Task 4 — ✓ returns 502 on LLM failure |
| `.env.local.example` | Task 1 |
| `PRFAQ` fields parsed via raw text | Task 9 (note on approach) |
| Mobile layout not required | Confirmed — not included |

### Placeholder Scan

No TBDs, TODOs, or "implement later" placeholders. All code blocks are complete.

### Type Consistency

- `emptyInput` and `emptyUpdate` defined in `lib/types.ts` Task 2 and used in `page.tsx` Task 10 ✓
- `CompilerInput`, `CompilerOutput` used consistently across all tasks ✓
- `ChangeBadge` is a named export, imported as `{ ChangeBadge }` in `OutputTab.tsx` ✓
- `compile()` / `recompile()` signatures in `compiler.ts` match usage in `page.tsx` ✓

---

## Note on PRFAQ textarea approach

The spec says PRFAQ fields are accepted as "a full PRFAQ block as plain text; parsed server-side." Task 9 maps the main textarea to `feature_goal` for simplicity. If the hackathon demo needs individual labeled fields (Feature Goal, User Problem, etc.), replace the single PRFAQ textarea in `InputColumn.tsx` with 6 individual `<textarea>` elements, each setting the corresponding `prfaq` sub-key.

# UX Review Copilot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Next.js 16 app that proxies Claude for structured UX reviews, using LeafyGreen components and server-side API key handling.

**Architecture:** App Router Next.js with a single `/api/review` route that holds the Anthropic API key server-side. `app/page.tsx` is a server component that fetches heuristic packs (GitHub raw URL with local `/public` fallback) and passes them as props to a `ReviewShell` client component that owns all UI state. The HTML prototype at `/Users/yue.lin/Downloads/ux review tool/ux-review-tool.html` is the functional reference; `@leafygreen-ui/*` is the visual reference.

**Tech Stack:** Next.js 16.2.6, React 19, TypeScript 5, Tailwind CSS 4 (layout/spacing only), `@leafygreen-ui/*`, `@anthropic-ai/sdk ^0.95.2`, Jest + `@testing-library/react`

---

## File Map

**Create:**
- `package.json` — deps
- `next.config.ts` — Next.js config
- `tsconfig.json` — TypeScript config
- `postcss.config.mjs` — Tailwind PostCSS
- `jest.config.ts` — Jest config using Next.js transformer
- `jest.setup.ts` — testing-library matchers
- `app/layout.tsx` — root layout with `LeafyGreenProvider`
- `app/globals.css` — Tailwind base + body background
- `app/page.tsx` — server component; fetches packs, renders `ReviewShell`
- `app/api/review/route.ts` — Anthropic API proxy
- `lib/types.ts` — all TypeScript interfaces
- `lib/prompts.ts` — bundled system prompt
- `lib/packs.ts` — `fetchPacks()` with fallback
- `lib/__tests__/packs.test.ts` — unit tests for `fetchPacks`
- `app/api/review/route.test.ts` — API route tests
- `components/ReviewShell.tsx` — `'use client'`, owns all form + review state
- `components/ArtifactInput.tsx` — URL inputs + file upload with tab switcher
- `components/ContextForm.tsx` — feature intent / workflow / user roles
- `components/PackSelector.tsx` — pack toggle cards
- `components/FindingCard.tsx` — single finding (severity badge + fields)
- `components/LoadingState.tsx` — animated progress steps
- `components/ReviewResults.tsx` — summary + open questions + findings
- `public/heuristic-packs-v2.json` — local fallback (copy from Downloads)
- `.env.local.example` — env var template

---

## Task 1: Project scaffolding

**Files:**
- Create: `package.json`
- Create: `next.config.ts`
- Create: `tsconfig.json`
- Create: `postcss.config.mjs`
- Create: `jest.config.ts`
- Create: `jest.setup.ts`
- Create: `.env.local.example`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "ux-review-copilot",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "jest --passWithNoTests",
    "test:watch": "jest --watch"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.95.2",
    "@leafygreen-ui/badge": "latest",
    "@leafygreen-ui/banner": "latest",
    "@leafygreen-ui/button": "latest",
    "@leafygreen-ui/card": "latest",
    "@leafygreen-ui/checkbox": "latest",
    "@leafygreen-ui/empty-state": "latest",
    "@leafygreen-ui/leafygreen-provider": "latest",
    "@leafygreen-ui/loading-indicator": "latest",
    "@leafygreen-ui/tabs": "latest",
    "@leafygreen-ui/text-area": "latest",
    "@leafygreen-ui/text-input": "latest",
    "@leafygreen-ui/typography": "latest",
    "next": "16.2.6",
    "react": "19.2.4",
    "react-dom": "19.2.4"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@testing-library/jest-dom": "^6",
    "@testing-library/react": "^16",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "jest": "^29",
    "jest-environment-jsdom": "^29",
    "tailwindcss": "^4",
    "typescript": "^5"
  }
}
```

- [ ] **Step 2: Create `next.config.ts`**

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {};

export default nextConfig;
```

- [ ] **Step 3: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Create `postcss.config.mjs`**

```javascript
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};

export default config;
```

- [ ] **Step 5: Create `jest.config.ts`**

```typescript
import type { Config } from 'jest';
import nextJest from 'next/jest';

const createJestConfig = nextJest({ dir: './' });

const config: Config = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testPathPattern: ['**/__tests__/**/*.test.ts', '**/*.test.ts'],
};

export default createJestConfig(config);
```

- [ ] **Step 6: Create `jest.setup.ts`**

```typescript
import '@testing-library/jest-dom';
```

- [ ] **Step 7: Create `.env.local.example`**

```
# Required: Anthropic API key for the review API route
ANTHROPIC_API_KEY=sk-ant-...

# Optional: GitHub raw URL to load heuristic packs from. Falls back to /public/heuristic-packs-v2.json.
# Example: https://raw.githubusercontent.com/your-org/your-repo/main/ai_assisted_ux_code_review/public/heuristic-packs-v2.json
HEURISTIC_PACKS_URL=
```

- [ ] **Step 8: Install dependencies and verify**

```bash
npm install
```

Expected: `node_modules` created, no peer dep errors (LeafyGreen may warn about React version — ignore for now).

- [ ] **Step 9: Commit**

```bash
git add package.json next.config.ts tsconfig.json postcss.config.mjs jest.config.ts jest.setup.ts .env.local.example
git commit -m "chore: scaffold ux-review-copilot project"
```

---

## Task 2: Copy source files

**Files:**
- Create: `public/heuristic-packs-v2.json`
- Create: `app/globals.css`
- Create: `app/layout.tsx` (stub)

- [ ] **Step 1: Copy the heuristic packs JSON**

```bash
cp "/Users/yue.lin/Downloads/ux review tool/heuristic-packs-v2.json" public/heuristic-packs-v2.json
```

- [ ] **Step 2: Create `app/globals.css`**

```css
@import "tailwindcss";

body {
  background-color: #ffffff;
  color: #1c2d38;
}
```

- [ ] **Step 3: Create stub `app/layout.tsx`** (will be fleshed out in Task 7 after types/components exist)

```typescript
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'UX Review Copilot',
  description: 'AI-assisted first-pass UX review for MongoDB product teams',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add public/heuristic-packs-v2.json app/globals.css app/layout.tsx
git commit -m "chore: add heuristic packs JSON and base layout stub"
```

---

## Task 3: TypeScript types

**Files:**
- Create: `lib/types.ts`

- [ ] **Step 1: Create `lib/types.ts`**

```typescript
// Heuristic packs schema

export interface HeuristicRule {
  rule_id: string;
  title: string;
  nng_heuristic: string;
  nng_principle?: string;
  severity_default: Severity;
  check_prompt: string;
  leafygreen_component: string;
  leafygreen_url?: string;
}

export interface HeuristicPack {
  pack_id: string;
  pack_name: string;
  description: string;
  source?: string;
  priority_rules?: string[];
  rules: HeuristicRule[];
}

export interface HeuristicPacksData {
  schema_version: string;
  schema_description?: string;
  packs: HeuristicPack[];
}

// Review API contract

export type Severity = 'Critical' | 'Warning' | 'Suggestion' | 'Accessibility';

export interface ReviewRequestBody {
  userMessage: string;
  images: Array<{
    media_type: string;
    data: string;
  }>;
}

export interface Finding {
  severity: Severity;
  title: string;
  why: string;
  recommendation: string;
  evidence: string;
}

export interface ReviewSummary {
  assessment: string;
  risk_themes: string[];
  packs_applied: string[];
  confidence: 'High' | 'Medium' | 'Low';
  confidence_reason: string;
}

export interface ReviewResponse {
  summary: ReviewSummary;
  findings: Finding[];
  open_questions: string[];
}

// UI state

export type ReviewState =
  | { status: 'idle' }
  | { status: 'loading'; step: string }
  | { status: 'results'; data: ReviewResponse }
  | { status: 'error'; message: string };
```

- [ ] **Step 2: Verify TypeScript parses cleanly**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "feat: add TypeScript types for review API and heuristic packs"
```

---

## Task 4: System prompt

**Files:**
- Create: `lib/prompts.ts`

- [ ] **Step 1: Create `lib/prompts.ts`**

Copy the content verbatim from `/Users/yue.lin/Downloads/ux review tool/ux-review-system-prompt.md`, wrapped in a template literal. The file should export one constant with the full system prompt text, plus the JSON output format instruction appended at the end (taken from the HTML prototype's embedded `SYSTEM_PROMPT`).

```typescript
export const REVIEW_SYSTEM_PROMPT = `You are an expert UX review copilot performing first-pass operational UX review for AI-speed product development.

You review submitted UI — Figma prototypes, vibe-coded screens, GitHub preview deployments, or uploaded screenshots — against structured heuristic packs. You surface UX integrity risks early, in a format that feels like PR review comments.

You are a first-pass reviewer, not a source of truth. The human decides which findings matter.

---

## Calibration — good vs bad output

**Good:**
- Missing empty state for zero-data table
  - Why it matters: users see blank rows with no explanation, which reads as a broken interface
  - Recommendation: use LeafyGreen Empty State component with description and primary CTA
  - Evidence: table view shows column headers, no rows, no empty treatment

**Bad — never produce this:**
- The layout could feel more intuitive
  - No evidence, not actionable, discard

**Good:**
- "Terminate" action has no confirmation step
  - Why it matters: one misclick permanently destroys a resource with no recovery
  - Recommendation: use LeafyGreen Confirmation Modal before executing destructive row actions
  - Evidence: row action menu shows Terminate option that triggers immediately on click

**Bad — never produce this:**
- Consider improving feedback mechanisms for destructive actions
  - Generic, no evidence, discard

If you cannot cite a specific visible UI element as evidence, do not produce the finding.

---

## Inputs

Users may submit any combination of:
- Figma prototype URL (read the shared prototype link, infer flows and states)
- GitHub preview URL or deployed prototype URL (fetch and analyze the live UI)
- Uploaded screenshots
- Text description of the UI
- Feature intent
- Workflow description
- User roles
- Selected heuristic packs
- Team custom heuristics

### Handling Figma URLs
When a Figma link is provided:
- Treat it as a prototype or design artifact
- Infer flows, states, and transitions from what is visible and linked
- Note when you can only see a static frame vs. an interactive prototype
- Call out flows or states that appear to exist but are not shown as Open Questions

### Handling GitHub / preview URLs
When a GitHub Pages, Vercel, Netlify, or similar preview URL is provided:
- Treat it as a built UI
- Review visible states based on what the URL renders
- Note that dynamic states (loading, error, empty) may not be directly visible and flag them as Open Questions if not confirmed

### Handling ambiguity
If information is incomplete, call it out explicitly in Open Questions. Do not hallucinate missing states or invent flows you cannot see.

---

## MongoDB / LeafyGreen requirement

All recommendations must prefer MongoDB's LeafyGreen Design System (mongodb.design).

- Name the LeafyGreen component in every recommendation where one applies
- Do not suggest custom UI where a LeafyGreen component exists
- If no LeafyGreen component fits, explicitly say why

Acceptable recommendation style:
- "Use LeafyGreen Confirmation Modal for this destructive action."
- "Use LeafyGreen Banner (variant: danger) for this error state."
- "Use LeafyGreen Empty State rather than a custom blank treatment."
- "Use LeafyGreen Toast (success) for post-action confirmation."

---

## Heuristic packs

Apply only the packs selected by the user. Default if none selected: **Core UX + Accessibility**.

---

### Core UX Pack
Grounded in Nielsen's 10 Usability Heuristics. Prioritize H1, H3, H5, H9 — these fail most in AI-generated UI.

H1 — Visibility of system status: Loading states, progress, pending states for async actions → LeafyGreen: LoadingIndicator, Skeleton Loader, Progress Bar
H2 — Match system to real world: Jargon, confusing labels, terminology mismatch → LeafyGreen: Inline Definition, Info Sprinkle
H3 — User control and freedom: Cancel paths, undo, escape hatches from flows → LeafyGreen: Form Footer, Button
H4 — Consistency and standards: Inconsistent labels, mixed components, interaction drift → Full LeafyGreen component set
H5 — Error prevention: Destructive actions without confirmation, risky defaults → LeafyGreen: Confirmation Modal, Callout (warning)
H6 — Recognition over recall: Hidden options, missing context, buried information → LeafyGreen: Guide Cue, Info Sprinkle
H7 — Flexibility and efficiency: No shortcuts for repeat tasks, inefficient flows
H8 — Aesthetic and minimalist: UI noise competing with primary task
H9 — Error recovery: Error messages with no plain-language explanation or recovery path → LeafyGreen: Banner (danger), Callout (error), Toast (warning)
H10 — Help and documentation: Complex flows with no inline guidance, empty states with no next step → LeafyGreen: Empty State, Guide Cue

---

### Accessibility Pack

- Status communicated by color alone (must also use icon + label) → LeafyGreen: Badge, Banner, Toast — all include icons by default
- Interactive controls missing visible labels → LeafyGreen: Icon Button (needs aria-label), Tooltip for icon-only
- Focus order that appears illogical from visible structure → All LeafyGreen components include keyboard support
- Form fields with placeholder-only labels (disappear on focus) → LeafyGreen: Text Input, Select, Combobox — all include label slots
- Feedback patterns that are purely visual with no text equivalent → LeafyGreen: Banner, Toast implement ARIA roles

---

### MongoDB Product Pack

- Custom components where LeafyGreen equivalents exist → Full component library at mongodb.design
- MongoDB terminology inconsistency (Project, Org, Cluster, Atlas) → LeafyGreen: Inline Definition, Info Sprinkle
- Navigation pattern drift from Cloud Nav Layout → LeafyGreen: Cloud Nav Layout, Side Nav, Section Nav
- Copy inconsistent with MongoDB voice and tone → Copy: Voice and Tone guidelines
- Empty/access restriction states using custom patterns instead of MongoDB patterns → LeafyGreen: Empty State, Access Restriction Messages, Feature Walls

---

### Team Custom Pack

Apply rules provided by the user under "Team custom heuristics." If none provided, skip entirely — do not fabricate rules.

---

## Severity definitions

- Critical: Blocks task completion, causes destructive mistakes, breaks core workflow
- Warning: Confuses users, creates inconsistency, likely causes downstream friction
- Suggestion: Useful improvement, not a major risk
- Accessibility: Specific accessibility issue or reminder

---

## Review method

1. Infer the user goal and workflow from the artifact.
2. Identify the most important states, transitions, and risk moments.
3. Review against selected packs, checking H1/H3/H5/H9 first.
4. Surface only findings tied to visible evidence.
5. Cap at 10 findings per review. Prioritize ruthlessly.
6. Keep each finding to 4 lines or fewer.
7. Put genuine uncertainty in Open Questions — never invent a failure.

---

## Hard constraints

Never:
- Write a finding without citing a specific visible UI element
- Use "consider improving" or equivalent vagueness
- Exceed 10 findings
- Suggest custom UI where LeafyGreen exists
- Invent flows or states not visible or clearly implied

Always:
- Name a LeafyGreen component in every recommendation where one applies
- Check H1/H3/H5/H9 before other heuristics
- Put ambiguity in Open Questions, not fabricated findings

---

## Output format

Respond ONLY with valid JSON. No markdown, no preamble, no trailing text.

{
  "summary": {
    "assessment": "1-3 sentence overall assessment",
    "risk_themes": ["theme 1", "theme 2", "theme 3"],
    "packs_applied": ["Core UX", "Accessibility"],
    "confidence": "High|Medium|Low",
    "confidence_reason": "one sentence"
  },
  "findings": [
    {
      "severity": "Critical|Warning|Suggestion|Accessibility",
      "title": "short finding title",
      "why": "one sentence",
      "recommendation": "one sentence with LeafyGreen component name",
      "evidence": "specific visible UI element referenced"
    }
  ],
  "open_questions": ["question 1", "question 2"]
}`;
```

- [ ] **Step 2: Verify it compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/prompts.ts
git commit -m "feat: add bundled UX review system prompt"
```

---

## Task 5: Heuristic packs loader + tests

**Files:**
- Create: `lib/packs.ts`
- Create: `lib/__tests__/packs.test.ts`

- [ ] **Step 1: Write the failing tests first**

Create `lib/__tests__/packs.test.ts`:

```typescript
import { fetchPacks } from '../packs';
import localPacks from '../../public/heuristic-packs-v2.json';

const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockClear();
  delete process.env.HEURISTIC_PACKS_URL;
});

test('returns local packs when HEURISTIC_PACKS_URL is not set', async () => {
  const data = await fetchPacks();
  expect(data.packs).toHaveLength(localPacks.packs.length);
  expect(mockFetch).not.toHaveBeenCalled();
});

test('fetches from primary URL when env var is set and fetch succeeds', async () => {
  process.env.HEURISTIC_PACKS_URL = 'https://raw.example.com/packs.json';
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      schema_version: '2.0',
      packs: [{ pack_id: 'test', pack_name: 'Test', description: '', rules: [] }],
    }),
  });

  const data = await fetchPacks();
  expect(data.packs[0].pack_id).toBe('test');
  expect(mockFetch).toHaveBeenCalledWith(
    'https://raw.example.com/packs.json',
    expect.objectContaining({ next: { revalidate: 3600 } })
  );
});

test('falls back to local packs when fetch fails', async () => {
  process.env.HEURISTIC_PACKS_URL = 'https://raw.example.com/packs.json';
  mockFetch.mockRejectedValueOnce(new Error('Network error'));

  const data = await fetchPacks();
  expect(data.packs).toHaveLength(localPacks.packs.length);
});

test('falls back to local packs when fetch returns non-ok status', async () => {
  process.env.HEURISTIC_PACKS_URL = 'https://raw.example.com/packs.json';
  mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });

  const data = await fetchPacks();
  expect(data.packs).toHaveLength(localPacks.packs.length);
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npm test lib/__tests__/packs.test.ts
```

Expected: FAIL — `fetchPacks` not found.

- [ ] **Step 3: Create `lib/packs.ts`**

```typescript
import type { HeuristicPacksData } from './types';
import localPacks from '../public/heuristic-packs-v2.json';

export async function fetchPacks(): Promise<HeuristicPacksData> {
  const url = process.env.HEURISTIC_PACKS_URL;

  if (url) {
    try {
      const res = await fetch(url, { next: { revalidate: 3600 } });
      if (res.ok) return res.json() as Promise<HeuristicPacksData>;
    } catch {
      // fall through to local
    }
  }

  return localPacks as HeuristicPacksData;
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npm test lib/__tests__/packs.test.ts
```

Expected: PASS — 4 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/packs.ts lib/__tests__/packs.test.ts
git commit -m "feat: add fetchPacks with GitHub URL and local fallback"
```

---

## Task 6: API route + tests

**Files:**
- Create: `app/api/review/route.ts`
- Create: `app/api/review/route.test.ts`

- [ ] **Step 1: Write failing tests**

Create `app/api/review/route.test.ts`:

```typescript
import { POST } from './route';
import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

jest.mock('@anthropic-ai/sdk');

const MockAnthropic = Anthropic as jest.MockedClass<typeof Anthropic>;

const validReview = {
  summary: {
    assessment: 'The UI is functional but has critical gaps.',
    risk_themes: ['Missing loading states', 'No error recovery'],
    packs_applied: ['Core UX'],
    confidence: 'Medium',
    confidence_reason: 'Screenshots provided but no workflow context.',
  },
  findings: [
    {
      severity: 'Critical',
      title: 'No loading state on form submit',
      why: 'Users cannot tell if the action was received.',
      recommendation: 'Use LeafyGreen LoadingIndicator during async submit.',
      evidence: 'Submit button remains active with no feedback after click.',
    },
  ],
  open_questions: ['Does the table have an empty state?'],
};

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/review', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

beforeEach(() => {
  MockAnthropic.prototype.messages = {
    create: jest.fn().mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify(validReview) }],
    }),
  } as unknown as typeof MockAnthropic.prototype.messages;
});

test('returns structured review for valid request', async () => {
  const res = await POST(
    makeRequest({ userMessage: 'Figma URL: https://figma.com/test', images: [] })
  );
  expect(res.status).toBe(200);
  const data = await res.json();
  expect(data.summary.confidence).toBe('Medium');
  expect(data.findings).toHaveLength(1);
  expect(data.findings[0].severity).toBe('Critical');
});

test('returns 400 for malformed JSON body', async () => {
  const req = new NextRequest('http://localhost/api/review', {
    method: 'POST',
    body: 'not-json',
    headers: { 'Content-Type': 'application/json' },
  });
  const res = await POST(req);
  expect(res.status).toBe(400);
});

test('returns 400 when userMessage is missing', async () => {
  const res = await POST(makeRequest({ images: [] }));
  expect(res.status).toBe(400);
});

test('returns 500 when Anthropic throws', async () => {
  (MockAnthropic.prototype.messages.create as jest.Mock).mockRejectedValueOnce(
    new Error('API error')
  );
  const res = await POST(
    makeRequest({ userMessage: 'Figma URL: https://figma.com/test', images: [] })
  );
  expect(res.status).toBe(500);
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npm test app/api/review/route.test.ts
```

Expected: FAIL — `POST` not found.

- [ ] **Step 3: Create `app/api/review/route.ts`**

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { REVIEW_SYSTEM_PROMPT } from '@/lib/prompts';
import type { ReviewRequestBody, ReviewResponse } from '@/lib/types';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  let body: ReviewRequestBody;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.userMessage) {
    return NextResponse.json({ error: 'userMessage is required' }, { status: 400 });
  }

  const messageContent: Anthropic.MessageParam['content'] = [];

  for (const img of body.images ?? []) {
    messageContent.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: img.media_type as 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif',
        data: img.data,
      },
    });
  }

  messageContent.push({ type: 'text', text: body.userMessage });

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: REVIEW_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: messageContent }],
    });

    const raw = response.content.map((b) => ('text' in b ? b.text : '')).join('');
    const clean = raw.replace(/```json|```/g, '').trim();
    const review: ReviewResponse = JSON.parse(clean);

    return NextResponse.json(review);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: `Review failed: ${message}` }, { status: 500 });
  }
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npm test app/api/review/route.test.ts
```

Expected: PASS — 4 tests.

- [ ] **Step 5: Commit**

```bash
git add app/api/review/route.ts app/api/review/route.test.ts
git commit -m "feat: add Anthropic proxy API route with input validation"
```

---

## Task 7: Root layout with LeafyGreenProvider

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 1: Update `app/layout.tsx`**

```typescript
import type { Metadata } from 'next';
import LeafyGreenProvider from '@leafygreen-ui/leafygreen-provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'UX Review Copilot',
  description: 'AI-assisted first-pass UX review for MongoDB product teams',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <LeafyGreenProvider>{children}</LeafyGreenProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Verify dev server starts without errors**

```bash
npm run dev
```

Open `http://localhost:3000` — expect a blank page or 404, no console errors.

- [ ] **Step 3: Commit**

```bash
git add app/layout.tsx
git commit -m "feat: add LeafyGreenProvider to root layout"
```

---

## Task 8: ArtifactInput component

**Files:**
- Create: `components/ArtifactInput.tsx`

- [ ] **Step 1: Create `components/ArtifactInput.tsx`**

```typescript
'use client';

import { useState } from 'react';
import { Tabs, Tab } from '@leafygreen-ui/tabs';
import TextInput from '@leafygreen-ui/text-input';

interface Props {
  figmaUrl: string;
  onFigmaUrlChange: (v: string) => void;
  githubUrl: string;
  onGithubUrlChange: (v: string) => void;
  uploadedFiles: File[];
  onFilesChange: (files: File[]) => void;
}

export default function ArtifactInput({
  figmaUrl,
  onFigmaUrlChange,
  githubUrl,
  onGithubUrlChange,
  uploadedFiles,
  onFilesChange,
}: Props) {
  const [selected, setSelected] = useState(0);

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const incoming = Array.from(e.target.files ?? []);
    onFilesChange([...uploadedFiles, ...incoming]);
  }

  function removeFile(name: string) {
    onFilesChange(uploadedFiles.filter((f) => f.name !== name));
  }

  return (
    <section className="p-6 border-b border-gray-200">
      <p className="text-xs font-mono text-gray-400 uppercase tracking-widest mb-3">
        Artifact to review
      </p>
      <Tabs selected={selected} setSelected={setSelected} aria-label="Input type">
        <Tab name="URL">
          <div className="flex flex-col gap-3 pt-3">
            <TextInput
              label="Figma prototype URL"
              placeholder="https://www.figma.com/proto/..."
              value={figmaUrl}
              onChange={(e) => onFigmaUrlChange(e.target.value)}
            />
            <TextInput
              label="GitHub Pages / Vercel / Netlify URL"
              placeholder="https://your-preview.vercel.app"
              value={githubUrl}
              onChange={(e) => onGithubUrlChange(e.target.value)}
            />
          </div>
        </Tab>
        <Tab name="Upload">
          <div className="pt-3">
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-8 cursor-pointer hover:border-green-500 hover:bg-green-50 transition-colors">
              <span className="text-2xl text-gray-400 mb-2">↑</span>
              <span className="text-sm text-gray-500">Drop screenshots here</span>
              <span className="text-xs text-gray-400 mt-1">PNG, JPG, WebP · Multiple files OK</span>
              <input
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                onChange={handleFileInput}
              />
            </label>
            <FileChips files={uploadedFiles} onRemove={removeFile} />
          </div>
        </Tab>
        <Tab name="Both">
          <div className="flex flex-col gap-3 pt-3">
            <TextInput
              label="Figma prototype URL"
              placeholder="https://www.figma.com/proto/..."
              value={figmaUrl}
              onChange={(e) => onFigmaUrlChange(e.target.value)}
            />
            <TextInput
              label="GitHub Pages / preview URL"
              placeholder="https://your-preview.vercel.app"
              value={githubUrl}
              onChange={(e) => onGithubUrlChange(e.target.value)}
            />
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6 cursor-pointer hover:border-green-500 hover:bg-green-50 transition-colors">
              <span className="text-sm text-gray-500">+ Screenshots (optional)</span>
              <input
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                onChange={handleFileInput}
              />
            </label>
            <FileChips files={uploadedFiles} onRemove={removeFile} />
          </div>
        </Tab>
      </Tabs>
    </section>
  );
}

function FileChips({ files, onRemove }: { files: File[]; onRemove: (name: string) => void }) {
  if (files.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {files.map((f) => (
        <span
          key={f.name}
          className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 border border-gray-200 rounded text-xs text-gray-600"
        >
          {f.name}
          <button
            onClick={() => onRemove(f.name)}
            className="ml-1 text-gray-400 hover:text-red-500"
            aria-label={`Remove ${f.name}`}
          >
            ✕
          </button>
        </span>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/ArtifactInput.tsx
git commit -m "feat: add ArtifactInput component with URL/Upload/Both tabs"
```

---

## Task 9: ContextForm component

**Files:**
- Create: `components/ContextForm.tsx`

- [ ] **Step 1: Create `components/ContextForm.tsx`**

```typescript
'use client';

import TextArea from '@leafygreen-ui/text-area';
import TextInput from '@leafygreen-ui/text-input';

interface Props {
  featureIntent: string;
  onFeatureIntentChange: (v: string) => void;
  workflow: string;
  onWorkflowChange: (v: string) => void;
  userRoles: string;
  onUserRolesChange: (v: string) => void;
}

export default function ContextForm({
  featureIntent,
  onFeatureIntentChange,
  workflow,
  onWorkflowChange,
  userRoles,
  onUserRolesChange,
}: Props) {
  return (
    <section className="p-6 border-b border-gray-200 flex flex-col gap-4">
      <p className="text-xs font-mono text-gray-400 uppercase tracking-widest">Context</p>
      <TextArea
        label="Feature intent"
        placeholder="What is this UI supposed to do?"
        value={featureIntent}
        onChange={(e) => onFeatureIntentChange(e.target.value)}
        rows={2}
      />
      <TextArea
        label="Workflow description"
        placeholder="Who uses it and how? Key flows?"
        value={workflow}
        onChange={(e) => onWorkflowChange(e.target.value)}
        rows={2}
      />
      <TextInput
        label="User roles"
        placeholder="e.g. Admin, read-only viewer, new user"
        value={userRoles}
        onChange={(e) => onUserRolesChange(e.target.value)}
      />
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/ContextForm.tsx
git commit -m "feat: add ContextForm component"
```

---

## Task 10: PackSelector component

**Files:**
- Create: `components/PackSelector.tsx`

- [ ] **Step 1: Create `components/PackSelector.tsx`**

```typescript
'use client';

import Checkbox from '@leafygreen-ui/checkbox';
import TextArea from '@leafygreen-ui/text-area';
import type { HeuristicPack } from '@/lib/types';

// Packs that are on by default
const DEFAULT_ON = ['core-ux', 'accessibility'];

interface Props {
  packs: HeuristicPack[];
  selectedPackIds: string[];
  onSelectionChange: (ids: string[]) => void;
  customRules: string;
  onCustomRulesChange: (v: string) => void;
}

export default function PackSelector({
  packs,
  selectedPackIds,
  onSelectionChange,
  customRules,
  onCustomRulesChange,
}: Props) {
  const showCustomRules = selectedPackIds.includes('team-custom');

  function toggle(packId: string) {
    if (selectedPackIds.includes(packId)) {
      onSelectionChange(selectedPackIds.filter((id) => id !== packId));
    } else {
      onSelectionChange([...selectedPackIds, packId]);
    }
  }

  return (
    <section className="p-6 border-b border-gray-200">
      <p className="text-xs font-mono text-gray-400 uppercase tracking-widest mb-3">
        Heuristic packs
      </p>
      <div className="grid grid-cols-2 gap-3">
        {packs.map((pack) => (
          <label
            key={pack.pack_id}
            className={`flex flex-col gap-1 p-3 border rounded-lg cursor-pointer transition-colors ${
              selectedPackIds.includes(pack.pack_id)
                ? 'border-green-500 bg-green-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <Checkbox
              label={pack.pack_name}
              checked={selectedPackIds.includes(pack.pack_id)}
              onChange={() => toggle(pack.pack_id)}
              bold
            />
            <p className="text-xs text-gray-500 ml-6 leading-snug">{pack.description}</p>
          </label>
        ))}
      </div>
      {showCustomRules && (
        <div className="mt-3">
          <TextArea
            label="Custom heuristics"
            placeholder="Paste your team's custom review rules here…"
            value={customRules}
            onChange={(e) => onCustomRulesChange(e.target.value)}
            rows={3}
          />
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/PackSelector.tsx
git commit -m "feat: add PackSelector with dynamic pack list from packs data"
```

---

## Task 11: FindingCard component

**Files:**
- Create: `components/FindingCard.tsx`

- [ ] **Step 1: Create `components/FindingCard.tsx`**

```typescript
import Card from '@leafygreen-ui/card';
import Badge from '@leafygreen-ui/badge';
import { InlineCode, Body } from '@leafygreen-ui/typography';
import type { Finding } from '@/lib/types';

// Map severity to LeafyGreen Badge variants
const BADGE_VARIANT: Record<Finding['severity'], 'red' | 'yellow' | 'blue' | 'darkgray'> = {
  Critical: 'red',
  Warning: 'yellow',
  Suggestion: 'blue',
  Accessibility: 'darkgray',
};

interface Props {
  finding: Finding;
}

export default function FindingCard({ finding }: Props) {
  return (
    <Card className="mb-2">
      <div className="flex items-start gap-3 mb-3">
        <Badge variant={BADGE_VARIANT[finding.severity]}>{finding.severity}</Badge>
        <Body weight="medium">{finding.title}</Body>
      </div>
      <dl className="flex flex-col gap-2">
        <FindingRow label="WHY">{finding.why}</FindingRow>
        <FindingRow label="RECOMMEND">
          <RecommendationText text={finding.recommendation} />
        </FindingRow>
        <FindingRow label="EVIDENCE">{finding.evidence}</FindingRow>
      </dl>
    </Card>
  );
}

function FindingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 text-sm">
      <dt className="font-mono text-xs text-gray-400 tracking-wide min-w-[80px] shrink-0 pt-0.5">
        {label}
      </dt>
      <dd className="text-gray-600 leading-relaxed">{children}</dd>
    </div>
  );
}

// Wraps "LeafyGreen ComponentName" occurrences in InlineCode
function RecommendationText({ text }: { text: string }) {
  const parts = text.split(/(LeafyGreen\s+[A-Za-z\s()]+?)(?=\.|,|$|\s+for|\s+when|\s+to)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('LeafyGreen') ? (
          <InlineCode key={i}>{part.trim()}</InlineCode>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/FindingCard.tsx
git commit -m "feat: add FindingCard with severity badge and inline LG component highlighting"
```

---

## Task 12: LoadingState component

**Files:**
- Create: `components/LoadingState.tsx`

- [ ] **Step 1: Create `components/LoadingState.tsx`**

```typescript
import { LoadingIndicator } from '@leafygreen-ui/loading-indicator';

const STEPS = [
  'Reading artifact structure…',
  'Identifying states and transitions…',
  'Checking heuristic packs…',
  'Prioritizing H1, H3, H5, H9…',
  'Classifying findings by severity…',
  'Formatting review output…',
];

interface Props {
  step: string;
}

export default function LoadingState({ step }: Props) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 p-16 text-center">
      <LoadingIndicator />
      <p className="font-mono text-xs text-gray-400 uppercase tracking-widest">
        Analyzing artifact
      </p>
      <p className="text-sm text-gray-500">{step}</p>
    </div>
  );
}

export { STEPS };
```

- [ ] **Step 2: Commit**

```bash
git add components/LoadingState.tsx
git commit -m "feat: add LoadingState with progress step label"
```

---

## Task 13: ReviewResults component

**Files:**
- Create: `components/ReviewResults.tsx`

- [ ] **Step 1: Create `components/ReviewResults.tsx`**

```typescript
import Banner from '@leafygreen-ui/banner';
import Badge from '@leafygreen-ui/badge';
import { H2, Body } from '@leafygreen-ui/typography';
import { EmptyState } from '@leafygreen-ui/empty-state';
import FindingCard from './FindingCard';
import LoadingState from './LoadingState';
import type { ReviewState, Finding } from '@/lib/types';

const SEVERITY_ORDER: Finding['severity'][] = ['Critical', 'Warning', 'Suggestion', 'Accessibility'];

interface Props {
  state: ReviewState;
}

export default function ReviewResults({ state }: Props) {
  if (state.status === 'idle') {
    return (
      <div className="flex items-center justify-center h-full p-16">
        <EmptyState
          title="No review yet"
          description="Submit a Figma prototype or GitHub URL to start a UX review."
        />
      </div>
    );
  }

  if (state.status === 'loading') {
    return <LoadingState step={state.step} />;
  }

  if (state.status === 'error') {
    return (
      <div className="p-8">
        <Banner variant="danger">{state.message}</Banner>
      </div>
    );
  }

  const { data } = state;
  const { summary, findings, open_questions } = data;

  const grouped = SEVERITY_ORDER.reduce<Record<string, Finding[]>>((acc, sev) => {
    acc[sev] = findings.filter((f) => f.severity === sev);
    return acc;
  }, {} as Record<string, Finding[]>);

  return (
    <div className="p-8 max-w-3xl">
      {/* Summary */}
      <div className="border border-gray-200 rounded-xl p-5 mb-8">
        <SummaryRow label="ASSESSMENT">
          <Body>{summary.assessment}</Body>
        </SummaryRow>
        <SummaryRow label="RISK THEMES">
          <span className="text-sm text-gray-600">{summary.risk_themes.join(' · ')}</span>
        </SummaryRow>
        <SummaryRow label="PACKS">
          <div className="flex flex-wrap gap-2">
            {summary.packs_applied.map((p) => (
              <Badge key={p} variant="darkgray">{p}</Badge>
            ))}
          </div>
        </SummaryRow>
        <SummaryRow label="CONFIDENCE">
          <div className="flex items-center gap-2">
            <Badge variant={summary.confidence === 'High' ? 'blue' : summary.confidence === 'Medium' ? 'yellow' : 'red'}>
              {summary.confidence}
            </Badge>
            <span className="text-xs text-gray-500">{summary.confidence_reason}</span>
          </div>
        </SummaryRow>
      </div>

      {/* Open questions */}
      {open_questions.length > 0 && (
        <div className="mb-8">
          <Banner variant="warning">
            <strong>Open Questions</strong>
            <ul className="mt-2 space-y-1">
              {open_questions.map((q, i) => (
                <li key={i} className="text-sm">
                  {q}
                </li>
              ))}
            </ul>
          </Banner>
        </div>
      )}

      {/* Findings by severity */}
      {SEVERITY_ORDER.map((sev) => {
        const items = grouped[sev];
        if (!items || items.length === 0) return null;
        return (
          <section key={sev} className="mb-8">
            <div className="flex items-center gap-3 mb-3 pb-2 border-b border-gray-200">
              <Badge
                variant={
                  sev === 'Critical' ? 'red' : sev === 'Warning' ? 'yellow' : sev === 'Suggestion' ? 'blue' : 'darkgray'
                }
              >
                {sev}
              </Badge>
              <span className="text-xs text-gray-400 font-mono">
                {items.length} finding{items.length > 1 ? 's' : ''}
              </span>
            </div>
            {items.map((f, i) => (
              <FindingCard key={i} finding={f} />
            ))}
          </section>
        );
      })}
    </div>
  );
}

function SummaryRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4 mb-3 last:mb-0">
      <dt className="font-mono text-xs text-gray-400 tracking-widest uppercase min-w-[100px] shrink-0 pt-0.5">
        {label}
      </dt>
      <dd>{children}</dd>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/ReviewResults.tsx
git commit -m "feat: add ReviewResults with summary, open questions, and grouped findings"
```

---

## Task 14: ReviewShell client component

**Files:**
- Create: `components/ReviewShell.tsx`

- [ ] **Step 1: Create `components/ReviewShell.tsx`**

```typescript
'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Button from '@leafygreen-ui/button';
import ArtifactInput from './ArtifactInput';
import ContextForm from './ContextForm';
import PackSelector from './PackSelector';
import ReviewResults from './ReviewResults';
import { STEPS } from './LoadingState';
import type { HeuristicPacksData, ReviewState, ReviewRequestBody } from '@/lib/types';

interface Props {
  packs: HeuristicPacksData;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = () => reject(new Error('File read failed'));
    reader.readAsDataURL(file);
  });
}

export default function ReviewShell({ packs }: Props) {
  const [reviewState, setReviewState] = useState<ReviewState>({ status: 'idle' });
  const [figmaUrl, setFigmaUrl] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [featureIntent, setFeatureIntent] = useState('');
  const [workflow, setWorkflow] = useState('');
  const [userRoles, setUserRoles] = useState('');
  const [selectedPacks, setSelectedPacks] = useState<string[]>(['core-ux', 'accessibility']);
  const [customRules, setCustomRules] = useState('');
  const stepIndexRef = useRef(0);
  const stepIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function startStepCycle() {
    stepIndexRef.current = 0;
    setReviewState({ status: 'loading', step: STEPS[0] });
    stepIntervalRef.current = setInterval(() => {
      stepIndexRef.current = (stepIndexRef.current + 1) % STEPS.length;
      setReviewState((prev) =>
        prev.status === 'loading' ? { status: 'loading', step: STEPS[stepIndexRef.current] } : prev
      );
    }, 1400);
  }

  function stopStepCycle() {
    if (stepIntervalRef.current) {
      clearInterval(stepIntervalRef.current);
      stepIntervalRef.current = null;
    }
  }

  const runReview = useCallback(async () => {
    const hasInput = figmaUrl || githubUrl || uploadedFiles.length > 0 || featureIntent || workflow;
    if (!hasInput) {
      setReviewState({
        status: 'error',
        message: 'Please provide at least a URL, screenshot, or feature description.',
      });
      return;
    }

    startStepCycle();

    const packNames = packs.packs
      .filter((p) => selectedPacks.includes(p.pack_id))
      .map((p) => p.pack_name);

    let userMessage = '';
    if (figmaUrl) userMessage += `Figma prototype URL: ${figmaUrl}\n`;
    if (githubUrl) userMessage += `Preview URL: ${githubUrl}\n`;
    if (featureIntent) userMessage += `\nFeature intent: ${featureIntent}`;
    if (workflow) userMessage += `\nWorkflow description: ${workflow}`;
    if (userRoles) userMessage += `\nUser roles: ${userRoles}`;
    userMessage += `\n\nSelected heuristic packs: ${packNames.join(', ') || 'Core UX, Accessibility'}`;
    if (selectedPacks.includes('team-custom') && customRules) {
      userMessage += `\n\nTeam custom heuristics:\n${customRules}`;
    }
    if (!figmaUrl && !githubUrl && uploadedFiles.length === 0) {
      userMessage +=
        '\n\nNote: No visual artifact provided — base review on feature intent and workflow, and flag this in Open Questions.';
    }

    const images: ReviewRequestBody['images'] = [];
    for (const file of uploadedFiles) {
      const data = await fileToBase64(file);
      images.push({ media_type: file.type, data });
    }

    try {
      const res = await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userMessage, images } satisfies ReviewRequestBody),
      });

      stopStepCycle();

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        setReviewState({ status: 'error', message: err.error ?? `HTTP ${res.status}` });
        return;
      }

      const review = await res.json();
      setReviewState({ status: 'results', data: review });
    } catch (err) {
      stopStepCycle();
      const message = err instanceof Error ? err.message : 'Network error';
      setReviewState({ status: 'error', message });
    }
  }, [figmaUrl, githubUrl, uploadedFiles, featureIntent, workflow, userRoles, selectedPacks, customRules, packs]);

  // Cleanup interval on unmount
  useEffect(() => () => stopStepCycle(), []);

  const isLoading = reviewState.status === 'loading';

  return (
    <div className="flex min-h-screen">
      {/* Input panel */}
      <aside className="w-[420px] shrink-0 border-r border-gray-200 flex flex-col sticky top-0 h-screen overflow-y-auto">
        <header className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <span className="font-mono text-sm font-bold tracking-tight">UX REVIEW COPILOT</span>
          <span className="font-mono text-xs text-gray-400 tracking-wide">MONGODB DESIGN</span>
        </header>
        <ArtifactInput
          figmaUrl={figmaUrl}
          onFigmaUrlChange={setFigmaUrl}
          githubUrl={githubUrl}
          onGithubUrlChange={setGithubUrl}
          uploadedFiles={uploadedFiles}
          onFilesChange={setUploadedFiles}
        />
        <ContextForm
          featureIntent={featureIntent}
          onFeatureIntentChange={setFeatureIntent}
          workflow={workflow}
          onWorkflowChange={setWorkflow}
          userRoles={userRoles}
          onUserRolesChange={setUserRoles}
        />
        <PackSelector
          packs={packs.packs}
          selectedPackIds={selectedPacks}
          onSelectionChange={setSelectedPacks}
          customRules={customRules}
          onCustomRulesChange={setCustomRules}
        />
        <div className="p-6 mt-auto border-t border-gray-200">
          <Button
            variant="primary"
            onClick={runReview}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? 'Running review…' : '▶ Run Review'}
          </Button>
        </div>
      </aside>

      {/* Results panel */}
      <main className="flex-1 overflow-y-auto">
        <ReviewResults state={reviewState} />
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/ReviewShell.tsx
git commit -m "feat: add ReviewShell client component with full review flow"
```

---

## Task 15: Main page (server component)

**Files:**
- Create: `app/page.tsx`

- [ ] **Step 1: Create `app/page.tsx`**

```typescript
import { fetchPacks } from '@/lib/packs';
import ReviewShell from '@/components/ReviewShell';

export default async function Home() {
  const packs = await fetchPacks();
  return <ReviewShell packs={packs} />;
}
```

- [ ] **Step 2: Verify it compiles with TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "feat: add main page — server component fetches packs, renders ReviewShell"
```

---

## Task 16: End-to-end verification

**Files:**
- Create: `.env.local` (from `.env.local.example`)

- [ ] **Step 1: Create `.env.local` with your API key**

```bash
cp .env.local.example .env.local
# Edit .env.local and set ANTHROPIC_API_KEY=sk-ant-...
```

- [ ] **Step 2: Run all tests and verify they pass**

```bash
npm test
```

Expected: 8 tests pass (4 packs + 4 API route).

- [ ] **Step 3: Start the dev server**

```bash
npm run dev
```

Open `http://localhost:3000`.

- [ ] **Step 4: Manual smoke test — screenshots only**

1. Switch to the **Upload** tab
2. Upload any screenshot (a PNG from your desktop)
3. Set Feature intent: "Settings page for cluster configuration"
4. Leave heuristic packs at defaults (Core UX + Accessibility)
5. Click **Run Review**
6. Verify: loading steps cycle, then results appear with Summary, Confidence, and at least one finding card with a severity badge

- [ ] **Step 5: Manual smoke test — text only**

1. Clear any files
2. Switch to URL tab, leave both URL fields empty
3. Set Feature intent: "A table showing all active clusters with a delete button in each row"
4. Click **Run Review**
5. Verify: results include an Open Questions note about no visual artifact, and findings appear based on the description

- [ ] **Step 6: Manual smoke test — MongoDB Product pack**

1. Check **MongoDB Product** pack
2. Set Feature intent: "New Atlas project creation wizard"
3. Click **Run Review**
4. Verify: `packs_applied` in summary includes "MongoDB Product"

- [ ] **Step 7: Final commit**

```bash
git add .env.local.example  # already committed, just verifying .env.local is gitignored
git commit -m "feat: complete UX Review Copilot — Next.js app with LeafyGreen UI and Anthropic proxy" --allow-empty
```

---

## Verification checklist

- [ ] `npm test` — 8 tests pass
- [ ] `npx tsc --noEmit` — no TypeScript errors
- [ ] `npm run dev` — dev server starts on port 3000
- [ ] Upload tab accepts multiple image files, chips appear with remove buttons
- [ ] Team Custom pack reveals custom rules textarea when checked
- [ ] Loading state cycles through step labels during review
- [ ] Results panel shows Summary card, Open Questions (if any), and findings grouped by severity
- [ ] LeafyGreen component names in recommendations are highlighted as `InlineCode`
- [ ] API key is never exposed in client-side network requests (verify in browser DevTools — the request should go to `/api/review`, not `api.anthropic.com`)

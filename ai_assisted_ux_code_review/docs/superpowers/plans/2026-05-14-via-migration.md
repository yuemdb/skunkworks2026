# Via Design System Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Swap all LeafyGreen UI components for Via equivalents, apply Via's light theme, and keep the existing layout intact.

**Architecture:** File-by-file component swap. Via is built on React Aria so there are no React 19 type-cast workarounds needed — all `React.ComponentType<any>` casts introduced for LeafyGreen are removed. LeafyGreen packages are retained as fallback. Key API differences from LeafyGreen: `TextField`/`TextArea` `onChange` receives `string` directly (not an event); `Checkbox` uses `isSelected`/`children` not `checked`/`label`; `Button` uses `onPress`/`isDisabled`; `Tabs` uses `TabList`/`TabPanels`/`TabPanel` sub-components.

**Tech Stack:** Next.js 16, React 19, TypeScript, `@via-ds/components@canary`, `@via-ds/tokens`, Tailwind CSS 4, LeafyGreen (kept as fallback)

---

## File Map

**Modify:**
- `package.json` — add `@via-ds/components`, `@via-ds/tokens`; remove `overrides` block
- `app/globals.css` — add Via CSS imports
- `app/providers.tsx` — swap `LeafyGreenProvider` → `ViaProvider`
- `components/ReviewShell.tsx` — Button: `onClick`→`onPress`, `disabled`→`isDisabled`
- `components/ArtifactInput.tsx` — Tabs structure rewrite + TextField onChange
- `components/ContextForm.tsx` — TextArea + TextField onChange
- `components/PackSelector.tsx` — Checkbox API + TextArea onChange
- `components/FindingCard.tsx` — Card, Badge, Text (replaces Body/InlineCode); remove casts
- `components/LoadingState.tsx` — Spinner → ProgressBar
- `components/ReviewResults.tsx` — Banner, Badge, Text; empty state → Card+Text; remove casts

---

## Task 1: Install Via and update CSS

**Files:**
- Modify: `package.json`
- Modify: `app/globals.css`

- [ ] **Step 1: Install Via packages**

```bash
npm install @via-ds/components @via-ds/tokens
```

Expected: packages added to `node_modules/`, no peer dependency errors.

- [ ] **Step 2: Remove the npm overrides block from package.json**

Open `package.json` and remove the entire `"overrides"` key and its value. It was only needed to force LeafyGreen to use root React 19.

After removal the relevant section looks like:
```json
{
  "dependencies": {
    "@via-ds/components": "...",
    "@via-ds/tokens": "...",
    ...
  }
}
```

- [ ] **Step 3: Update app/globals.css**

Replace the file contents with:

```css
@import "tailwindcss";
@import "@via-ds/components/index.css";
@import "@via-ds/tokens/tailwind.css";

body {
  background-color: #ffffff;
  color: #1c2d38;
}
```

- [ ] **Step 4: Verify TypeScript is clean**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json app/globals.css
git commit -m "feat(via): install @via-ds packages and update CSS imports"
```

---

## Task 2: ViaProvider

**Files:**
- Modify: `app/providers.tsx`

- [ ] **Step 1: Swap LeafyGreenProvider → ViaProvider**

Replace the entire file with:

```typescript
'use client';

import { ViaProvider } from '@via-ds/components';

export default function Providers({ children }: { children: React.ReactNode }) {
  return <ViaProvider colorScheme="light">{children}</ViaProvider>;
}
```

`colorScheme="light"` is required because the page has a fixed white background — without it, Via components follow `prefers-color-scheme` which may render dark-mode text on a white background.

- [ ] **Step 2: Verify TypeScript is clean**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/providers.tsx
git commit -m "feat(via): swap LeafyGreenProvider for ViaProvider"
```

---

## Task 3: ReviewShell — Button API

**Files:**
- Modify: `components/ReviewShell.tsx`

Via's `Button` uses `onPress` instead of `onClick` and `isDisabled` instead of `disabled`.

- [ ] **Step 1: Update the Button import and usage**

In `components/ReviewShell.tsx`, change:

```typescript
import Button from '@leafygreen-ui/button';
```
to:
```typescript
import { Button } from '@via-ds/components';
```

Then update the Button JSX at the bottom of the sidebar from:
```typescript
<Button
  variant="primary"
  onClick={runReview}
  disabled={isLoading}
  className="w-full"
>
  {isLoading ? 'Running review…' : '▶ Run Review'}
</Button>
```
to:
```typescript
<Button
  variant="primary"
  onPress={runReview}
  isDisabled={isLoading}
  className="w-full"
>
  {isLoading ? 'Running review…' : '▶ Run Review'}
</Button>
```

- [ ] **Step 2: Verify TypeScript is clean**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/ReviewShell.tsx
git commit -m "feat(via): migrate Button in ReviewShell"
```

---

## Task 4: ArtifactInput — Tabs + TextField

**Files:**
- Modify: `components/ArtifactInput.tsx`

Via's `Tabs` uses a different structure: `<Tabs>` + `<TabList>` + `<Tab id="...">` + `<TabPanels>` + `<TabPanel id="...">`. Selection uses string keys (`defaultSelectedKey`) rather than numeric indices.

Via's `TextField` `onChange` receives a `string` value directly, not a React `ChangeEvent`.

- [ ] **Step 1: Replace the entire file**

```typescript
'use client';

import { Tabs, TabList, Tab, TabPanels, TabPanel, TextField } from '@via-ds/components';

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
      <Tabs defaultSelectedKey="url">
        <TabList aria-label="Input type">
          <Tab id="url">URL</Tab>
          <Tab id="upload">Upload</Tab>
          <Tab id="both">Both</Tab>
        </TabList>
        <TabPanels>
          <TabPanel id="url">
            <div className="flex flex-col gap-3 pt-3">
              <TextField
                label="Figma prototype URL"
                placeholder="https://www.figma.com/proto/..."
                value={figmaUrl}
                onChange={onFigmaUrlChange}
              />
              <TextField
                label="GitHub Pages / Vercel / Netlify URL"
                placeholder="https://your-preview.vercel.app"
                value={githubUrl}
                onChange={onGithubUrlChange}
              />
            </div>
          </TabPanel>
          <TabPanel id="upload">
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
          </TabPanel>
          <TabPanel id="both">
            <div className="flex flex-col gap-3 pt-3">
              <TextField
                label="Figma prototype URL"
                placeholder="https://www.figma.com/proto/..."
                value={figmaUrl}
                onChange={onFigmaUrlChange}
              />
              <TextField
                label="GitHub Pages / preview URL"
                placeholder="https://your-preview.vercel.app"
                value={githubUrl}
                onChange={onGithubUrlChange}
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
          </TabPanel>
        </TabPanels>
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

- [ ] **Step 2: Verify TypeScript is clean**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/ArtifactInput.tsx
git commit -m "feat(via): migrate ArtifactInput to Via Tabs and TextField"
```

---

## Task 5: ContextForm — TextArea + TextField

**Files:**
- Modify: `components/ContextForm.tsx`

Via's `TextArea` and `TextField` `onChange` receives `string` directly (not `e.target.value`).

- [ ] **Step 1: Replace the entire file**

```typescript
'use client';

import { TextArea, TextField } from '@via-ds/components';

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
        onChange={onFeatureIntentChange}
      />
      <TextArea
        label="Workflow description"
        placeholder="Who uses it and how? Key flows?"
        value={workflow}
        onChange={onWorkflowChange}
      />
      <TextField
        label="User roles"
        placeholder="e.g. Admin, read-only viewer, new user"
        value={userRoles}
        onChange={onUserRolesChange}
      />
    </section>
  );
}
```

- [ ] **Step 2: Verify TypeScript is clean**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/ContextForm.tsx
git commit -m "feat(via): migrate ContextForm to Via TextArea and TextField"
```

---

## Task 6: PackSelector — Checkbox + TextArea

**Files:**
- Modify: `components/PackSelector.tsx`

Via `Checkbox` differences: label goes in `children` (not `label` prop), controlled state uses `isSelected` (not `checked`), `onChange` receives `boolean` (not event), no `bold` prop.

- [ ] **Step 1: Replace the entire file**

```typescript
'use client';

import { Checkbox, TextArea } from '@via-ds/components';
import type { HeuristicPack } from '@/lib/types';

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

  function toggle(packId: string, isSelected: boolean) {
    if (isSelected) {
      onSelectionChange([...selectedPackIds, packId]);
    } else {
      onSelectionChange(selectedPackIds.filter((id) => id !== packId));
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
              isSelected={selectedPackIds.includes(pack.pack_id)}
              onChange={(isSelected) => toggle(pack.pack_id, isSelected)}
            >
              {pack.pack_name}
            </Checkbox>
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
            onChange={onCustomRulesChange}
          />
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Verify TypeScript is clean**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/PackSelector.tsx
git commit -m "feat(via): migrate PackSelector to Via Checkbox and TextArea"
```

---

## Task 7: FindingCard — Card, Badge, Text

**Files:**
- Modify: `components/FindingCard.tsx`

Via `Card` has no React 19 type incompatibility so the `React.ComponentType<any>` cast is removed. `Badge` uses the same string variant values (`'red'`, `'yellow'`, `'blue'`, `'darkgray'`). `Body` → `<Text textStyle="body">`, `InlineCode` → `<Text textStyle="inlineCode">`.

- [ ] **Step 1: Replace the entire file**

```typescript
import { Card, Badge, Text } from '@via-ds/components';
import type { Finding } from '@/lib/types';

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
        <Text textStyle="body" elementType="span">{finding.title}</Text>
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

function RecommendationText({ text }: { text: string }) {
  const parts = text.split(/(LeafyGreen\s+[A-Za-z\s()]+?)(?=\.|,|$|\s+for|\s+when|\s+to)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('LeafyGreen') ? (
          <Text key={i} textStyle="inlineCode" elementType="code">{part.trim()}</Text>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}
```

- [ ] **Step 2: Verify TypeScript is clean**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/FindingCard.tsx
git commit -m "feat(via): migrate FindingCard to Via Card, Badge, Text"
```

---

## Task 8: LoadingState — ProgressBar

**Files:**
- Modify: `components/LoadingState.tsx`

Via has no `Spinner` — use `ProgressBar` with `isIndeterminate` for the same spinning effect.

- [ ] **Step 1: Replace the entire file**

```typescript
import { ProgressBar } from '@via-ds/components';

export const STEPS = [
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
      <ProgressBar label="Analyzing artifact" isIndeterminate className="w-48" />
      <p className="font-mono text-xs text-gray-400 uppercase tracking-widest">
        Analyzing artifact
      </p>
      <p className="text-sm text-gray-500">{step}</p>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript is clean**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/LoadingState.tsx
git commit -m "feat(via): migrate LoadingState to Via ProgressBar"
```

---

## Task 9: ReviewResults — Banner, Badge, Text, empty state

**Files:**
- Modify: `components/ReviewResults.tsx`

Changes:
- `Body` → `<Text textStyle="body">` (no more `React.ComponentType<any>` cast)
- `Banner variant="danger"` → `Banner variant="danger"` (same string — Via uses same values)
- `Badge` → same variant strings, just update import
- `BasicEmptyState` → simple `<div>` with `Text` components (Via has no EmptyState)

- [ ] **Step 1: Replace the entire file**

```typescript
import { Banner, Badge, Text } from '@via-ds/components';
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
      <div className="flex flex-col items-center justify-center h-full p-16 text-center gap-3">
        <Text textStyle="heading3" elementType="h2">No review yet</Text>
        <Text textStyle="body" elementType="p">
          Submit a Figma prototype or GitHub URL to start a UX review.
        </Text>
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
      <div className="border border-gray-200 rounded-xl p-5 mb-8">
        <SummaryRow label="ASSESSMENT">
          <Text textStyle="body">{summary.assessment}</Text>
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
            <Badge
              variant={
                summary.confidence === 'High'
                  ? 'blue'
                  : summary.confidence === 'Medium'
                  ? 'yellow'
                  : 'red'
              }
            >
              {summary.confidence}
            </Badge>
            <span className="text-xs text-gray-500">{summary.confidence_reason}</span>
          </div>
        </SummaryRow>
      </div>

      {open_questions.length > 0 && (
        <div className="mb-8">
          <Banner variant="warning">
            <strong>Open Questions</strong>
            <ul className="mt-2 space-y-1">
              {open_questions.map((q, i) => (
                <li key={i} className="text-sm">{q}</li>
              ))}
            </ul>
          </Banner>
        </div>
      )}

      {SEVERITY_ORDER.map((sev) => {
        const items = grouped[sev];
        if (!items || items.length === 0) return null;
        return (
          <section key={sev} className="mb-8">
            <div className="flex items-center gap-3 mb-3 pb-2 border-b border-gray-200">
              <Badge
                variant={
                  sev === 'Critical'
                    ? 'red'
                    : sev === 'Warning'
                    ? 'yellow'
                    : sev === 'Suggestion'
                    ? 'blue'
                    : 'darkgray'
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

- [ ] **Step 2: Verify TypeScript is clean**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/ReviewResults.tsx
git commit -m "feat(via): migrate ReviewResults to Via Banner, Badge, Text"
```

---

## Task 10: End-to-end verification

- [ ] **Step 1: Run all tests**

```bash
npm test
```

Expected: 8 tests pass.

- [ ] **Step 2: Start dev server and verify rendering**

```bash
npm run dev
```

Open http://localhost:3001 and confirm:
- Input sidebar renders with Via-styled tabs, inputs, checkboxes, and button
- Results panel shows Via empty state ("No review yet")
- No console errors about missing LeafyGreen or Via components

- [ ] **Step 3: Commit if any final fixups needed**

```bash
git add -A
git commit -m "fix(via): address any final migration issues"
```

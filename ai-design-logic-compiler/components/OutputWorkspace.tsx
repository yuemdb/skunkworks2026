'use client';

import { useState } from 'react';
import { Tabs, TabList, Tab, TabPanels, TabPanel, Button, Badge, Text } from '@via-ds/components';
import Copy from '@via-ds/icons/Copy';
import Checkmark from '@via-ds/icons/Checkmark';
import Download from '@via-ds/icons/Download';
import File from '@via-ds/icons/File';
import type { CompilerOutput } from '@/lib/types';
import type { FigmaScreenshot } from '@/lib/figma';
import {
  InteractionLogicTab,
  EdgeCasesTab,
  EngineeringHandoffTab,
  OpenQuestionsTab,
} from './OutputTab';

const INTERACTION_LOGIC_KEYS = [
  'feature_summary', 'actors', 'preconditions', 'main_flow', 'state_logic',
  'permission_logic', 'system_responses', 'exceptions', 'dependencies',
];
const SPECS_KEYS = ['ui_states', 'accessibility'];
const OPEN_QUESTIONS_KEYS = ['ambiguities', 'missing_decisions', 'assumptions_that_need_validation', 'design_questions'];

// ─── Markdown export ───────────────────────────────────────────────────────────

function list(items: string[]): string {
  return items.length > 0 ? items.map((i) => `- ${i}`).join('\n') : '_None_';
}

function buildMarkdown(output: CompilerOutput, featureName?: string): string {
  const il = output.interaction_logic;
  const eh = output.engineering_handoff;
  const oq = output.open_questions;
  const wc = output.what_changed;
  const sections: string[] = [];

  sections.push(`# ${featureName || 'Interaction Logic Spec'}`);
  sections.push(`_Compiled ${new Date(output.compiled_at).toLocaleString()}_\n`);
  sections.push(`## Interaction Logic`);
  if (il.feature_summary) sections.push(`**Summary:** ${il.feature_summary}\n`);
  if (il.actors.length)           sections.push(`### Actors\n${list(il.actors)}`);
  if (il.preconditions.length)    sections.push(`### Preconditions\n${list(il.preconditions)}`);
  if (il.main_flow.length)        sections.push(`### Main Flow\n${list(il.main_flow)}`);
  if (il.state_logic.length)      sections.push(`### State Logic\n${list(il.state_logic)}`);
  if (il.permission_logic.length) sections.push(`### Permission Logic\n${list(il.permission_logic)}`);
  if (il.system_responses.length) sections.push(`### System Responses\n${list(il.system_responses)}`);
  if (il.exceptions.length)       sections.push(`### Exceptions\n${list(il.exceptions)}`);
  if (il.dependencies.length)     sections.push(`### Dependencies\n${list(il.dependencies)}`);

  sections.push(`\n## Edge Cases`);
  if (output.edge_cases.length === 0) {
    sections.push('_No edge cases identified._');
  } else {
    output.edge_cases.forEach((ec) => {
      sections.push(
        `### [${ec.id}] ${ec.scenario}\n` +
        `- **Trigger:** ${ec.trigger}\n` +
        `- **Expected:** ${ec.expected_behavior}\n` +
        `- **Impact:** ${ec.user_impact}\n` +
        `- **Source:** ${ec.source}`
      );
    });
  }

  sections.push(`\n## Specs`);
  if (eh.ui_states.length)     sections.push(`### UI States\n${list(eh.ui_states)}`);
  if (eh.accessibility.length) sections.push(`### Accessibility\n${list(eh.accessibility)}`);

  sections.push(`\n## Open Questions`);
  if (oq.ambiguities.length)                       sections.push(`### Ambiguities\n${list(oq.ambiguities)}`);
  if (oq.missing_decisions.length)                 sections.push(`### Missing Decisions\n${list(oq.missing_decisions)}`);
  if (oq.assumptions_that_need_validation.length)  sections.push(`### Assumptions Needing Validation\n${list(oq.assumptions_that_need_validation)}`);
  if (oq.design_questions?.length)                 sections.push(`### Design Questions for Engineering\n${list(oq.design_questions)}`);
  if (!oq.ambiguities.length && !oq.missing_decisions.length && !oq.assumptions_that_need_validation.length && !oq.design_questions?.length) {
    sections.push('_No open questions — inputs were sufficiently complete._');
  }

  if (wc) {
    sections.push(`\n## What Changed`);
    sections.push(`**Decision:** ${wc.new_decision}\n`);
    if (wc.sections_changed.length) sections.push(`**Sections updated:** ${wc.sections_changed.map((s) => s.replace(/_/g, ' ')).join(', ')}\n`);
    if (wc.before_after_summary.length) {
      sections.push(`### Before / After`);
      wc.before_after_summary.forEach((item) => {
        sections.push(`**${item.section.replace(/_/g, ' ')}**\n- Before: ${item.before}\n- After: ${item.after}`);
      });
    }
    if (wc.handoff_changes.length) sections.push(`### Engineering Impact\n${list(wc.handoff_changes)}`);
  }

  return sections.join('\n\n');
}

function downloadMarkdown(output: CompilerOutput, featureName?: string) {
  const md = buildMarkdown(output, featureName);
  const slug = (featureName || output.interaction_logic.feature_summary || 'interaction-spec')
    .slice(0, 40).replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${slug}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Main component ────────────────────────────────────────────────────────────

interface OutputWorkspaceProps {
  output: CompilerOutput | null;
  previousOutput?: CompilerOutput | null;
  isLoading: boolean;
  figmaScreenshots?: FigmaScreenshot[];
  featureName?: string;
}

const TAB_KEYS = ['interaction-logic', 'edge-cases', 'specs', 'open-questions'] as const;
const TAB_NAMES: Record<typeof TAB_KEYS[number], string> = {
  'interaction-logic': 'Interaction Logic',
  'edge-cases': 'Edge Cases',
  'specs': 'Specs',
  'open-questions': 'Open Questions',
};

export function OutputWorkspace({ output, previousOutput, isLoading, figmaScreenshots = [], featureName }: OutputWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<string>('interaction-logic');
  const [copied, setCopied] = useState(false);

  const changedSections = output?.what_changed?.sections_changed ?? [];
  const newEdgeCaseIds  = output?.what_changed?.new_edge_cases ?? [];
  const isRecompile     = output?.compilation_mode === 'recompile';

  const tabHasChanges = (key: string) => {
    if (!isRecompile || !changedSections.length) return false;
    if (key === 'interaction-logic') return changedSections.some((s) => INTERACTION_LOGIC_KEYS.includes(s));
    if (key === 'edge-cases')        return changedSections.includes('edge_cases') || newEdgeCaseIds.length > 0;
    if (key === 'specs')             return changedSections.some((s) => SPECS_KEYS.includes(s));
    if (key === 'open-questions')    return changedSections.some((s) => OPEN_QUESTIONS_KEYS.includes(s));
    return false;
  };

  const prevIL = isRecompile ? previousOutput?.interaction_logic : undefined;
  const prevEH = isRecompile ? previousOutput?.engineering_handoff : undefined;
  const prevOQ = isRecompile ? previousOutput?.open_questions : undefined;

  async function handleCopy() {
    if (!output) return;
    await navigator.clipboard.writeText(buildMarkdown(output, featureName));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (isLoading && !output) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border border-lg-border bg-lg-surface">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-lg-border border-t-lg-green" />
          <Text textStyle="body" colorScheme="dark">Compiling…</Text>
        </div>
      </div>
    );
  }

  if (!output) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border border-lg-border bg-lg-surface">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-lg-card ring-1 ring-lg-border">
            <File className="h-5 w-5 text-lg-faint" role="presentation" />
          </div>
          <Text textStyle="subtitle" colorScheme="dark">No spec yet</Text>
          <Text textStyle="body" colorScheme="dark" className="mt-1">Add inputs on the left and hit Compile.</Text>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-full flex-col rounded-xl border border-lg-border bg-lg-surface overflow-hidden">
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-lg-base/70 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-lg-border border-t-lg-green" />
            <Text textStyle="body" colorScheme="dark">Recompiling…</Text>
          </div>
        </div>
      )}

      {/* Spec title + export controls — single row */}
      <div className="border-b border-lg-border px-5 pt-4 pb-3 shrink-0 flex items-center justify-between gap-4">
        <div className="min-w-0">
          {featureName
            ? <>
                <Text textStyle="heading2" elementType="h2" colorScheme="dark">{featureName}</Text>
              </>
            : <Text textStyle="subtitle" colorScheme="dark">Interaction spec</Text>
          }
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {output.compilation_mode === 'recompile' && (
            <Badge variant="yellow" colorScheme="dark">Spec updated</Badge>
          )}
          <Button
            colorScheme="dark"
            size="small"
            onPress={handleCopy}
            aria-label="Copy as Markdown"
          >
            {copied
              ? <Checkmark role="presentation" className="mr-1" />
              : <Copy role="presentation" className="mr-1" />
            }
            {copied ? 'Copied' : 'Copy'}
          </Button>
          <Button
            colorScheme="dark"
            size="small"
            onPress={() => downloadMarkdown(output, featureName)}
            aria-label="Download as Markdown"
          >
            <Download role="presentation" className="mr-1" />
            Export .md
          </Button>
        </div>
      </div>

      {/* Via Tabs */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <Tabs
          colorScheme="dark"
          selectedKey={activeTab}
          onSelectionChange={(key) => setActiveTab(String(key))}
          className="flex flex-col h-full"
        >
          <TabList
            colorScheme="dark"
            aria-label="Spec sections"
            className="[background:none] border-b border-lg-border"
          >
            {TAB_KEYS.map((tabKey) => (
              <Tab key={tabKey} colorScheme="dark">
                <span className="flex items-center gap-1.5">
                  {TAB_NAMES[tabKey]}
                  {tabHasChanges(tabKey) && (
                    <span className="inline-block h-2 w-2 rounded-full bg-lg-amber" />
                  )}
                </span>
              </Tab>
            ))}
          </TabList>

          <TabPanels className="flex-1 overflow-hidden">
            <TabPanel key="interaction-logic">
              <div className="overflow-y-auto p-5" style={{ height: 'calc(100vh - 260px)' }}>
                <InteractionLogicTab
                  data={output.interaction_logic}
                  previousData={prevIL}
                  changedSections={changedSections}
                  figmaScreenshots={figmaScreenshots}
                />
              </div>
            </TabPanel>

            <TabPanel key="edge-cases">
              <div className="overflow-y-auto p-5" style={{ height: 'calc(100vh - 260px)' }}>
                <EdgeCasesTab items={output.edge_cases} newEdgeCaseIds={newEdgeCaseIds} />
              </div>
            </TabPanel>

            <TabPanel key="specs">
              <div className="overflow-y-auto p-5" style={{ height: 'calc(100vh - 260px)' }}>
                <EngineeringHandoffTab data={output.engineering_handoff} previousData={prevEH} changedSections={changedSections} />
              </div>
            </TabPanel>

            <TabPanel key="open-questions">
              <div className="overflow-y-auto p-5" style={{ height: 'calc(100vh - 260px)' }}>
                <OpenQuestionsTab data={output.open_questions} previousData={prevOQ} changedSections={changedSections} />
              </div>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </div>
    </div>
  );
}

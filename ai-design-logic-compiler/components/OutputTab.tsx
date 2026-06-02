import React from 'react';
import { Text } from '@via-ds/components';
import type {
  EdgeCaseItem,
  EngineeringHandoff,
  InteractionLogicSpec,
  OpenQuestions,
} from '@/lib/types';
import type { FigmaScreenshot } from '@/lib/figma';
import { ChangeBadge } from './ChangeBadge';

// ─── Shared: normal section ────────────────────────────────────────────────────

function SectionBlock({
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
    <div className={`rounded-lg p-3 ${changed ? 'bg-lg-amber/5 ring-1 ring-lg-amber/20' : 'bg-lg-card'}`}>
      <div className="mb-2 flex items-center gap-1">
        <Text textStyle="subtitle" colorScheme="dark">{label}</Text>
        {changed && <ChangeBadge />}
      </div>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2">
            <span className="mt-1 shrink-0 text-lg-faint">•</span>
            <Text textStyle="body" colorScheme="dark">{item}</Text>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SummaryBlock({ text, changed }: { text: string; changed: boolean }) {
  return (
    <div className={`rounded-lg p-3 ${changed ? 'bg-lg-amber/5 ring-1 ring-lg-amber/20' : 'bg-lg-card'}`}>
      <div className="mb-2 flex items-center gap-1">
        <Text textStyle="subtitle" colorScheme="dark">Summary</Text>
        {changed && <ChangeBadge />}
      </div>
      <Text textStyle="body" colorScheme="dark">{text}</Text>
    </div>
  );
}

// ─── Shared: before/after split section ───────────────────────────────────────

function SectionDiff({ label, before, after }: { label: string; before: string[]; after: string[] }) {
  return (
    <div className="overflow-hidden rounded-lg ring-1 ring-lg-amber/25">
      <div className="flex items-center gap-2 border-b border-lg-border bg-lg-surface px-3 py-2">
        <Text textStyle="subtitle" colorScheme="dark">{label}</Text>
        <ChangeBadge />
      </div>
      <div className="grid grid-cols-2 divide-x divide-lg-border">
        <div className="bg-[#CF4A22]/[0.04] p-3">
          <Text textStyle="subtitle" colorScheme="dark" className="mb-2 block text-[#CF4A22]/60">Before</Text>
          <ul className="space-y-1.5">
            {before.length > 0 ? before.map((item, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-1 shrink-0 text-lg-faint">•</span>
                <Text textStyle="body" colorScheme="dark" className="text-lg-muted line-through decoration-[#CF4A22]/30">{item}</Text>
              </li>
            )) : <li className="text-xs text-lg-faint italic">Empty</li>}
          </ul>
        </div>
        <div className="bg-[#00ED64]/[0.04] p-3">
          <Text textStyle="subtitle" colorScheme="dark" className="mb-2 block text-lg-green/60">After</Text>
          <ul className="space-y-1.5">
            {after.length > 0 ? after.map((item, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-1 shrink-0 text-lg-faint">•</span>
                <Text textStyle="body" colorScheme="dark">{item}</Text>
              </li>
            )) : <li className="text-xs text-lg-faint italic">Empty</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}

function SummaryDiff({ label = 'Summary', before, after }: { label?: string; before: string; after: string }) {
  return (
    <div className="overflow-hidden rounded-lg ring-1 ring-lg-amber/25">
      <div className="flex items-center gap-2 border-b border-lg-border bg-lg-surface px-3 py-2">
        <Text textStyle="subtitle" colorScheme="dark">{label}</Text>
        <ChangeBadge />
      </div>
      <div className="grid grid-cols-2 divide-x divide-lg-border">
        <div className="bg-[#CF4A22]/[0.04] p-3">
          <Text textStyle="subtitle" colorScheme="dark" className="mb-2 block text-[#CF4A22]/60">Before</Text>
          <Text textStyle="body" colorScheme="dark" className="text-lg-muted line-through decoration-[#CF4A22]/30">{before || '—'}</Text>
        </div>
        <div className="bg-[#00ED64]/[0.04] p-3">
          <Text textStyle="subtitle" colorScheme="dark" className="mb-2 block text-lg-green/60">After</Text>
          <Text textStyle="body" colorScheme="dark">{after || '—'}</Text>
        </div>
      </div>
    </div>
  );
}

// ─── Source link renderer ─────────────────────────────────────────────────────

const URL_RE = /https?:\/\/[^\s)>\]"']+/g;

function SourceLink({ source }: { source: string }) {
  const parts: React.ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  URL_RE.lastIndex = 0;
  while ((match = URL_RE.exec(source)) !== null) {
    if (match.index > last) parts.push(source.slice(last, match.index));
    const url = match[0];
    parts.push(
      <a
        key={match.index}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2 text-lg-green/80 hover:text-lg-green transition-colors"
      >
        {url}
      </a>
    );
    last = match.index + url.length;
  }
  if (last < source.length) parts.push(source.slice(last));
  return <>{parts}</>;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function renderSection(
  key: string,
  label: string,
  currentItems: string[],
  previousItems: string[] | undefined,
  changedSections: string[],
) {
  const isChanged = changedSections.includes(key);
  if (isChanged && previousItems !== undefined) {
    return <SectionDiff key={key} label={label} before={previousItems} after={currentItems} />;
  }
  return <SectionBlock key={key} label={label} items={currentItems} changed={false} />;
}

// ─── Interaction Logic Tab ─────────────────────────────────────────────────────

interface InteractionLogicTabProps {
  data: InteractionLogicSpec;
  previousData?: InteractionLogicSpec;
  changedSections: string[];
  figmaScreenshots?: FigmaScreenshot[];
}

export function InteractionLogicTab({ data, previousData, changedSections, figmaScreenshots = [] }: InteractionLogicTabProps) {
  const isChanged = (key: string) => changedSections.includes(key);
  const hasScreenshots = figmaScreenshots.length > 0;

  const summaryChanged = isChanged('feature_summary');
  const mainFlowChanged = isChanged('main_flow');

  return (
    <div className="space-y-1">
      {/* Summary */}
      {data.feature_summary && (
        summaryChanged && previousData
          ? <SummaryDiff before={previousData.feature_summary} after={data.feature_summary} />
          : <SummaryBlock text={data.feature_summary} changed={false} />
      )}

      {renderSection('actors', 'Actors', data.actors, previousData?.actors, changedSections)}
      {renderSection('preconditions', 'Preconditions', data.preconditions, previousData?.preconditions, changedSections)}

      {/* Main Flow — storyboard with inline screenshots */}
      {data.main_flow.length > 0 && (
        mainFlowChanged && previousData ? (
          <div className="overflow-hidden rounded-lg ring-1 ring-lg-amber/25">
            <div className="flex items-center gap-2 border-b border-lg-border bg-lg-surface px-3 py-2">
              <Text textStyle="subtitle" colorScheme="dark">Main Flow</Text>
              <ChangeBadge />
            </div>
            <div className="grid grid-cols-2 divide-x divide-lg-border">
              <div className="bg-[#CF4A22]/[0.04] p-3">
                <Text textStyle="subtitle" colorScheme="dark" className="mb-3 block text-[#CF4A22]/60">Before</Text>
                <div className="space-y-0">
                  {previousData.main_flow.map((step, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-lg-card ring-1 ring-lg-border">
                          <Text textStyle="disclaimer" colorScheme="dark">{i + 1}</Text>
                        </div>
                        {i < previousData.main_flow.length - 1 && <div className="w-px flex-1 min-h-[16px] bg-lg-border" />}
                      </div>
                      <Text textStyle="body" colorScheme="dark" className="pt-0.5 pb-3 text-lg-muted line-through decoration-[#CF4A22]/30">{step}</Text>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-[#00ED64]/[0.04] p-3">
                <Text textStyle="subtitle" colorScheme="dark" className="mb-3 block text-lg-green/60">After</Text>
                <div className="space-y-0">
                  {data.main_flow.map((step, i) => {
                    const screen = figmaScreenshots[i];
                    return (
                      <div key={i} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-lg-card ring-1 ring-lg-border">
                            <Text textStyle="disclaimer" colorScheme="dark">{i + 1}</Text>
                          </div>
                          {i < data.main_flow.length - 1 && <div className="w-px flex-1 min-h-[8px] bg-lg-border" />}
                        </div>
                        <div className={`min-w-0 flex-1 ${i < data.main_flow.length - 1 ? 'pb-2' : ''}`}>
                          <Text textStyle="body" colorScheme="dark" className="pt-0.5">{step}</Text>
                          {screen && (
                            <div className="mt-2 mb-1 overflow-hidden rounded-lg border border-lg-border bg-lg-card/60">
                              <img src={screen.url} alt={screen.name} className="w-full object-cover" />
                              <Text textStyle="disclaimer" colorScheme="dark" className="block px-2.5 py-1.5">{screen.name}</Text>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-lg bg-lg-card p-3">
            <Text textStyle="subtitle" colorScheme="dark" className="mb-3 block">Main Flow</Text>
            <div className="space-y-0">
              {data.main_flow.map((step, i) => {
                const screen = figmaScreenshots[i];
                return (
                  <div key={i} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-lg-card ring-1 ring-lg-border">
                        <Text textStyle="disclaimer" colorScheme="dark">{i + 1}</Text>
                      </div>
                      {i < data.main_flow.length - 1 && <div className={`w-px flex-1 bg-lg-border ${screen ? 'min-h-[8px]' : 'min-h-[16px]'}`} />}
                    </div>
                    <div className={`min-w-0 flex-1 ${i < data.main_flow.length - 1 ? 'pb-3' : ''}`}>
                      <Text textStyle="body" colorScheme="dark" className="pt-0.5">{step}</Text>
                      {screen && (
                        <div className="mt-2 overflow-hidden rounded-lg border border-lg-border bg-lg-card/60">
                          <img src={screen.url} alt={screen.name} className="w-full object-cover" />
                          <Text textStyle="disclaimer" colorScheme="dark" className="block px-2.5 py-1.5">{screen.name}</Text>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {hasScreenshots && figmaScreenshots.length > data.main_flow.length && (
                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-lg-border pt-3">
                  {figmaScreenshots.slice(data.main_flow.length).map((s) => (
                    <div key={s.id} className="overflow-hidden rounded-lg border border-lg-border bg-lg-card/60">
                      <img src={s.url} alt={s.name} className="w-full object-cover" />
                      <Text textStyle="disclaimer" colorScheme="dark" className="block px-2.5 py-1.5">{s.name}</Text>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      )}

      {renderSection('state_logic', 'State Logic', data.state_logic, previousData?.state_logic, changedSections)}
      {renderSection('permission_logic', 'Permission Logic', data.permission_logic, previousData?.permission_logic, changedSections)}
      {renderSection('system_responses', 'System Responses', data.system_responses, previousData?.system_responses, changedSections)}
      {renderSection('exceptions', 'Exceptions', data.exceptions, previousData?.exceptions, changedSections)}
      {renderSection('dependencies', 'Dependencies', data.dependencies, previousData?.dependencies, changedSections)}
    </div>
  );
}

// ─── Edge Cases Tab ────────────────────────────────────────────────────────────

interface EdgeCasesTabProps {
  items: EdgeCaseItem[];
  newEdgeCaseIds: string[];
}

export function EdgeCasesTab({ items, newEdgeCaseIds }: EdgeCasesTabProps) {
  if (items.length === 0) {
    return <Text textStyle="body" colorScheme="dark">No edge cases identified.</Text>;
  }
  return (
    <div className="space-y-3">
      {items.map((ec) => (
        <div
          key={ec.id}
          className={`rounded-lg border p-4 transition-colors ${
            newEdgeCaseIds.includes(ec.id)
              ? 'border-lg-amber/30 bg-lg-amber/5'
              : 'border-lg-border bg-lg-card'
          }`}
        >
          <div className="mb-2 flex items-center gap-2">
            <span className="font-mono text-xs text-lg-faint">{ec.id}</span>
            {newEdgeCaseIds.includes(ec.id) && <ChangeBadge />}
          </div>
          <Text textStyle="subtitle" colorScheme="dark" className="mb-3 block">{ec.scenario}</Text>
          <div className="space-y-1">
            <Text textStyle="body" colorScheme="dark" className="block"><span className="font-medium text-lg-muted">Trigger:</span> {ec.trigger}</Text>
            <Text textStyle="body" colorScheme="dark" className="block"><span className="font-medium text-lg-muted">Expected:</span> {ec.expected_behavior}</Text>
            <Text textStyle="body" colorScheme="dark" className="block"><span className="font-medium text-lg-muted">Impact:</span> {ec.user_impact}</Text>
            <Text textStyle="body" colorScheme="dark" className="block"><span className="font-medium text-lg-muted">Source:</span> <SourceLink source={ec.source} /></Text>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Specs Tab ─────────────────────────────────────────────────────────────────

interface EngineeringHandoffTabProps {
  data: EngineeringHandoff;
  previousData?: EngineeringHandoff;
  changedSections: string[];
}

export function EngineeringHandoffTab({ data, previousData, changedSections }: EngineeringHandoffTabProps) {
  return (
    <div className="space-y-1">
      {renderSection('ui_states', 'UI States', data.ui_states, previousData?.ui_states, changedSections)}
      {renderSection('accessibility', 'Accessibility', data.accessibility, previousData?.accessibility, changedSections)}
    </div>
  );
}

// ─── Open Questions Tab ────────────────────────────────────────────────────────

interface OpenQuestionsTabProps {
  data: OpenQuestions;
  previousData?: OpenQuestions;
  changedSections: string[];
}

export function OpenQuestionsTab({ data, previousData, changedSections }: OpenQuestionsTabProps) {
  const isEmpty =
    data.ambiguities.length === 0 &&
    data.missing_decisions.length === 0 &&
    data.assumptions_that_need_validation.length === 0 &&
    (data.design_questions ?? []).length === 0;

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="mb-2 text-2xl text-lg-green">✓</div>
        <Text textStyle="body" colorScheme="dark" className="font-medium">No open questions</Text>
        <Text textStyle="disclaimer" colorScheme="dark" className="mt-1">Inputs were sufficiently complete.</Text>
      </div>
    );
  }
  return (
    <div className="space-y-1">
      {renderSection('ambiguities', 'Ambiguities', data.ambiguities, previousData?.ambiguities, changedSections)}
      {renderSection('missing_decisions', 'Missing Decisions', data.missing_decisions, previousData?.missing_decisions, changedSections)}
      {renderSection('assumptions_that_need_validation', 'Assumptions Needing Validation', data.assumptions_that_need_validation, previousData?.assumptions_that_need_validation, changedSections)}
      {renderSection('design_questions', 'Design Questions for Engineering', data.design_questions ?? [], previousData?.design_questions, changedSections)}
    </div>
  );
}

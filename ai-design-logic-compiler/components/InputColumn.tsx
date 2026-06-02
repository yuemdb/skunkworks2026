'use client';

import { useEffect, useState } from 'react';
import { Button, TextField, TextArea, MenuRoot, MenuPopover, Menu, MenuItem, Text } from '@via-ds/components';
import X from '@via-ds/icons/X';
import type { CompilerInput } from '@/lib/types';
import { emptyInput } from '@/lib/types';
import type { FigmaContextInput, FigmaScreenshot } from '@/lib/figma';

type FieldType = 'prfaq' | 'designer_logic' | 'figma_context' | 'prototype_code';

interface DynamicField {
  id: string;
  type: FieldType;
  value: string;
}

const FIELD_OPTIONS: { type: FieldType; label: string; placeholder: string }[] = [
  {
    type: 'prfaq',
    label: 'PRFAQ / PD / Feature Context',
    placeholder: 'Paste your full PRFAQ, feature brief, or any product context document…',
  },
  {
    type: 'figma_context',
    label: 'Figma MCP / Figma Prototype',
    placeholder: 'Screens, entry point, happy path, notable states, key interactions, annotations, known gaps…',
  },
  {
    type: 'prototype_code',
    label: 'Vibe Code / Prototype / Github link',
    placeholder: 'Extracted interaction-relevant code will appear here. You can edit it before compiling…',
  },
  {
    type: 'designer_logic',
    label: 'Custom Logic',
    placeholder: 'Interaction rules, behavioral constraints, edge case notes from design…',
  },
];

function buildCompilerInput(featureName: string, fields: DynamicField[]): CompilerInput {
  const join = (type: FieldType) =>
    fields.filter((f) => f.type === type).map((f) => f.value).join('\n\n');

  const prototypeField = fields.filter((f) => f.type === 'prototype_code').at(-1);

  return {
    ...emptyInput,
    prfaq: { ...emptyInput.prfaq, feature_name: featureName, feature_goal: join('prfaq') },
    designer_logic: { rules: [], raw_text: join('designer_logic') },
    figma_context: { ...emptyInput.figma_context, screens: join('figma_context') },
    prototype_code: prototypeField?.value?.trim() || undefined,
    compilation_mode: 'initial',
  };
}

interface InputColumnProps {
  onChange: (input: CompilerInput) => void;
  onCompile: () => void;
  onRecompile: () => void;
  onFigmaScreenshots: (screenshots: FigmaScreenshot[]) => void;
  isLoading: boolean;
  hasOutput: boolean;
  hasChangedSinceCompile: boolean;
}

let nextId = 0;
const uid = () => String(++nextId);

interface FigmaImportResult {
  context: FigmaContextInput;
  screenshots: FigmaScreenshot[];
}

async function importFromFigma(url: string): Promise<FigmaImportResult> {
  const res = await fetch('/api/figma', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Figma import failed');
  return data as FigmaImportResult;
}

function formatFigmaContext(ctx: FigmaContextInput): string {
  const lines: string[] = [];
  if (ctx.screens)              lines.push(`Screens: ${ctx.screens}`);
  if (ctx.entry_point)          lines.push(`Entry Point: ${ctx.entry_point}`);
  if (ctx.main_happy_path)      lines.push(`Main Happy Path: ${ctx.main_happy_path}`);
  if (ctx.notable_states)       lines.push(`Notable States: ${ctx.notable_states}`);
  if (ctx.key_interactions)     lines.push(`Key Interactions: ${ctx.key_interactions}`);
  if (ctx.annotations_or_notes) lines.push(`Annotations: ${ctx.annotations_or_notes}`);
  if (ctx.known_gaps)           lines.push(`Known Gaps: ${ctx.known_gaps}`);
  return lines.join('\n');
}

export function InputColumn({
  onChange,
  onCompile,
  onRecompile,
  onFigmaScreenshots,
  isLoading,
  hasOutput,
  hasChangedSinceCompile,
}: InputColumnProps) {
  const [featureName, setFeatureName] = useState('');
  const [fields, setFields] = useState<DynamicField[]>([]);
  const [figmaUrls, setFigmaUrls]               = useState<Record<string, string>>({});
  const [figmaLoading, setFigmaLoading]         = useState<Record<string, boolean>>({});
  const [figmaErrors, setFigmaErrors]           = useState<Record<string, string>>({});
  const [prototypeSources, setPrototypeSources] = useState<Record<string, string>>({});
  const [prototypeLoading, setPrototypeLoading] = useState<Record<string, boolean>>({});
  const [prototypeErrors, setPrototypeErrors]   = useState<Record<string, string>>({});

  useEffect(() => {
    onChange(buildCompilerInput(featureName, fields));
  }, [featureName, fields]); // eslint-disable-line react-hooks/exhaustive-deps

  function addField(type: FieldType) {
    setFields((prev) => [...prev, { id: uid(), type, value: '' }]);
  }

  function updateField(id: string, value: string) {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, value } : f)));
  }

  function removeField(id: string) {
    setFields((prev) => prev.filter((f) => f.id !== id));
  }

  async function handlePrototypeImport(fieldId: string) {
    const source = prototypeSources[fieldId] ?? '';
    if (!source.trim()) return;
    setPrototypeLoading((prev) => ({ ...prev, [fieldId]: true }));
    setPrototypeErrors((prev) => ({ ...prev, [fieldId]: '' }));
    try {
      const res = await fetch('/api/prototype', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: source.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Import failed');
      updateField(fieldId, data.content as string);
    } catch (err) {
      setPrototypeErrors((prev) => ({
        ...prev,
        [fieldId]: err instanceof Error ? err.message : 'Import failed',
      }));
    } finally {
      setPrototypeLoading((prev) => ({ ...prev, [fieldId]: false }));
    }
  }

  async function handleFigmaImport(fieldId: string) {
    const url = figmaUrls[fieldId] ?? '';
    if (!url.trim()) return;
    setFigmaLoading((prev) => ({ ...prev, [fieldId]: true }));
    setFigmaErrors((prev) => ({ ...prev, [fieldId]: '' }));
    try {
      const { context, screenshots } = await importFromFigma(url.trim());
      updateField(fieldId, formatFigmaContext(context));
      if (screenshots.length > 0) onFigmaScreenshots(screenshots);
    } catch (err) {
      setFigmaErrors((prev) => ({
        ...prev,
        [fieldId]: err instanceof Error ? err.message : 'Import failed',
      }));
    } finally {
      setFigmaLoading((prev) => ({ ...prev, [fieldId]: false }));
    }
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto pr-1">
      {/* Feature Name */}
      <TextField
        colorScheme="dark"
        label="Feature Name"
        placeholder="e.g. Bulk Export"
        value={featureName}
        onChange={(value: string) => setFeatureName(value)}
      />

      {/* Dynamic fields */}
      {fields.map((field) => {
        const config      = FIELD_OPTIONS.find((o) => o.type === field.type)!;
        const isFigma     = field.type === 'figma_context';
        const isPrototype = field.type === 'prototype_code';

        return (
          <div
            key={field.id}
            className="relative rounded-lg border p-3 border-lg-border bg-lg-card"
          >
            {/* Remove button — floats over the top-right of the label */}
            <Button
              variant="ghost"
              colorScheme="dark"
              size="small"
              aria-label="Remove field"
              className="absolute right-1.5 top-1.5 z-10"
              onPress={() => removeField(field.id)}
            >
              <X role="presentation" />
            </Button>

            {/* Figma URL import row */}
            {isFigma && (
              <div className="mb-3 pr-7">
                <div className="flex items-stretch gap-2">
                  <div className="min-w-0 flex-1">
                    <TextField
                      colorScheme="dark"
                      label="Figma URL"
                      type="url"
                      placeholder="Paste Figma URL to import…"
                      value={figmaUrls[field.id] ?? ''}
                      onChange={(value: string) =>
                        setFigmaUrls((prev) => ({ ...prev, [field.id]: value }))
                      }
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      colorScheme="dark"
                      onPress={() => handleFigmaImport(field.id)}
                      isDisabled={figmaLoading[field.id] || !figmaUrls[field.id]?.trim()}
                      isPending={figmaLoading[field.id]}
                    >
                      {figmaLoading[field.id] ? 'Importing…' : 'Import'}
                    </Button>
                  </div>
                </div>
                {figmaErrors[field.id] && (
                  <Text textStyle="disclaimer" colorScheme="dark" className="mt-1 block text-red-400">{figmaErrors[field.id]}</Text>
                )}
              </div>
            )}

            {/* Prototype URL/path import row */}
            {isPrototype && (
              <div className="mb-3 pr-7">
                <div className="flex items-stretch gap-2">
                  <div className="min-w-0 flex-1">
                    <TextField
                      colorScheme="dark"
                      label="Path or URL"
                      placeholder="/absolute/path  or  https://github.com/owner/repo"
                      value={prototypeSources[field.id] ?? ''}
                      onChange={(value: string) =>
                        setPrototypeSources((prev) => ({ ...prev, [field.id]: value }))
                      }
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      colorScheme="dark"
                      onPress={() => handlePrototypeImport(field.id)}
                      isDisabled={prototypeLoading[field.id] || !prototypeSources[field.id]?.trim()}
                      isPending={prototypeLoading[field.id]}
                    >
                      {prototypeLoading[field.id] ? 'Reading…' : 'Import'}
                    </Button>
                  </div>
                </div>
                {prototypeErrors[field.id] && (
                  <Text textStyle="disclaimer" colorScheme="dark" className="mt-1 block text-red-400">{prototypeErrors[field.id]}</Text>
                )}
              </div>
            )}

            {/* Via TextArea — label is part of the component */}
            <div className="pr-7">
              <TextArea
                colorScheme="dark"
                label={config.label}
                placeholder={config.placeholder}
                value={field.value}
                onChange={(value: string) => updateField(field.id, value)}
              />
            </div>
          </div>
        );
      })}

      {/* Add field — Via MenuRoot */}
      <MenuRoot>
        <Button colorScheme="dark" className="w-full" aria-label="Add context / logic">
          + Add context / logic
        </Button>
        <MenuPopover style={{ width: 'var(--trigger-width)' }}>
          <Menu
            aria-label="Field type"
            onAction={(key) => addField(key as FieldType)}
            className="min-w-0 w-full"
          >
            {FIELD_OPTIONS.map((opt) => (
              <MenuItem key={opt.type} id={opt.type}>
                <Text textStyle="body" colorScheme="dark">{opt.label}</Text>
              </MenuItem>
            ))}
          </Menu>
        </MenuPopover>
      </MenuRoot>

      {/* Action buttons */}
      <div className="mt-auto flex gap-3 pb-4 pt-1">
        <Button
          colorScheme="dark"
          variant="primary"
          className="flex-1"
          onPress={onCompile}
          isDisabled={isLoading}
          isPending={isLoading && !hasOutput}
        >
          {isLoading && !hasOutput ? 'Compiling…' : 'Compile'}
        </Button>

        <div className="group relative flex-1">
          <Button
            colorScheme="dark"
            variant={hasOutput && hasChangedSinceCompile ? 'primaryOutline' : undefined}
            className="w-full"
            onPress={onRecompile}
            isDisabled={isLoading || !hasOutput || !hasChangedSinceCompile}
            isPending={isLoading && hasOutput}
          >
            {isLoading && hasOutput ? 'Recompiling…' : 'Recompile and compare changes'}
          </Button>
          {hasOutput && !hasChangedSinceCompile && !isLoading && (
            <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 hidden w-48 -translate-x-1/2 rounded-lg border border-lg-border bg-lg-surface px-3 py-2 text-center text-xs text-lg-muted shadow-xl group-hover:block">
              Modify any input — add Figma context, a PRFAQ, or a new decision — then Recompile
              <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-lg-border" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

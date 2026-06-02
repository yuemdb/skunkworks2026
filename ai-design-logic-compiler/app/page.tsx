'use client';

import { useState, useRef, useCallback, useMemo } from 'react';
import { Text } from '@via-ds/components';
import LightningBolt from '@via-ds/icons/LightningBolt';
import type { CompilerInput, CompilerOutput } from '@/lib/types';
import { emptyInput } from '@/lib/types';
import { compile, recompile } from '@/lib/compiler';
import { InputColumn } from '@/components/InputColumn';
import { OutputWorkspace } from '@/components/OutputWorkspace';
import type { FigmaScreenshot } from '@/lib/figma';

export default function Home() {
  const [input, setInput] = useState<CompilerInput>(emptyInput);
  const [output, setOutput] = useState<CompilerOutput | null>(null);
  const [previousOutput, setPreviousOutput] = useState<CompilerOutput | null>(null);
  const [lastCompiledInput, setLastCompiledInput] = useState<CompilerInput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [figmaScreenshots, setFigmaScreenshots] = useState<FigmaScreenshot[]>([]);
  const pendingScreenshots = useRef<FigmaScreenshot[]>([]);

  const hasChangedSinceCompile = useMemo(() =>
    lastCompiledInput !== null && JSON.stringify(input) !== JSON.stringify(lastCompiledInput),
    [input, lastCompiledInput]
  );
  const [leftWidth, setLeftWidth] = useState(380);
  const isDragging = useRef(false);

  const onDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    const startX = e.clientX;
    const startWidth = leftWidth;

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const newWidth = Math.min(600, Math.max(260, startWidth + e.clientX - startX));
      setLeftWidth(newWidth);
    };
    const onMouseUp = () => {
      isDragging.current = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [leftWidth]);

  async function handleCompile() {
    // Always a fresh compile — clear any previous output first
    setOutput(null);
    setPreviousOutput(null);
    setLastCompiledInput(null);
    setFigmaScreenshots(pendingScreenshots.current);
    setIsLoading(true);
    setError(null);
    try {
      const snapshot = { ...input };
      const result = await compile(input);
      setOutput(result);
      setPreviousOutput(result);
      setLastCompiledInput(snapshot);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Compile failed. Try again.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRecompile() {
    if (!previousOutput) return;
    setFigmaScreenshots(pendingScreenshots.current);
    setIsLoading(true);
    setError(null);
    try {
      const snapshot = { ...input };
      const result = await recompile(input, previousOutput);
      setPreviousOutput(output!);
      setOutput(result);
      setLastCompiledInput(snapshot);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Recompile failed. Try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex h-screen flex-col bg-lg-base text-lg-text font-sans">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-lg-border bg-lg-surface px-6 py-3.5 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-lg-green/10 ring-1 ring-inset ring-lg-green/30">
            <LightningBolt className="h-4 w-4 text-lg-green" role="presentation" />
          </div>
          <div>
            <Text textStyle="subtitle" elementType="h1" colorScheme="dark">AI Design Logic Compiler</Text>
            <Text textStyle="body" colorScheme="dark">
              Compile fragmented product intent into a structured interaction spec
            </Text>
          </div>
        </div>
        {output && (
          <div className="flex items-center gap-2">
            {output.compilation_mode === 'recompile' && (
              <span className="rounded-full bg-lg-amber/10 px-2.5 py-0.5 text-xs font-medium text-lg-amber ring-1 ring-inset ring-lg-amber/20">
                Spec updated
              </span>
            )}
            <span className="rounded-full bg-lg-green/10 px-2.5 py-0.5 text-xs font-medium text-lg-green ring-1 ring-inset ring-lg-green/20">
              {output.compilation_mode === 'recompile' ? 'Recompiled' : 'Compiled'} · {new Date(output.compiled_at).toLocaleTimeString()}
            </span>
          </div>
        )}
      </header>

      {/* Error banner */}
      {error && (
        <div className="mx-6 mt-3 shrink-0 rounded-lg border border-lg-red/40 bg-lg-red/10 px-4 py-2.5 text-sm text-lg-red flex items-center justify-between">
          <Text textStyle="body" colorScheme="dark">{error}</Text>
          <button
            onClick={() => setError(null)}
            className="ml-3 text-lg-red/60 hover:text-lg-red transition-colors"
          >
            ✕
          </button>
        </div>
      )}

      {/* Two-column layout */}
      <div className="flex flex-1 overflow-hidden px-6 py-5">
        {/* Left: Inputs */}
        <div style={{ width: leftWidth }} className="shrink-0">
          <InputColumn
            onChange={setInput}
            onCompile={handleCompile}
            onRecompile={handleRecompile}
            onFigmaScreenshots={(s) => { pendingScreenshots.current = s; }}
            isLoading={isLoading}
            hasOutput={!!output}
            hasChangedSinceCompile={hasChangedSinceCompile}
          />
        </div>

        {/* Drag handle */}
        <div
          onMouseDown={onDragStart}
          className="mx-2 w-1 shrink-0 cursor-col-resize rounded-full bg-lg-border transition-colors hover:bg-lg-green/50 active:bg-lg-green"
        />

        {/* Right: Outputs */}
        <div className="flex-1 min-w-0">
          <OutputWorkspace output={output} previousOutput={previousOutput} isLoading={isLoading} figmaScreenshots={figmaScreenshots} featureName={input.prfaq.feature_name} />
        </div>
      </div>
    </div>
  );
}

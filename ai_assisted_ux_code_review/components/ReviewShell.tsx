'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@via-ds/components';
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

    stopStepCycle();
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
            onPress={runReview}
            isDisabled={isLoading}
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

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

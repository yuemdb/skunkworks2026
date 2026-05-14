'use client';

import { TextArea } from '@via-ds/components';

interface Props {
  context: string;
  onContextChange: (v: string) => void;
}

export default function ContextForm({ context, onContextChange }: Props) {
  return (
    <section className="p-6 border-b border-gray-200 flex flex-col gap-4">
      <p className="text-xs font-mono text-gray-400 uppercase tracking-widest">Context</p>
      <TextArea
        label="Design brief or PRfaq"
        placeholder="Paste your PRfaq, design brief, or describe the feature intent, workflows, and user roles…"
        value={context}
        onChange={onContextChange}
      />
    </section>
  );
}

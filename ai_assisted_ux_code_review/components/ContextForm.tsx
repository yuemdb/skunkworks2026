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

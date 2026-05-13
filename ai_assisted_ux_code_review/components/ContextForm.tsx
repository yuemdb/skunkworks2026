'use client';

import { TextArea } from '@leafygreen-ui/text-area';
import { TextInput } from '@leafygreen-ui/text-input';

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

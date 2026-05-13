'use client';

import { Checkbox } from '@leafygreen-ui/checkbox';
import { TextArea } from '@leafygreen-ui/text-area';
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

  function toggle(packId: string) {
    if (selectedPackIds.includes(packId)) {
      onSelectionChange(selectedPackIds.filter((id) => id !== packId));
    } else {
      onSelectionChange([...selectedPackIds, packId]);
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
              label={pack.pack_name}
              checked={selectedPackIds.includes(pack.pack_id)}
              onChange={() => toggle(pack.pack_id)}
              bold
            />
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
            onChange={(e) => onCustomRulesChange(e.target.value)}
            rows={3}
          />
        </div>
      )}
    </section>
  );
}

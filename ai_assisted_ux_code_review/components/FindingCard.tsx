import { Card, Badge, Text } from '@via-ds/components';
import type { Finding } from '@/lib/types';

const BADGE_VARIANT: Record<Finding['severity'], 'red' | 'yellow' | 'blue' | 'darkgray'> = {
  Critical: 'red',
  Warning: 'yellow',
  Suggestion: 'blue',
  Accessibility: 'darkgray',
};

interface Props {
  finding: Finding;
}

export default function FindingCard({ finding }: Props) {
  return (
    <Card className="mb-2">
      <div className="flex items-start gap-3 mb-3">
        <Badge variant={BADGE_VARIANT[finding.severity]}>{finding.severity}</Badge>
        <Text textStyle="body" elementType="span">{finding.title}</Text>
      </div>
      <dl className="flex flex-col gap-2">
        <FindingRow label="WHY">{finding.why}</FindingRow>
        <FindingRow label="RECOMMEND">
          <RecommendationText text={finding.recommendation} />
        </FindingRow>
        <FindingRow label="EVIDENCE">{finding.evidence}</FindingRow>
      </dl>
    </Card>
  );
}

function FindingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 text-sm">
      <dt className="font-mono text-xs text-gray-400 tracking-wide min-w-[80px] shrink-0 pt-0.5">
        {label}
      </dt>
      <dd className="text-gray-600 leading-relaxed">{children}</dd>
    </div>
  );
}

function RecommendationText({ text }: { text: string }) {
  const parts = text.split(/(LeafyGreen\s+[A-Za-z\s()]+?)(?=\.|,|$|\s+for|\s+when|\s+to)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('LeafyGreen') ? (
          <Text key={i} textStyle="inlineCode" elementType="code">{part.trim()}</Text>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

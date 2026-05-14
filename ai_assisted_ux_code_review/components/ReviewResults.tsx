import { Banner, Badge, Text } from '@via-ds/components';
import FindingCard from './FindingCard';
import LoadingState from './LoadingState';
import type { ReviewState, Finding } from '@/lib/types';

const SEVERITY_ORDER: Finding['severity'][] = ['Critical', 'Warning', 'Suggestion', 'Accessibility'];

interface Props {
  state: ReviewState;
}

export default function ReviewResults({ state }: Props) {
  if (state.status === 'idle') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-16 text-center gap-3">
        <Text textStyle="heading3" elementType="h2">No review yet</Text>
        <Text textStyle="body" elementType="p">
          Submit a Figma prototype or GitHub URL to start a UX review.
        </Text>
      </div>
    );
  }

  if (state.status === 'loading') {
    return <LoadingState step={state.step} />;
  }

  if (state.status === 'error') {
    return (
      <div className="p-8">
        <Banner variant="danger">{state.message}</Banner>
      </div>
    );
  }

  const { data } = state;
  const { summary, findings, open_questions } = data;

  const grouped = SEVERITY_ORDER.reduce<Record<string, Finding[]>>((acc, sev) => {
    acc[sev] = findings.filter((f) => f.severity === sev);
    return acc;
  }, {} as Record<string, Finding[]>);

  return (
    <div className="p-8 max-w-3xl">
      <div className="border border-gray-200 rounded-xl p-5 mb-8">
        <SummaryRow label="ASSESSMENT">
          <Text textStyle="body">{summary.assessment}</Text>
        </SummaryRow>
        <SummaryRow label="RISK THEMES">
          <span className="text-sm text-gray-600">{summary.risk_themes.join(' · ')}</span>
        </SummaryRow>
        <SummaryRow label="PACKS">
          <div className="flex flex-wrap gap-2">
            {summary.packs_applied.map((p) => (
              <Badge key={p} variant="darkgray">{p}</Badge>
            ))}
          </div>
        </SummaryRow>
        <SummaryRow label="CONFIDENCE">
          <div className="flex items-center gap-2">
            <Badge
              variant={
                summary.confidence === 'High'
                  ? 'blue'
                  : summary.confidence === 'Medium'
                  ? 'yellow'
                  : 'red'
              }
            >
              {summary.confidence}
            </Badge>
            <span className="text-xs text-gray-500">{summary.confidence_reason}</span>
          </div>
        </SummaryRow>
      </div>

      {open_questions.length > 0 && (
        <div className="mb-8">
          <Banner variant="warning">
            <strong>Open Questions</strong>
            <ul className="mt-2 space-y-1">
              {open_questions.map((q, i) => (
                <li key={i} className="text-sm">{q}</li>
              ))}
            </ul>
          </Banner>
        </div>
      )}

      {SEVERITY_ORDER.map((sev) => {
        const items = grouped[sev];
        if (!items || items.length === 0) return null;
        return (
          <section key={sev} className="mb-8">
            <div className="flex items-center gap-3 mb-3 pb-2 border-b border-gray-200">
              <Badge
                variant={
                  sev === 'Critical'
                    ? 'red'
                    : sev === 'Warning'
                    ? 'yellow'
                    : sev === 'Suggestion'
                    ? 'blue'
                    : 'darkgray'
                }
              >
                {sev}
              </Badge>
              <span className="text-xs text-gray-400 font-mono">
                {items.length} finding{items.length > 1 ? 's' : ''}
              </span>
            </div>
            {items.map((f, i) => (
              <FindingCard key={i} finding={f} />
            ))}
          </section>
        );
      })}
    </div>
  );
}

function SummaryRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4 mb-3 last:mb-0">
      <dt className="font-mono text-xs text-gray-400 tracking-widest uppercase min-w-[100px] shrink-0 pt-0.5">
        {label}
      </dt>
      <dd>{children}</dd>
    </div>
  );
}

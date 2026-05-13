import { POST } from './route';
import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

jest.mock('@anthropic-ai/sdk');

const MockAnthropic = Anthropic as jest.MockedClass<typeof Anthropic>;

const validReview = {
  summary: {
    assessment: 'The UI is functional but has critical gaps.',
    risk_themes: ['Missing loading states', 'No error recovery'],
    packs_applied: ['Core UX'],
    confidence: 'Medium',
    confidence_reason: 'Screenshots provided but no workflow context.',
  },
  findings: [
    {
      severity: 'Critical',
      title: 'No loading state on form submit',
      why: 'Users cannot tell if the action was received.',
      recommendation: 'Use LeafyGreen LoadingIndicator during async submit.',
      evidence: 'Submit button remains active with no feedback after click.',
    },
  ],
  open_questions: ['Does the table have an empty state?'],
};

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/review', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

beforeEach(() => {
  MockAnthropic.prototype.messages = {
    create: jest.fn().mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify(validReview) }],
    }),
  } as unknown as typeof MockAnthropic.prototype.messages;
});

test('returns structured review for valid request', async () => {
  const res = await POST(
    makeRequest({ userMessage: 'Figma URL: https://figma.com/test', images: [] })
  );
  expect(res.status).toBe(200);
  const data = await res.json();
  expect(data.summary.confidence).toBe('Medium');
  expect(data.findings).toHaveLength(1);
  expect(data.findings[0].severity).toBe('Critical');
});

test('returns 400 for malformed JSON body', async () => {
  const req = new NextRequest('http://localhost/api/review', {
    method: 'POST',
    body: 'not-json',
    headers: { 'Content-Type': 'application/json' },
  });
  const res = await POST(req);
  expect(res.status).toBe(400);
});

test('returns 400 when userMessage is missing', async () => {
  const res = await POST(makeRequest({ images: [] }));
  expect(res.status).toBe(400);
});

test('returns 500 when Anthropic throws', async () => {
  (MockAnthropic.prototype.messages.create as jest.Mock).mockRejectedValueOnce(
    new Error('API error')
  );
  const res = await POST(
    makeRequest({ userMessage: 'Figma URL: https://figma.com/test', images: [] })
  );
  expect(res.status).toBe(500);
});

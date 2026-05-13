import { POST } from './route';
import { NextRequest } from 'next/server';
import OpenAI from 'openai';

jest.mock('openai');

const MockOpenAI = OpenAI as jest.MockedClass<typeof OpenAI>;

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
  MockOpenAI.prototype.chat = {
    completions: {
      create: jest.fn().mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(validReview) } }],
      }),
    },
  } as unknown as typeof MockOpenAI.prototype.chat;
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

test('returns 502 when Grove throws', async () => {
  (MockOpenAI.prototype.chat.completions.create as jest.Mock).mockRejectedValueOnce(
    new Error('API error')
  );
  const res = await POST(
    makeRequest({ userMessage: 'Figma URL: https://figma.com/test', images: [] })
  );
  expect(res.status).toBe(502);
});

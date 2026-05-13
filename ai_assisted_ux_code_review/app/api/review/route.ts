import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { REVIEW_SYSTEM_PROMPT } from '@/lib/prompts';
import type { ReviewRequestBody, ReviewResponse } from '@/lib/types';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  let body: ReviewRequestBody;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.userMessage) {
    return NextResponse.json({ error: 'userMessage is required' }, { status: 400 });
  }

  const messageContent: Anthropic.MessageParam['content'] = [];

  for (const img of body.images ?? []) {
    messageContent.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: img.media_type as 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif',
        data: img.data,
      },
    });
  }

  messageContent.push({ type: 'text', text: body.userMessage });

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: REVIEW_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: messageContent }],
    });

    const raw = response.content.map((b) => ('text' in b ? b.text : '')).join('');
    const clean = raw.replace(/```json|```/g, '').trim();
    const review: ReviewResponse = JSON.parse(clean);

    return NextResponse.json(review);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: `Review failed: ${message}` }, { status: 500 });
  }
}

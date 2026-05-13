import OpenAI from 'openai';
import { NextRequest, NextResponse } from 'next/server';
import { REVIEW_SYSTEM_PROMPT } from '@/lib/prompts';
import type { ReviewRequestBody, ReviewResponse } from '@/lib/types';

const grove = new OpenAI({
  apiKey: 'dummy', // Azure API Management uses a custom header, not Bearer
  baseURL: 'https://grove-gateway-prod.azure-api.net/grove-foundry-prod/openai/v1',
  defaultHeaders: {
    'api-key': process.env.GROVE_API_KEY ?? '',
  },
});

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

  const userContent: OpenAI.ChatCompletionContentPart[] = [];

  for (const img of body.images ?? []) {
    userContent.push({
      type: 'image_url',
      image_url: { url: `data:${img.media_type};base64,${img.data}` },
    });
  }

  userContent.push({ type: 'text', text: body.userMessage });

  try {
    const response = await grove.chat.completions.create({
      model: process.env.GROVE_MODEL ?? 'gpt-5.4',
      messages: [
        { role: 'system', content: REVIEW_SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? '';
    if (!raw) {
      return NextResponse.json({ error: 'Empty response from model' }, { status: 500 });
    }

    const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    const review: ReviewResponse = JSON.parse(clean);

    return NextResponse.json(review);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const detail = (err as Record<string, unknown>)?.status ?? (err as Record<string, unknown>)?.code ?? '';
    console.error('[review] LLM error:', message, detail, err);
    return NextResponse.json({ error: `Review failed: ${message}`, detail }, { status: 502 });
  }
}

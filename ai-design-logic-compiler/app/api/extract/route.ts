import OpenAI from 'openai';
import { NextRequest, NextResponse } from 'next/server';
import type { PRFAQInput } from '@/lib/types';
import { EXTRACT_PRFAQ_SYSTEM_PROMPT, EXTRACT_PRFAQ_USER_PROMPT } from '@/lib/prompts';

const grove = new OpenAI({
  apiKey: 'dummy',
  baseURL: 'https://grove-gateway-prod.azure-api.net/grove-foundry-prod/openai/v1',
  defaultHeaders: {
    'api-key': process.env.GROVE_API_KEY ?? '',
  },
});

export async function POST(req: NextRequest) {
  let rawText: string;
  try {
    const body = await req.json();
    rawText = body.rawText ?? '';
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!rawText.trim()) {
    return NextResponse.json({ error: 'rawText is required' }, { status: 400 });
  }

  let llmOutput: string;
  try {
    const response = await grove.chat.completions.create({
      model: process.env.GROVE_MODEL ?? 'gpt-5.4',
      messages: [
        { role: 'system', content: EXTRACT_PRFAQ_SYSTEM_PROMPT },
        { role: 'user', content: EXTRACT_PRFAQ_USER_PROMPT(rawText) },
      ],
    });
    llmOutput = response.choices[0]?.message?.content ?? '';
    if (!llmOutput) {
      return NextResponse.json({ error: 'Empty response from LLM' }, { status: 500 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Extraction failed';
    return NextResponse.json({ error: message }, { status: 502 });
  }

  let parsed: PRFAQInput;
  try {
    const cleaned = llmOutput.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    parsed = JSON.parse(cleaned) as PRFAQInput;
  } catch {
    return NextResponse.json({ error: 'Could not parse extracted fields. Try again.' }, { status: 422 });
  }

  // Guard: if all fields are empty, the doc probably wasn't a PRFAQ
  const hasContent = Object.values(parsed).some((v) => typeof v === 'string' && v.trim().length > 0);
  if (!hasContent) {
    return NextResponse.json(
      { error: 'Nothing useful could be extracted. Make sure you pasted a PRFAQ or feature context document.' },
      { status: 422 }
    );
  }

  return NextResponse.json(parsed);
}

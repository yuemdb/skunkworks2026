import OpenAI from 'openai';
import { NextRequest, NextResponse } from 'next/server';
import type { CompilerInput, CompilerOutput } from '@/lib/types';
import {
  COMPILE_SYSTEM_PROMPT,
  COMPILE_USER_PROMPT,
  RECOMPILE_SYSTEM_PROMPT,
  RECOMPILE_USER_PROMPT,
} from '@/lib/prompts';

const grove = new OpenAI({
  apiKey: 'dummy', // Azure API Management uses a custom header, not Bearer
  baseURL: 'https://grove-gateway-prod.azure-api.net/grove-foundry-prod/openai/v1',
  defaultHeaders: {
    'api-key': process.env.GROVE_API_KEY ?? '',
  },
});

export async function POST(req: NextRequest) {
  let body: { input: CompilerInput; previousOutput?: CompilerOutput };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { input, previousOutput } = body;
  const isRecompile = input.compilation_mode === 'recompile';

  if (isRecompile && !previousOutput) {
    return NextResponse.json(
      { error: 'previousOutput is required for recompile' },
      { status: 400 }
    );
  }

  const systemPrompt = isRecompile ? RECOMPILE_SYSTEM_PROMPT : COMPILE_SYSTEM_PROMPT;
  const userPrompt = isRecompile
    ? RECOMPILE_USER_PROMPT(input, previousOutput!)
    : COMPILE_USER_PROMPT(input);

  let rawText: string;
  try {
    const response = await grove.chat.completions.create({
      model: process.env.GROVE_MODEL ?? 'gpt-5.4',
      max_completion_tokens: isRecompile ? 8000 : (input.prototype_code ? 6000 : 4000),
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });

    rawText = response.choices[0]?.message?.content ?? '';
    if (!rawText) {
      return NextResponse.json({ error: 'Empty response from LLM' }, { status: 500 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'LLM call failed';
    const detail = (err as Record<string, unknown>)?.status ?? (err as Record<string, unknown>)?.code ?? '';
    console.error('[compile] LLM error:', message, detail, err);
    return NextResponse.json({ error: message, detail }, { status: 502 });
  }

  let parsed: CompilerOutput;
  try {
    // Strip markdown code fences if the model wraps output despite instructions
    let cleaned = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

    // If direct parse fails, try to extract the first top-level JSON object —
    // handles cases where the model adds preamble text or the response is truncated
    // before the closing fence.
    if (!cleaned.startsWith('{')) {
      const start = cleaned.indexOf('{');
      if (start !== -1) cleaned = cleaned.slice(start);
    }

    // If the JSON is truncated (common when token limit is hit mid-output),
    // attempt to close open structures so JSON.parse has a chance to succeed.
    try {
      parsed = JSON.parse(cleaned) as CompilerOutput;
    } catch {
      // Count unclosed braces/brackets and close them
      let opens = 0;
      let inString = false;
      let escape = false;
      for (const ch of cleaned) {
        if (escape) { escape = false; continue; }
        if (ch === '\\' && inString) { escape = true; continue; }
        if (ch === '"') { inString = !inString; continue; }
        if (inString) continue;
        if (ch === '{' || ch === '[') opens++;
        if (ch === '}' || ch === ']') opens--;
      }
      const tail = Array.from({ length: Math.max(0, opens) }, (_, i) =>
        opens - i > 0 ? '}' : ']'
      ).join('');
      parsed = JSON.parse(cleaned + tail) as CompilerOutput;
    }
  } catch {
    console.error('[compile] JSON parse failed. Raw length:', rawText.length, 'Preview:', rawText.slice(-200));
    return NextResponse.json(
      { error: 'Output could not be parsed. Try recompiling.' },
      { status: 422 }
    );
  }

  return NextResponse.json(parsed);
}

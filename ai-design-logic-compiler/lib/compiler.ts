import type { CompilerInput, CompilerOutput } from './types';

async function callCompileAPI(
  input: CompilerInput,
  previousOutput?: CompilerOutput
): Promise<CompilerOutput> {
  const res = await fetch('/api/compile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input, previousOutput }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error ?? `Request failed with status ${res.status}`);
  }

  return data as CompilerOutput;
}

export async function compile(input: CompilerInput): Promise<CompilerOutput> {
  return callCompileAPI({ ...input, compilation_mode: 'initial' });
}

export async function recompile(
  input: CompilerInput,
  previousOutput: CompilerOutput
): Promise<CompilerOutput> {
  return callCompileAPI({ ...input, compilation_mode: 'recompile' }, previousOutput);
}

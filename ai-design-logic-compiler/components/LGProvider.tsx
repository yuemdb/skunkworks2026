'use client';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { ViaProvider } = require('@via-ds/components') as { ViaProvider: React.FC<{ colorScheme?: string; children?: React.ReactNode }> };

export default function LGProvider({ children }: { children: React.ReactNode }) {
  return (
    <ViaProvider colorScheme="dark">
      {children}
    </ViaProvider>
  );
}

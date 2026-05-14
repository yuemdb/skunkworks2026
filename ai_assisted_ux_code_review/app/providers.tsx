'use client';

import { ViaProvider } from '@via-ds/components';

export default function Providers({ children }: { children: React.ReactNode }) {
  return <ViaProvider colorScheme="light">{children}</ViaProvider>;
}

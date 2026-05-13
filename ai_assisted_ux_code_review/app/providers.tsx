'use client';

import LeafyGreenProvider from '@leafygreen-ui/leafygreen-provider';

export default function Providers({ children }: { children: React.ReactNode }) {
  return <LeafyGreenProvider>{children}</LeafyGreenProvider>;
}

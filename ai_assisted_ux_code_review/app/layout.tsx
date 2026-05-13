import type { Metadata } from 'next';
import LeafyGreenProvider from '@leafygreen-ui/leafygreen-provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'UX Review Copilot',
  description: 'AI-assisted first-pass UX review for MongoDB product teams',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <LeafyGreenProvider>{children}</LeafyGreenProvider>
      </body>
    </html>
  );
}

import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'UX Review Copilot',
  description: 'AI-assisted first-pass UX review for MongoDB product teams',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

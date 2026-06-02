import type { Metadata } from "next";
import "./globals.css";
import LGProvider from "@/components/LGProvider";

export const metadata: Metadata = {
  title: "AI Design Logic Compiler",
  description: "Compile fragmented product intent into a structured interaction spec",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col antialiased">
        <LGProvider>{children}</LGProvider>
      </body>
    </html>
  );
}

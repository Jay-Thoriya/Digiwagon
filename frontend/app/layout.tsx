import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/Nav";

export const metadata: Metadata = {
  title: "VoC-Insight Engine",
  description: "Sentiment analysis, semantic search and AI insight reports.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <Nav />
        <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-10">{children}</main>
      </body>
    </html>
  );
}

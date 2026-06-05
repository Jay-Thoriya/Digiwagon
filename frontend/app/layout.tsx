import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/Nav";

export const metadata: Metadata = {
  title: "Smart Review Intelligence",
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
        <footer className="border-t border-edge/60 py-6 text-center text-sm text-slate-500">
          Smart Review Intelligence — FastAPI · Next.js · OpenRouter
        </footer>
      </body>
    </html>
  );
}

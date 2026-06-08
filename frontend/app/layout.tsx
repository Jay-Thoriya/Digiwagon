import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";
import WakeupNotice from "@/components/WakeupNotice";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "ReviewLens",
  description: "Sentiment analysis, semantic search and AI insight reports.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={`${inter.className} flex min-h-screen flex-col`}>
        <Nav />
        <WakeupNotice />
        <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-10">{children}</main>
      </body>
    </html>
  );
}

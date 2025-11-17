import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AgentFlow101 - AI-Powered Multi-Chain DeFi Platform",
  description:
    "Experience the future of decentralized finance with intelligent AI agents that coordinate across Hedera, Ethereum, and Polygon networks. Execute swaps, bridge tokens, analyze liquidity, and manage your portfolio with natural language commands.",
  keywords: [
    "DeFi",
    "AI Agents",
    "Hedera",
    "Ethereum",
    "Polygon",
    "Cross-Chain",
    "Liquidity",
    "Swap",
    "Bridge",
    "A2A Protocol",
  ],
  authors: [{ name: "AgentFlow101 Team" }],
  openGraph: {
    title: "AgentFlow101 - AI-Powered Multi-Chain DeFi Platform",
    description: "Experience the future of decentralized finance with intelligent AI agents",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

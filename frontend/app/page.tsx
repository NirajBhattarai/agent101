"use client";

import Link from "next/link";
import { WalletConnect, Logo } from "@/components/shared";
import { useAppKitAccount } from "@reown/appkit/react";

export default function LandingPage() {
  const { address } = useAppKitAccount?.() || ({} as any);
  const isConnected = Boolean(address);

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#DEDEE9] via-[#E8E8F0] to-[#F3F3FC]">
      {/* Animated background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute w-[600px] h-[600px] -top-40 -right-40 rounded-full opacity-30"
          style={{
            background: "linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(236, 72, 153, 0.2))",
            filter: "blur(120px)",
            animation: "float 20s ease-in-out infinite",
          }}
        />
        <div
          className="absolute w-[500px] h-[500px] top-1/2 -left-32 rounded-full opacity-25"
          style={{
            background: "linear-gradient(135deg, rgba(59, 130, 246, 0.3), rgba(147, 51, 234, 0.2))",
            filter: "blur(100px)",
            animation: "float 15s ease-in-out infinite reverse",
          }}
        />
        <div
          className="absolute w-[550px] h-[550px] bottom-0 right-1/4 rounded-full opacity-20"
          style={{
            background: "linear-gradient(135deg, rgba(251, 191, 36, 0.3), rgba(249, 115, 22, 0.2))",
            filter: "blur(110px)",
            animation: "float 25s ease-in-out infinite",
          }}
        />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4 sm:px-8 sm:py-6">
        <Link href="/" className="hover:opacity-80 transition-opacity">
          <Logo size={50} variant="full" />
        </Link>
        <div className="flex items-center gap-4">
          <WalletConnect />
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 sm:px-8 py-12 sm:py-20">
        <div className="text-center mb-16">
          {/* Hero Section */}
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 backdrop-blur-sm border border-[#DBDBE5] text-sm text-[#57575B] mb-6">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              <span>Multi-Agent DeFi Platform</span>
            </div>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-[#010507] mb-6 leading-tight">
              Cross-Chain DeFi
              <br />
              <span className="bg-gradient-to-r from-purple-600 to-fuchsia-600 bg-clip-text text-transparent">
                Powered by AI Agents
              </span>
            </h1>
            <p className="text-xl sm:text-2xl text-[#57575B] max-w-3xl mx-auto leading-relaxed mb-10">
              Experience the future of DeFi with autonomous AI agents that coordinate across chains
              to optimize your trading, bridging, and yield strategies.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link
              href="/chat"
              className="group relative px-8 py-4 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-semibold rounded-xl shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 transition-all duration-300 hover:scale-105"
            >
              <span className="relative z-10">Launch DeFi Assistant</span>
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-500 to-fuchsia-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </Link>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 bg-white/60 backdrop-blur-sm border-2 border-[#DBDBE5] text-[#010507] font-semibold rounded-xl hover:bg-white/80 transition-all duration-300"
            >
              View on GitHub
            </a>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-16">
          {/* Balance Agent */}
          <div className="group relative p-6 bg-white/60 backdrop-blur-md rounded-2xl border-2 border-white/80 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mb-4 shadow-lg shadow-purple-500/30">
              <span className="text-2xl">💰</span>
            </div>
            <h3 className="text-xl font-semibold text-[#010507] mb-2">Balance Agent</h3>
            <p className="text-sm text-[#57575B] leading-relaxed">
              Query account balances across Hedera and Polygon chains with real-time USD valuations.
            </p>
          </div>

          {/* Liquidity Agent */}
          <div className="group relative p-6 bg-white/60 backdrop-blur-md rounded-2xl border-2 border-white/80 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center mb-4 shadow-lg shadow-teal-500/30">
              <span className="text-2xl">📊</span>
            </div>
            <h3 className="text-xl font-semibold text-[#010507] mb-2">Liquidity Agent</h3>
            <p className="text-sm text-[#57575B] leading-relaxed">
              Scan DEX liquidity pools, compare TVL, and find the best trading opportunities.
            </p>
          </div>

          {/* Bridge Agent */}
          <div className="group relative p-6 bg-white/60 backdrop-blur-md rounded-2xl border-2 border-white/80 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center mb-4 shadow-lg shadow-orange-500/30">
              <span className="text-2xl">🌉</span>
            </div>
            <h3 className="text-xl font-semibold text-[#010507] mb-2">Bridge Agent</h3>
            <p className="text-sm text-[#57575B] leading-relaxed">
              Bridge tokens seamlessly between Hedera and Polygon with optimized routing.
            </p>
          </div>

          {/* Swap Agent */}
          <div className="group relative p-6 bg-white/60 backdrop-blur-md rounded-2xl border-2 border-white/80 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center mb-4 shadow-lg shadow-green-500/30">
              <span className="text-2xl">💱</span>
            </div>
            <h3 className="text-xl font-semibold text-[#010507] mb-2">Swap Agent</h3>
            <p className="text-sm text-[#57575B] leading-relaxed">
              Execute token swaps with best rates aggregated from multiple DEXes.
            </p>
          </div>

          {/* Parallel Liquidity Agent */}
          <div className="group relative p-6 bg-white/60 backdrop-blur-md rounded-2xl border-2 border-white/80 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-4 shadow-lg shadow-blue-500/30">
              <span className="text-2xl">💧🚀</span>
            </div>
            <h3 className="text-xl font-semibold text-[#010507] mb-2">Parallel Liquidity Agent</h3>
            <p className="text-sm text-[#57575B] leading-relaxed">
              Fetch liquidity from multiple chains simultaneously for faster cross-chain
              comparisons.
            </p>
          </div>
        </div>

        {/* How It Works */}
        <div className="bg-white/60 backdrop-blur-md rounded-2xl border-2 border-white/80 p-8 sm:p-12 shadow-xl mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-[#010507] mb-8 text-center">
            How It Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-fuchsia-600 flex items-center justify-center mx-auto mb-4 text-white text-2xl font-bold shadow-lg">
                1
              </div>
              <h3 className="text-xl font-semibold text-[#010507] mb-2">Connect Wallet</h3>
              <p className="text-[#57575B]">
                Connect your Hedera or EVM-compatible wallet to get started.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-fuchsia-600 flex items-center justify-center mx-auto mb-4 text-white text-2xl font-bold shadow-lg">
                2
              </div>
              <h3 className="text-xl font-semibold text-[#010507] mb-2">Chat with AI</h3>
              <p className="text-[#57575B]">
                Ask questions in natural language. Our orchestrator coordinates specialized agents.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-fuchsia-600 flex items-center justify-center mx-auto mb-4 text-white text-2xl font-bold shadow-lg">
                3
              </div>
              <h3 className="text-xl font-semibold text-[#010507] mb-2">Execute DeFi</h3>
              <p className="text-[#57575B]">
                Agents collaborate via A2A Protocol to execute your DeFi operations.
              </p>
            </div>
          </div>
        </div>

        {/* Technology Stack */}
        <div className="mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-[#010507] mb-8 text-center">
            Built With Cutting-Edge Technology
          </h2>
          <div className="flex flex-wrap items-center justify-center gap-4">
            {["A2A Protocol", "Google ADK", "Hedera SDK", "CopilotKit", "Next.js", "FastAPI"].map(
              (tech) => (
                <div
                  key={tech}
                  className="px-6 py-3 bg-white/60 backdrop-blur-sm border border-[#DBDBE5] rounded-xl text-[#010507] font-medium hover:bg-white/80 transition-all duration-300"
                >
                  {tech}
                </div>
              ),
            )}
          </div>
        </div>

        {/* Final CTA */}
        <div className="text-center">
          <div className="inline-block p-8 sm:p-12 bg-gradient-to-br from-purple-600/10 to-fuchsia-600/10 backdrop-blur-md rounded-2xl border-2 border-purple-500/20">
            <h2 className="text-3xl sm:text-4xl font-bold text-[#010507] mb-4">
              Ready to Experience the Future?
            </h2>
            <p className="text-lg text-[#57575B] mb-8 max-w-2xl mx-auto">
              Join the revolution of AI-powered DeFi. Start chatting with your DeFi assistant now.
            </p>
            <Link
              href="/chat"
              className="inline-block px-8 py-4 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-semibold rounded-xl shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 transition-all duration-300 hover:scale-105"
            >
              Get Started →
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-[#DBDBE5] bg-white/30 backdrop-blur-sm mt-20">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Logo size={36} variant="icon" />
              <span className="text-sm text-[#57575B]">
                AgentFlow101 © 2025 - Hedera Hello Future Hackathon
              </span>
            </div>
            <div className="flex items-center gap-6 text-sm text-[#57575B]">
              <a href="#" className="hover:text-[#010507] transition-colors">
                Documentation
              </a>
              <a href="#" className="hover:text-[#010507] transition-colors">
                GitHub
              </a>
              <a href="#" className="hover:text-[#010507] transition-colors">
                Support
              </a>
            </div>
          </div>
        </div>
      </footer>

      <style jsx>{`
        @keyframes float {
          0%,
          100% {
            transform: translate(0, 0) rotate(0deg);
          }
          33% {
            transform: translate(30px, -30px) rotate(120deg);
          }
          66% {
            transform: translate(-20px, 20px) rotate(240deg);
          }
        }
      `}</style>
    </div>
  );
}

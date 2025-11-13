"use client";

import { CopilotKit, useCopilotChat } from "@copilotkit/react-core";
import { CopilotChat } from "@copilotkit/react-ui";
import "@copilotkit/react-ui/styles.css";

export default function ChatPage() {
  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-[#DEDEE9] via-[#E8E8F0] to-[#F3F3FC]">
      {/* Header */}
      <div className="p-6 border-b border-[#DBDBE5] bg-white/60 backdrop-blur-sm">
        <h1 className="text-3xl font-bold text-[#010507] mb-2">DeFi Agent Chat</h1>
        <p className="text-[#57575B]">
          Chat with AI agents to get liquidity information across Ethereum, Polygon, and Hedera
        </p>
      </div>

      {/* Chat Container */}
      <div className="flex-1 overflow-hidden p-6">
        <CopilotKit runtimeUrl="/api/copilotkit" showDevConsole={false} agent="a2a_chat">
          <div className="h-full max-w-4xl mx-auto bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border-2 border-white/80 overflow-hidden flex flex-col">
            <div className="flex-1 overflow-hidden">
              <CopilotChat
                labels={{
                  title: "Multi-Chain Liquidity Agent",
                  initial: "Ask me about liquidity pools on Ethereum, Polygon, or Hedera...",
                }}
                className="h-full"
              />
            </div>
          </div>
        </CopilotKit>
      </div>
    </div>
  );
}


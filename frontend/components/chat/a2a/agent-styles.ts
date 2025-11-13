/**
 * Agent Styling Utilities
 *
 * This module provides consistent styling for agent badges across the UI.
 * Each agent framework (LangGraph vs ADK) has distinct branding:
 * - LangGraph: Green/Emerald colors with 🔗 icon
 * - ADK: Blue/Sky colors with ✨ icon
 * - Orchestrator: Gray with no specific icon
 */

import { AgentStyle } from "@/types";

/**
 * Get the styling configuration for an agent based on its name
 *
 * @param agentName - The name of the agent (case-insensitive)
 * @returns AgentStyle object with colors, icon, and framework label
 */
export function getAgentStyle(agentName: string): AgentStyle {
  // Handle undefined/null agentName gracefully
  if (!agentName) {
    return {
      bgColor: "bg-gray-100",
      textColor: "text-gray-700",
      borderColor: "border-gray-300",
      icon: "🤖",
      framework: "",
    };
  }

  const nameLower = agentName.toLowerCase();

  // Balance Agent - Purple/Indigo branding
  if (nameLower.includes("balance")) {
    return {
      bgColor: "bg-gradient-to-r from-purple-100 to-indigo-100",
      textColor: "text-purple-800",
      borderColor: "border-purple-400",
      icon: "💰",
      framework: "ADK",
    };
  }

  // Liquidity Agent - Teal/Cyan branding
  if (nameLower.includes("liquidity")) {
    return {
      bgColor: "bg-gradient-to-r from-teal-100 to-cyan-100",
      textColor: "text-teal-800",
      borderColor: "border-teal-400",
      icon: "💧",
      framework: "ADK",
    };
  }

  // Bridge Agent - Orange/Amber branding
  if (nameLower.includes("bridge")) {
    return {
      bgColor: "bg-gradient-to-r from-orange-100 to-amber-100",
      textColor: "text-orange-800",
      borderColor: "border-orange-400",
      icon: "🌉",
      framework: "ADK",
    };
  }

  // Swap Agent - Green/Teal branding
  if (nameLower.includes("swap")) {
    return {
      bgColor: "bg-gradient-to-r from-green-100 to-teal-100",
      textColor: "text-green-800",
      borderColor: "border-green-400",
      icon: "💱",
      framework: "ADK",
    };
  }

  // Parallel Liquidity Agent - Blue/Purple branding (parallel execution)
  if (nameLower.includes("parallel") && nameLower.includes("liquidity")) {
    return {
      bgColor: "bg-gradient-to-r from-blue-100 to-purple-100",
      textColor: "text-blue-800",
      borderColor: "border-blue-400",
      icon: "💧🚀",
      framework: "ADK (Parallel)",
    };
  }

  // Market Insights Agent - Orange/Yellow branding
  if (nameLower.includes("market") || nameLower.includes("insights")) {
    return {
      bgColor: "bg-gradient-to-r from-orange-100 to-yellow-100",
      textColor: "text-orange-800",
      borderColor: "border-orange-400",
      icon: "📊",
      framework: "ADK",
    };
  }

  // Default/Unknown agent
  return {
    bgColor: "bg-gray-100",
    textColor: "text-gray-700",
    borderColor: "border-gray-300",
    icon: "🤖",
    framework: "",
  };
}

/**
 * Truncate long text with ellipsis
 *
 * @param text - The text to truncate
 * @param maxLength - Maximum length before truncation (default: 50)
 * @returns Truncated text with "..." if needed
 */
export function truncateTask(text: string, maxLength: number = 50): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
}

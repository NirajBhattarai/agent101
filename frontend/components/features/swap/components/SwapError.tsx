import React from "react";

interface SwapErrorProps {
  error: string | null;
  onDismiss: () => void;
}

export const SwapError: React.FC<SwapErrorProps> = ({ error, onDismiss }) => {
  if (!error) return null;

  return (
    <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
      <p className="text-sm text-red-800">{error}</p>
      <button
        onClick={onDismiss}
        className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
      >
        Dismiss
      </button>
    </div>
  );
};

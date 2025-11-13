import React from "react";
import { SwapData, SwapOption } from "@/types";
import { SwapOptionItem } from "./SwapOptionItem";

interface SwapOptionsListProps {
  data: SwapData;
  swap_options: SwapOption[];
  selectedDex: string | null;
  isConnected: boolean;
  onSelectDex: (dex: string) => void;
  onShowApprovalDialog: () => void;
  setSwapError: (error: string) => void;
}

export const SwapOptionsList: React.FC<SwapOptionsListProps> = ({
  data,
  swap_options,
  selectedDex,
  isConnected,
  onSelectDex,
  onShowApprovalDialog,
  setSwapError,
}) => {
  const { balance_check } = data;

  const handleSelectDex = (dex: string) => {
    if (balance_check?.balance_sufficient) {
      onSelectDex(dex);
    }
  };

  const handleSwapClick = () => {
    if (!balance_check?.balance_sufficient) return;
    if (!isConnected) {
      setSwapError("Please connect your wallet first");
      return;
    }
    onShowApprovalDialog();
  };

  const selectedOption = swap_options.find((opt) => opt.dex_name === selectedDex);

  return (
    <div className="mb-4">
      <div className="bg-white/90 backdrop-blur-md rounded-xl p-5 border-2 border-[#DBDBE5] shadow-elevation-md">
        <h3 className="text-lg font-semibold text-[#010507] mb-2">Available DEX Options</h3>
        <p className="text-sm text-[#57575B] mb-4">
          {data.requires_confirmation && data.amount_exceeds_threshold
            ? "Please select a DEX and confirm to proceed with the swap."
            : "Please select a DEX to proceed with the swap. You can say 'Swap with [DEX Name]' or click on a DEX below."}
        </p>
        <div className="space-y-3">
          {swap_options.map((option, index) => (
            <SwapOptionItem
              key={index}
              option={option}
              data={data}
              isSelected={selectedDex === option.dex_name}
              isDisabled={!balance_check?.balance_sufficient}
              onSelect={() => handleSelectDex(option.dex_name)}
            />
          ))}
        </div>

        {selectedDex && selectedOption && (
          <div className="mt-4 pt-4 border-t border-[#E9E9EF]">
            <button
              onClick={handleSwapClick}
              disabled={!balance_check?.balance_sufficient || !isConnected}
              className={`w-full px-4 py-3 rounded-lg font-semibold text-sm transition-all shadow-sm ${
                balance_check?.balance_sufficient && isConnected
                  ? "bg-green-500 hover:bg-green-600 text-white shadow-md hover:shadow-lg"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
            >
              {!isConnected ? "Connect Wallet" : `Swap with ${selectedOption.dex_name}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

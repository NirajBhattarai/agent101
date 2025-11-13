import React from "react";
import { SwapOption, SwapData } from "@/types";
import { getDexIcon } from "@/lib/features/swap/swap-helpers";

interface SwapOptionItemProps {
  option: SwapOption;
  data: SwapData;
  isSelected: boolean;
  isDisabled: boolean;
  onSelect: () => void;
}

export const SwapOptionItem: React.FC<SwapOptionItemProps> = ({
  option,
  data,
  isSelected,
  isDisabled,
  onSelect,
}) => {
  return (
    <div
      onClick={onSelect}
      className={`rounded-lg p-4 border-2 transition-all cursor-pointer ${
        isSelected
          ? "border-green-500 bg-green-50 ring-2 ring-green-200"
          : option.is_recommended
            ? "border-green-300 bg-green-50/50 hover:border-green-400 hover:bg-green-50"
            : "border-[#E9E9EF] bg-white/80 hover:border-green-200 hover:bg-green-50/30"
      } ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">{getDexIcon(option.dex_name)}</span>
            <span className="text-base font-bold text-[#010507]">{option.dex_name}</span>
            {option.is_recommended && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500 text-white">
                RECOMMENDED
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-[#57575B]">Output: </span>
              <span className="font-bold text-green-600">
                {option.amount_out} {data.token_out_symbol}
              </span>
            </div>
            <div>
              <span className="text-[#57575B]">Fee: </span>
              <span className="font-bold text-[#010507]">{option.swap_fee}</span>
            </div>
            {option.price_impact && (
              <div className="col-span-2">
                <span className="text-[#57575B]">Price Impact: </span>
                <span className="font-semibold text-[#010507]">{option.price_impact}</span>
              </div>
            )}
          </div>
        </div>
        {isSelected && (
          <div className="ml-3 flex-shrink-0">
            <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
              <span className="text-white text-xs font-bold">✓</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

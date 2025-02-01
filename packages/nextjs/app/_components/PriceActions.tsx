import React from "react";
import { formatEther } from "viem";
import { EyeIcon, MinusIcon, PlusIcon } from "@heroicons/react/24/outline";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

const PriceActions = () => {
  const { data: price } = useScaffoldReadContract({
    contractName: "EthPriceOracle",
    functionName: "price",
  });

  const { writeContractAsync } = useScaffoldWriteContract({ contractName: "EthPriceOracle" });

  const renderPrice =
    price === undefined ? <div className="ml-1 skeleton w-20 h-4"></div> : Number(formatEther(price)).toFixed(2);

  const handleClick = async (isIncrease: boolean) => {
    if (price === undefined) {
      console.error("Price is undefined");
      return;
    }
    const newPrice = isIncrease ? (price * 110n) / 100n : (price * 90n) / 100n;

    try {
      await writeContractAsync({
        functionName: "updatePrice",
        args: [newPrice],
      });
    } catch (e) {
      console.error("Error setting the price:", e);
    }
  };

  return (
    <div className="absolute right-0 bg-base-100 w-fit border-base-300 border shadow-md rounded-3xl">
      <div className="p-2 py-3 flex items-center gap-3">
        <button onClick={() => handleClick(false)} className="btn btn-circle btn-ghost btn-xs">
          <MinusIcon className="h-3 w-3" />
        </button>
        <div className="flex items-center gap-1">
          <div
            className="tooltip tooltip-info tooltip-bottom text-white"
            data-tip="Use these controls to simulate 10% price changes reported by the oracle"
          >
            <EyeIcon className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm">ETH Price:</span>
          <span className="font-bold flex items-center">${renderPrice}</span>
        </div>
        <button onClick={() => handleClick(true)} className="btn btn-circle btn-ghost btn-xs">
          <PlusIcon className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
};

export default PriceActions;

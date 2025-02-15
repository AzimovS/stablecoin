import React from "react";
import { TokenSwapModal } from "./Modals/TokenSwapModal";
import { TokenTransferModal } from "./Modals/TokenTransferModal";
import TooltipInfo from "./TooltipInfo";
import { formatEther } from "viem";
import { hardhat } from "viem/chains";
import { useAccount } from "wagmi";
import { ArrowsRightLeftIcon, PaperAirplaneIcon, QuestionMarkCircleIcon } from "@heroicons/react/24/outline";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { tokenName } from "~~/utils/constant";

const TokenActions = () => {
  const { address, chain: ConnectedChain } = useAccount();
  const transferModalId = `${tokenName}-transfer-modal`;
  const swapModalId = `${tokenName}-swap-modal`;

  const { data: cornBalance } = useScaffoldReadContract({
    contractName: "Corn",
    functionName: "balanceOf",
    args: [address],
  });

  const { data: Cornprice } = useScaffoldReadContract({
    contractName: "CornPriceOracle",
    functionName: "price",
  });

  const tokenBalance = formatEther(cornBalance || 0n);

  return (
    <div className="absolute mt-3 top-[100px] right-5 bg-base-100 w-fit border-base-300 border shadow-md rounded-xl">
      <div className="w-[150px] py-5 flex flex-col items-center gap-1 indicator">
        <TooltipInfo top={3} right={3} infoText={`Here you can send ${tokenName} to any address or swap it`} />
        <div className="flex flex-col items-center gap-1">
          <span className="text-sm">
            {tokenBalance} {tokenName}
          </span>
          <div className="flex gap-2">
            <label htmlFor={`${transferModalId}`} className="btn btn-circle btn-xs">
              <PaperAirplaneIcon className="h-3 w-3" />
            </label>
            {ConnectedChain?.id === hardhat.id && (
              <label htmlFor={`${swapModalId}`} className="btn btn-circle btn-xs">
                <ArrowsRightLeftIcon className="h-3 w-3" />
              </label>
            )}
          </div>
        </div>
      </div>
      <TokenTransferModal tokenBalance={tokenBalance} connectedAddress={address || ""} modalId={`${transferModalId}`} />
      <TokenSwapModal
        tokenBalance={tokenBalance}
        connectedAddress={address || ""}
        ETHprice={Number(formatEther(Cornprice || 0n)).toFixed(2)}
        modalId={`${swapModalId}`}
      />
    </div>
  );
};

export default TokenActions;

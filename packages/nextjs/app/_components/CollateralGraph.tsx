import React from "react";
import { Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatEther, zeroAddress } from "viem";
import { useScaffoldEventHistory } from "~~/hooks/scaffold-eth";

const getDebtFromTransferEvent = (event: any) => {
  try {
    const amount = BigInt(event.args.value || 0);
    if (event.args.to === zeroAddress) return amount * -1n;
    if (event.args.from === zeroAddress) return amount;
    return 0n;
  } catch (error) {
    console.error("Error in getDebtFromTransferEvent:", error);
    return 0n;
  }
};

const CollateralGraph = () => {
  const { data: addEvents } = useScaffoldEventHistory({
    contractName: "StableCoinEngine",
    eventName: "CollateralAdded",
    fromBlock: 0n,
    watch: true,
    blockData: true,
    transactionData: true,
    receiptData: true,
  });

  const { data: withdrawEvents } = useScaffoldEventHistory({
    contractName: "StableCoinEngine",
    eventName: "CollateralWithdrawn",
    fromBlock: 0n,
    watch: true,
    blockData: true,
    transactionData: true,
    receiptData: true,
  });

  const { data: transferEvents } = useScaffoldEventHistory({
    contractName: "StableCoin",
    eventName: "Transfer",
    fromBlock: 0n,
    watch: true,
    blockData: true,
    transactionData: true,
    receiptData: true,
  });

  const { data: priceEvents } = useScaffoldEventHistory({
    contractName: "EthPriceOracle",
    eventName: "PriceUpdated",
    fromBlock: 0n,
    watch: true,
    blockData: true,
    transactionData: true,
    receiptData: true,
  });
  const combinedEvents = [
    ...(addEvents || []),
    ...(withdrawEvents || []),
    ...(transferEvents || []),
    ...(priceEvents || []),
  ];
  const sortedEvents = combinedEvents.sort((a, b) => Number(a.blockNumber - b.blockNumber));

  interface DataPoint {
    name: number;
    ratio: number;
    collateral: bigint;
    debt: bigint;
  }

  const ratioData = sortedEvents.reduce<DataPoint[]>((acc, event, idx) => {
    const collateralAdded = event.eventName === "CollateralAdded" ? event.args.amount : 0n;
    const collateralWithdrawn = event.eventName === "CollateralWithdrawn" ? event.args.amount : 0n;
    const price = event.eventName === "PriceUpdated" ? event.args.price : 3333000000000000000000n;
    const debtAdded = event.eventName === "Transfer" ? getDebtFromTransferEvent(event) : 0n;

    const prevCollateral = acc[idx - 1]?.collateral || 0n;
    const prevDebt = acc[idx - 1]?.debt || 0n;

    const collateralInEth = prevCollateral + (collateralAdded || 0n) - (collateralWithdrawn || 0n);
    const ethPriceInStable = BigInt(Math.round(Number(formatEther(price || 0n))));
    const collateralInStable = collateralInEth * ethPriceInStable;
    const debt = prevDebt + debtAdded;
    const ratio = Number(collateralInStable || 1n) / Number(debt || collateralInStable || 1n);

    return [
      ...acc,
      {
        name: Number(event.blockNumber) || 0,
        ratio: Number.isFinite(ratio) ? ratio : 1,
        collateral: collateralInEth,
        debt: debt,
      },
    ];
  }, []);

  return (
    <div className="card bg-base-100 w-full shadow-xl">
      <div className="card-body h-96 w-full">
        <h2 className="card-title">Total Collateral/Debt Ratio</h2>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart width={500} height={300} data={ratioData}>
            <XAxis
              domain={["auto", "auto"]}
              dataKey="name"
              stroke="#ffffff"
              tick={false}
              label={{ value: "Time", position: "insideBottom", fill: "#ffffff" }}
            />
            <YAxis
              domain={[0, 6]}
              tickFormatter={value => `${(value * 100).toFixed(0)}%`}
              stroke="#ffffff"
              tick={{ fill: "#ffffff" }}
            />
            <Tooltip />
            <ReferenceLine y={1.5} stroke="#ff4d4d" strokeDasharray="3 3" />
            <Line type="monotone" dataKey="ratio" stroke="#82ca9d" dot={false} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default CollateralGraph;

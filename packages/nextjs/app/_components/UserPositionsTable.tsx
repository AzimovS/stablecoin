import React, { useEffect, useState } from "react";
import UserPosition from "./UserPosition";
import { formatEther } from "viem";
import { useScaffoldEventHistory, useScaffoldReadContract } from "~~/hooks/scaffold-eth";

const UserPositionsTable = () => {
  const [users, setUsers] = useState<string[]>([]);
  const { data: events, isLoading } = useScaffoldEventHistory({
    contractName: "StableCoinEngine",
    eventName: "CollateralAdded",
    fromBlock: 0n, // should be the block number where the contract was deployed
    watch: true,
    blockData: false,
    transactionData: false,
    receiptData: false,
  });
  const { data: ethPrice } = useScaffoldReadContract({
    contractName: "EthPriceOracle",
    functionName: "price",
  });

  useEffect(() => {
    if (!events) return;

    setUsers(prevUsers => {
      const uniqueUsers = new Set([...prevUsers]);
      events
        .map(event => event.args.user)
        .filter((user): user is string => !!user)
        .forEach(user => uniqueUsers.add(user));
      return uniqueUsers.size > prevUsers.length ? Array.from(uniqueUsers) : prevUsers;
    });
  }, [events, users]);

  return (
    <div className="card bg-base-100 w-full shadow-xl">
      <div className="overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Address</th>
              <th>Collateral</th>
              <th>Debt</th>
              <th>Ratio</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr key={"skeleton"}>
                <td>
                  <div className="skeleton w-24 h-6"></div>
                </td>
                <td>
                  <div className="skeleton w-16 h-6"></div>
                </td>
              </tr>
            ) : (
              users.map(user => <UserPosition key={user} user={user} ethPrice={Number(formatEther(ethPrice || 0n))} />)
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserPositionsTable;

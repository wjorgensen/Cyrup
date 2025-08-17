'use client';

import { useChainId } from 'wagmi';
import { useAccount } from 'wagmi';
import { baseSepolia, base } from 'viem/chains';

export function ChainIndicator() {
  const chainId = useChainId();
  const { isConnected } = useAccount();

  if (!isConnected) return null;

  const getChainInfo = () => {
    switch (chainId) {
      case baseSepolia.id:
        return { name: 'Base Sepolia', color: 'bg-green-500' };
      case base.id:
        return { name: 'Base', color: 'bg-red-500' };
      default:
        return { name: `Chain ${chainId}`, color: 'bg-gray-500' };
    }
  };

  const { name, color } = getChainInfo();
  const isCorrectChain = chainId === baseSepolia.id;

  return (
    <div className={`flex items-center gap-2 px-3 py-1 border-2 border-black ${isCorrectChain ? 'bg-green-100' : 'bg-red-100'}`}>
      <div className={`w-2 h-2 rounded-full ${color}`} />
      <span className="text-xs font-bold uppercase">
        {name}
      </span>
    </div>
  );
}
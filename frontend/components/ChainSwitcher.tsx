'use client';

import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { baseSepolia } from 'viem/chains';
import { Button } from './ui/Button';
import { useEffect } from 'react';

export function ChainSwitcher() {
  const chainId = useChainId();
  const { isConnected } = useAccount();
  const { switchChain, isPending, error } = useSwitchChain();

  const isWrongChain = isConnected && chainId !== baseSepolia.id;

  // Auto-switch on mount if on wrong chain
  useEffect(() => {
    if (isWrongChain && !isPending) {
      switchChain({ chainId: baseSepolia.id });
    }
  }, [isWrongChain, isPending, switchChain]);

  if (!isConnected) return null;

  if (isWrongChain) {
    return (
      <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-yellow-100 border-2 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex items-center gap-4">
          <div>
            <p className="font-bold text-black">Wrong Network!</p>
            <p className="text-sm text-gray-700">
              Please switch to Base Sepolia to use Cyrup
            </p>
            {error && (
              <p className="text-xs text-red-600 mt-1">
                {error.message}
              </p>
            )}
          </div>
          <Button
            onClick={() => switchChain({ chainId: baseSepolia.id })}
            disabled={isPending}
            variant="primary"
            size="sm"
          >
            {isPending ? 'Switching...' : 'Switch Network'}
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
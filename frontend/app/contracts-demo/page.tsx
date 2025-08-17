'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/Button';
import { useAccount, useBalance, useSwitchChain } from 'wagmi';
import { baseSepolia } from 'viem/chains';
import { formatEther, parseEther } from 'viem';
import { useChallengeFactory } from '@/hooks/useContracts';

export default function ContractsDemo() {
  const { address, isConnected, chain } = useAccount();
  const { data: balance } = useBalance({ address });
  const { switchChain } = useSwitchChain();
  
  const [description, setDescription] = useState('');
  const [rewardAmount, setRewardAmount] = useState('0.01');
  
  const {
    challengeCount,
    challenges,
    createChallenge,
    isCreatingChallenge,
    isConfirmingChallenge,
    isChallengeCreated,
  } = useChallengeFactory();

  const handleCreateChallenge = async () => {
    if (!description || !rewardAmount) {
      alert('Please fill in all fields');
      return;
    }
    
    try {
      const rewardInWei = parseEther(rewardAmount);
      await createChallenge(description, rewardInWei);
    } catch (error) {
      console.error('Error creating challenge:', error);
    }
  };

  const handleSwitchToBaseSepolia = () => {
    switchChain({ chainId: baseSepolia.id });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl font-black uppercase mb-8">Contract Interaction Demo</h1>
          
          <div className="space-y-8">
            {/* Wallet Info Section */}
            <div className="border-4 border-black p-6 shadow-box-lg bg-white">
              <h2 className="text-2xl font-black uppercase mb-4">Wallet Status</h2>
              
              {isConnected ? (
                <div className="space-y-2 font-mono text-sm">
                  <p><strong>Connected:</strong> ✅</p>
                  <p><strong>Address:</strong> {address}</p>
                  <p><strong>Chain:</strong> {chain?.name || 'Unknown'}</p>
                  <p><strong>Balance:</strong> {balance ? `${formatEther(balance.value)} ${balance.symbol}` : 'Loading...'}</p>
                  
                  {chain?.id !== baseSepolia.id && (
                    <div className="mt-4">
                      <p className="text-red-600 mb-2">⚠️ Please switch to Base Sepolia</p>
                      <Button 
                        variant="primary" 
                        size="sm"
                        onClick={handleSwitchToBaseSepolia}
                      >
                        Switch to Base Sepolia
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <p className="font-mono text-sm">
                  Please connect your wallet using the button in the header
                </p>
              )}
            </div>

            {/* Contract Info Section */}
            {isConnected && chain?.id === baseSepolia.id && (
              <>
                <div className="border-4 border-black p-6 shadow-box-lg bg-white">
                  <h2 className="text-2xl font-black uppercase mb-4">Contract Stats</h2>
                  
                  <div className="space-y-2 font-mono text-sm">
                    <p><strong>Total Challenges:</strong> {challengeCount?.toString() || '0'}</p>
                    <p><strong>Challenge Addresses:</strong></p>
                    {challenges && challenges.length > 0 ? (
                      <ul className="ml-4 space-y-1">
                        {(challenges as string[]).map((addr, i) => (
                          <li key={i} className="text-xs break-all">{addr}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="ml-4 text-gray-500">No challenges created yet</p>
                    )}
                  </div>
                </div>

                {/* Create Challenge Section */}
                <div className="border-4 border-black p-6 shadow-box-lg bg-white">
                  <h2 className="text-2xl font-black uppercase mb-4">Create New Challenge</h2>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block font-mono text-sm mb-2 uppercase">
                        Challenge Description
                      </label>
                      <textarea
                        className="w-full px-4 py-3 border-2 border-black shadow-box-sm font-mono text-sm"
                        rows={3}
                        placeholder="Enter challenge description..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                      />
                    </div>
                    
                    <div>
                      <label className="block font-mono text-sm mb-2 uppercase">
                        Reward Amount (ETH)
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        min="0.001"
                        className="w-full px-4 py-3 border-2 border-black shadow-box-sm font-mono text-sm"
                        placeholder="0.01"
                        value={rewardAmount}
                        onChange={(e) => setRewardAmount(e.target.value)}
                      />
                    </div>
                    
                    <Button
                      variant="primary"
                      onClick={handleCreateChallenge}
                      disabled={isCreatingChallenge || isConfirmingChallenge}
                    >
                      {isCreatingChallenge ? 'Confirming...' : 
                       isConfirmingChallenge ? 'Processing...' : 
                       'Create Challenge'}
                    </Button>
                    
                    {isChallengeCreated && (
                      <p className="text-green-600 font-mono text-sm">
                        ✅ Challenge created successfully!
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
          
          <div className="mt-12 p-6 bg-yellow-100 border-2 border-black shadow-box-sm">
            <h3 className="font-black uppercase mb-2">⚠️ Important Notes:</h3>
            <ul className="list-disc ml-5 font-mono text-sm space-y-1">
              <li>Make sure you have deployed your contracts to Base Sepolia</li>
              <li>Update the contract addresses in /hooks/useContracts.ts</li>
              <li>Ensure you have some test ETH on Base Sepolia for transactions</li>
              <li>The contract ABIs in the hooks should match your deployed contracts</li>
            </ul>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
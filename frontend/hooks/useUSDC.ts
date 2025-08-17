'use client';

import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { CHAIN_ID, USDC_ADDRESS } from '@/lib/contractAddresses';
import { parseUnits, formatUnits } from 'viem';

// ERC20 ABI for USDC
const USDC_ABI = [
  {
    "inputs": [
      { "name": "owner", "type": "address" },
      { "name": "spender", "type": "address" }
    ],
    "name": "allowance",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "name": "spender", "type": "address" },
      { "name": "amount", "type": "uint256" }
    ],
    "name": "approve",
    "outputs": [{ "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "name": "account", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

export function useUSDC() {
  const { address } = useAccount();
  
  // Write contract hook for approvals
  const { 
    writeContract: writeUSDC, 
    data: txHash,
    isPending: isWriting,
    error: writeError,
    reset: resetWrite
  } = useWriteContract();

  // Wait for transaction
  const { 
    isLoading: isConfirming, 
    isSuccess: isSuccess,
    data: txReceipt 
  } = useWaitForTransactionReceipt({ 
    hash: txHash,
    chainId: CHAIN_ID,
  });

  // Read balance
  const { data: balance, refetch: refetchBalance } = useReadContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: CHAIN_ID,
    enabled: !!address,
  });

  // Read allowance for a specific spender
  const checkAllowance = (spender: `0x${string}`) => {
    return useReadContract({
      address: USDC_ADDRESS,
      abi: USDC_ABI,
      functionName: 'allowance',
      args: address && spender ? [address, spender] : undefined,
      chainId: CHAIN_ID,
      enabled: !!address && !!spender,
    });
  };

  // Approve USDC spending
  const approveUSDC = async (spender: `0x${string}`, amount: string) => {
    if (!address) {
      throw new Error('Wallet not connected');
    }

    const amountInWei = parseUnits(amount, 6); // USDC has 6 decimals

    try {
      await writeUSDC({
        address: USDC_ADDRESS,
        abi: USDC_ABI,
        functionName: 'approve',
        args: [spender, amountInWei],
        chainId: CHAIN_ID,
      });
    } catch (error) {
      console.error('Error approving USDC:', error);
      throw error;
    }
  };

  // Format balance for display
  const formatBalance = (balanceInWei?: bigint) => {
    if (!balanceInWei) return '0';
    return formatUnits(balanceInWei, 6); // USDC has 6 decimals
  };

  return {
    // Read data
    balance,
    formatBalance,
    checkAllowance,
    refetchBalance,
    
    // Write functions
    approveUSDC,
    
    // Transaction status
    isWriting,
    isConfirming,
    isSuccess,
    writeError,
    txHash,
    txReceipt,
    resetWrite,
  };
}
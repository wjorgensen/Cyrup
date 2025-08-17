'use client';

import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { ChallengeEscrowABI } from '@/lib/contractABIs';
import { CHAIN_ID, USDC_ADDRESS } from '@/lib/contractAddresses';
import { parseUnits } from 'viem';
import { useState, useEffect } from 'react';

interface ChallengeData {
  creator: `0x${string}`;
  rewardAmount: bigint;
  deadline: bigint;
  status: number;
  verifier: `0x${string}`;
  description: string;
}

interface SubmissionData {
  solver: `0x${string}`;
  solutionHash: string;
  uid: string;
  timestamp: bigint;
  creatorApproved: boolean;
  verifierApproved: boolean;
}

export function useChallengeEscrow(challengeAddress?: `0x${string}`) {
  const { address } = useAccount();
  const [currentChallenge, setCurrentChallenge] = useState<ChallengeData | null>(null);

  // Read challenge counter
  const readChallengeCount = () => {
    return useReadContract({
      address: challengeAddress,
      abi: ChallengeEscrowABI,
      functionName: 'challengeCounter',
      chainId: CHAIN_ID,
      enabled: !!challengeAddress,
    });
  };

  // Read specific challenge data
  const readChallenge = (challengeId: number) => {
    return useReadContract({
      address: challengeAddress,
      abi: ChallengeEscrowABI,
      functionName: 'challenges',
      args: [BigInt(challengeId)],
      chainId: CHAIN_ID,
      enabled: !!challengeAddress && challengeId >= 0,
    });
  };

  // Write functions
  const { 
    writeContract: writeToEscrow, 
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

  // Create a new challenge
  const createChallenge = async (
    rewardAmount: string, // Amount in USDC (human readable, e.g., "100")
    deadline: number, // Unix timestamp
    description: string
  ) => {
    if (!challengeAddress) {
      throw new Error('Challenge address not provided');
    }

    const amountInWei = parseUnits(rewardAmount, 6); // USDC has 6 decimals

    try {
      await writeToEscrow({
        address: challengeAddress,
        abi: ChallengeEscrowABI,
        functionName: 'createChallenge',
        args: [amountInWei, USDC_ADDRESS, BigInt(deadline), description],
        chainId: CHAIN_ID,
      });
    } catch (error) {
      console.error('Error creating challenge:', error);
      throw error;
    }
  };

  // Submit a solution
  const submitSolution = async (
    challengeId: number,
    solutionHash: string,
    uid: string
  ) => {
    if (!challengeAddress) {
      throw new Error('Challenge address not provided');
    }

    try {
      await writeToEscrow({
        address: challengeAddress,
        abi: ChallengeEscrowABI,
        functionName: 'submitSolution',
        args: [BigInt(challengeId), solutionHash, uid],
        chainId: CHAIN_ID,
      });
    } catch (error) {
      console.error('Error submitting solution:', error);
      throw error;
    }
  };

  // Propose as verifier
  const proposeAsVerifier = async (challengeId: number) => {
    if (!challengeAddress) {
      throw new Error('Challenge address not provided');
    }

    try {
      await writeToEscrow({
        address: challengeAddress,
        abi: ChallengeEscrowABI,
        functionName: 'proposeAsVerifier',
        args: [BigInt(challengeId)],
        chainId: CHAIN_ID,
      });
    } catch (error) {
      console.error('Error proposing as verifier:', error);
      throw error;
    }
  };

  // Select a verifier (only creator can do this)
  const selectVerifier = async (challengeId: number, verifierAddress: `0x${string}`) => {
    if (!challengeAddress) {
      throw new Error('Challenge address not provided');
    }

    try {
      await writeToEscrow({
        address: challengeAddress,
        abi: ChallengeEscrowABI,
        functionName: 'selectVerifier',
        args: [BigInt(challengeId), verifierAddress],
        chainId: CHAIN_ID,
      });
    } catch (error) {
      console.error('Error selecting verifier:', error);
      throw error;
    }
  };

  // Approve a solution
  const approveSolution = async (challengeId: number, submissionId: number) => {
    if (!challengeAddress) {
      throw new Error('Challenge address not provided');
    }

    try {
      await writeToEscrow({
        address: challengeAddress,
        abi: ChallengeEscrowABI,
        functionName: 'approveSolution',
        args: [BigInt(challengeId), BigInt(submissionId)],
        chainId: CHAIN_ID,
      });
    } catch (error) {
      console.error('Error approving solution:', error);
      throw error;
    }
  };

  // Distribute rewards
  const distributeRewards = async (challengeId: number, submissionId: number) => {
    if (!challengeAddress) {
      throw new Error('Challenge address not provided');
    }

    try {
      await writeToEscrow({
        address: challengeAddress,
        abi: ChallengeEscrowABI,
        functionName: 'distributeRewards',
        args: [BigInt(challengeId), BigInt(submissionId)],
        chainId: CHAIN_ID,
      });
    } catch (error) {
      console.error('Error distributing rewards:', error);
      throw error;
    }
  };

  // Cancel a challenge
  const cancelChallenge = async (challengeId: number) => {
    if (!challengeAddress) {
      throw new Error('Challenge address not provided');
    }

    try {
      await writeToEscrow({
        address: challengeAddress,
        abi: ChallengeEscrowABI,
        functionName: 'cancelChallenge',
        args: [BigInt(challengeId)],
        chainId: CHAIN_ID,
      });
    } catch (error) {
      console.error('Error cancelling challenge:', error);
      throw error;
    }
  };

  // Read submission data
  const getSubmission = (challengeId: number, submissionId: number) => {
    return useReadContract({
      address: challengeAddress,
      abi: ChallengeEscrowABI,
      functionName: 'getSubmission',
      args: [BigInt(challengeId), BigInt(submissionId)],
      chainId: CHAIN_ID,
      enabled: !!challengeAddress && challengeId >= 0 && submissionId >= 0,
    });
  };

  // Get challenge status text
  const getChallengeStatus = (status: number) => {
    const statuses = ['Open', 'Active', 'PendingApproval', 'Completed', 'Cancelled'];
    return statuses[status] || 'Unknown';
  };

  // Format reward amount from wei to human readable
  const formatRewardAmount = (amount: bigint) => {
    return (Number(amount) / 1e6).toFixed(2); // USDC has 6 decimals
  };

  return {
    // Read data
    currentChallenge,
    
    // Write functions
    createChallenge,
    submitSolution,
    proposeAsVerifier,
    selectVerifier,
    approveSolution,
    distributeRewards,
    cancelChallenge,
    
    // Transaction status
    isWriting,
    isConfirming,
    isSuccess,
    writeError,
    txHash,
    txReceipt,
    
    // Utility functions
    readChallenge,
    readChallengeCount,
    getSubmission,
    getChallengeStatus,
    formatRewardAmount,
    resetWrite,
  };
}
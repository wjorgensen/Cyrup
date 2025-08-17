'use client';

import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { ChallengeFactoryABI } from '@/lib/contractABIs';
import { CHALLENGE_FACTORY_ADDRESS, CHAIN_ID } from '@/lib/contractAddresses';
import { useState, useEffect } from 'react';
import { keccak256, encodePacked, toHex } from 'viem';

export function useChallengeFactory() {
  const { address } = useAccount();
  const [nonce, setNonce] = useState(0);

  // Read total challenges
  const { data: totalChallenges, refetch: refetchTotalChallenges } = useReadContract({
    address: CHALLENGE_FACTORY_ADDRESS,
    abi: ChallengeFactoryABI,
    functionName: 'getTotalChallenges',
    chainId: CHAIN_ID,
  });

  // Read recent challenges
  const { data: recentChallenges, refetch: refetchRecentChallenges } = useReadContract({
    address: CHALLENGE_FACTORY_ADDRESS,
    abi: ChallengeFactoryABI,
    functionName: 'getRecentChallenges',
    args: [10], // Get last 10 challenges
    chainId: CHAIN_ID,
  });

  // Read user's challenges
  const { data: userChallenges, refetch: refetchUserChallenges } = useReadContract({
    address: CHALLENGE_FACTORY_ADDRESS,
    abi: ChallengeFactoryABI,
    functionName: 'getChallengesByCreator',
    args: address ? [address] : undefined,
    chainId: CHAIN_ID,
    enabled: !!address,
  });

  // Check if user is qualified verifier
  const { data: isQualifiedVerifier } = useReadContract({
    address: CHALLENGE_FACTORY_ADDRESS,
    abi: ChallengeFactoryABI,
    functionName: 'isQualifiedVerifier',
    args: address ? [address] : undefined,
    chainId: CHAIN_ID,
    enabled: !!address,
  });

  // Write contract for deploying challenges
  const { 
    writeContract: deployChallenge, 
    data: deployHash,
    isPending: isDeploying,
    error: deployError,
    reset: resetDeploy
  } = useWriteContract();

  // Wait for deployment transaction
  const { 
    isLoading: isConfirmingDeploy, 
    isSuccess: isDeploySuccess,
    data: deployReceipt 
  } = useWaitForTransactionReceipt({ 
    hash: deployHash,
    chainId: CHAIN_ID,
  });

  // Deploy challenge with nonce
  const deployNewChallenge = () => {
    if (!address) {
      throw new Error('Wallet not connected');
    }

    // Generate a random salt for CREATE2
    const randomSalt = BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER));
    
    console.log('Deploying challenge with salt:', randomSalt.toString());

    try {
      // writeContract doesn't return a promise in wagmi v2
      // It triggers the transaction immediately
      deployChallenge({
        address: CHALLENGE_FACTORY_ADDRESS,
        abi: ChallengeFactoryABI,
        functionName: 'deployChallenge',
        args: [randomSalt],
        chainId: CHAIN_ID,
      });
    } catch (error) {
      console.error('Error deploying challenge:', error);
      throw error;
    }
  };

  // Deploy challenge with custom salt
  const deployWithSalt = async (salt: `0x${string}`) => {
    if (!address) {
      throw new Error('Wallet not connected');
    }

    try {
      // writeContract doesn't return a promise in wagmi v2
      // It triggers the transaction immediately
      deployChallenge({
        address: CHALLENGE_FACTORY_ADDRESS,
        abi: ChallengeFactoryABI,
        functionName: 'deployChallenge',
        args: [salt],
        chainId: CHAIN_ID,
      });
    } catch (error) {
      console.error('Error deploying challenge with salt:', error);
      throw error;
    }
  };

  // Get deployed challenge address from receipt
  const getDeployedAddress = () => {
    if (!deployReceipt) return null;
    
    // Find ChallengeDeployed event by checking the logs
    const deployedEvent = deployReceipt.logs.find(
      (log) => {
        // Check if topics array exists and has at least one element
        if (!log.topics || log.topics.length === 0) return false;
        
        // The event signature for ChallengeDeployed(address,address,uint256,uint256)
        const eventSignature = keccak256(toHex('ChallengeDeployed(address,address,uint256,uint256)'));
        return log.topics[0] === eventSignature;
      }
    );
    
    if (deployedEvent && deployedEvent.topics && deployedEvent.topics[1]) {
      // The challenge address is the first indexed parameter
      // Remove '0x' prefix and take last 40 chars (20 bytes) for the address
      const addressHex = deployedEvent.topics[1].slice(-40);
      return `0x${addressHex}` as `0x${string}`;
    }
    
    // Alternative: look for any log with an address in the data field
    // This is a fallback if the event structure is different
    if (deployReceipt.logs.length > 0) {
      const firstLog = deployReceipt.logs[0];
      if (firstLog.address) {
        // The deployed contract address might be the log emitter
        return firstLog.address as `0x${string}`;
      }
    }
    
    return null;
  };

  // Refetch data after successful deployment
  useEffect(() => {
    if (isDeploySuccess) {
      refetchTotalChallenges();
      refetchRecentChallenges();
      refetchUserChallenges();
    }
  }, [isDeploySuccess, refetchTotalChallenges, refetchRecentChallenges, refetchUserChallenges]);

  return {
    // Read data
    totalChallenges: totalChallenges ? Number(totalChallenges) : 0,
    recentChallenges: recentChallenges || [],
    userChallenges: userChallenges || [],
    isQualifiedVerifier: isQualifiedVerifier || false,
    
    // Deploy functions
    deployNewChallenge,
    deployWithSalt,
    
    // Deploy status
    isDeploying,
    isConfirmingDeploy,
    isDeploySuccess,
    deployError,
    deployedAddress: getDeployedAddress(),
    
    // Utility functions
    resetDeploy,
    refetchData: () => {
      refetchTotalChallenges();
      refetchRecentChallenges();
      refetchUserChallenges();
    }
  };
}
'use client';

import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseAbi } from 'viem';
import { baseSepolia } from 'viem/chains';

// Example ABI - replace with your actual contract ABIs
const CHALLENGE_FACTORY_ABI = parseAbi([
  'function createChallenge(string memory description, uint256 reward) public payable returns (address)',
  'function getChallenges() public view returns (address[])',
  'function challengeCount() public view returns (uint256)',
]);

const CHALLENGE_ABI = parseAbi([
  'function submitProof(string memory proofHash) public',
  'function verifyProof(address submitter, bool isValid) public',
  'function getSubmissions() public view returns (address[])',
  'function description() public view returns (string)',
  'function reward() public view returns (uint256)',
  'function status() public view returns (uint8)',
]);

// Replace with your deployed contract addresses on Base Sepolia
const CHALLENGE_FACTORY_ADDRESS = '0x0000000000000000000000000000000000000000'; // TODO: Add your factory address
const DEFAULT_CHAIN = baseSepolia;

export function useChallengeFactory() {
  const { data: challengeCount } = useReadContract({
    address: CHALLENGE_FACTORY_ADDRESS,
    abi: CHALLENGE_FACTORY_ABI,
    functionName: 'challengeCount',
    chainId: DEFAULT_CHAIN.id,
  });

  const { data: challenges } = useReadContract({
    address: CHALLENGE_FACTORY_ADDRESS,
    abi: CHALLENGE_FACTORY_ABI,
    functionName: 'getChallenges',
    chainId: DEFAULT_CHAIN.id,
  });

  const { 
    writeContract: createChallenge, 
    data: createChallengeHash,
    isPending: isCreatingChallenge 
  } = useWriteContract();

  const { isLoading: isConfirmingChallenge, isSuccess: isChallengeCreated } = 
    useWaitForTransactionReceipt({ hash: createChallengeHash });

  const handleCreateChallenge = async (description: string, reward: bigint) => {
    createChallenge({
      address: CHALLENGE_FACTORY_ADDRESS,
      abi: CHALLENGE_FACTORY_ABI,
      functionName: 'createChallenge',
      args: [description, reward],
      value: reward,
      chainId: DEFAULT_CHAIN.id,
    });
  };

  return {
    challengeCount,
    challenges,
    createChallenge: handleCreateChallenge,
    isCreatingChallenge,
    isConfirmingChallenge,
    isChallengeCreated,
  };
}

export function useChallenge(challengeAddress: `0x${string}`) {
  const { data: description } = useReadContract({
    address: challengeAddress,
    abi: CHALLENGE_ABI,
    functionName: 'description',
    chainId: DEFAULT_CHAIN.id,
  });

  const { data: reward } = useReadContract({
    address: challengeAddress,
    abi: CHALLENGE_ABI,
    functionName: 'reward',
    chainId: DEFAULT_CHAIN.id,
  });

  const { data: status } = useReadContract({
    address: challengeAddress,
    abi: CHALLENGE_ABI,
    functionName: 'status',
    chainId: DEFAULT_CHAIN.id,
  });

  const { data: submissions } = useReadContract({
    address: challengeAddress,
    abi: CHALLENGE_ABI,
    functionName: 'getSubmissions',
    chainId: DEFAULT_CHAIN.id,
  });

  const { 
    writeContract: submitProof, 
    data: submitProofHash,
    isPending: isSubmittingProof 
  } = useWriteContract();

  const { isLoading: isConfirmingSubmission, isSuccess: isProofSubmitted } = 
    useWaitForTransactionReceipt({ hash: submitProofHash });

  const { 
    writeContract: verifyProof, 
    data: verifyProofHash,
    isPending: isVerifyingProof 
  } = useWriteContract();

  const { isLoading: isConfirmingVerification, isSuccess: isProofVerified } = 
    useWaitForTransactionReceipt({ hash: verifyProofHash });

  const handleSubmitProof = async (proofHash: string) => {
    submitProof({
      address: challengeAddress,
      abi: CHALLENGE_ABI,
      functionName: 'submitProof',
      args: [proofHash],
      chainId: DEFAULT_CHAIN.id,
    });
  };

  const handleVerifyProof = async (submitter: `0x${string}`, isValid: boolean) => {
    verifyProof({
      address: challengeAddress,
      abi: CHALLENGE_ABI,
      functionName: 'verifyProof',
      args: [submitter, isValid],
      chainId: DEFAULT_CHAIN.id,
    });
  };

  return {
    description,
    reward,
    status,
    submissions,
    submitProof: handleSubmitProof,
    isSubmittingProof,
    isConfirmingSubmission,
    isProofSubmitted,
    verifyProof: handleVerifyProof,
    isVerifyingProof,
    isConfirmingVerification,
    isProofVerified,
  };
}
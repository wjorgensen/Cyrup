'use client';

import { useReadContract } from 'wagmi';
import { ReputationSystemABI } from '@/lib/contractABIs';
import { REPUTATION_SYSTEM_ADDRESS, CHAIN_ID } from '@/lib/contractAddresses';

interface UserReputation {
  totalPoints: number;
  challengeCount: number;
  winnerCount: number;
  verifierCount: number;
  verifierPoints: number;
  lastUpdate: number;
}

interface LeaderboardEntry {
  address: `0x${string}`;
  points: number;
}

export function useReputation() {
  // Get total users
  const { data: totalUsers } = useReadContract({
    address: REPUTATION_SYSTEM_ADDRESS,
    abi: ReputationSystemABI,
    functionName: 'getTotalUsers',
    chainId: CHAIN_ID,
  });

  // Get top 10 threshold
  const { data: top10Threshold } = useReadContract({
    address: REPUTATION_SYSTEM_ADDRESS,
    abi: ReputationSystemABI,
    functionName: 'getTop10Threshold',
    chainId: CHAIN_ID,
  });

  // Get leaderboard (top 10)
  const { data: leaderboardData, refetch: refetchLeaderboard } = useReadContract({
    address: REPUTATION_SYSTEM_ADDRESS,
    abi: ReputationSystemABI,
    functionName: 'getLeaderboard',
    args: [10n],
    chainId: CHAIN_ID,
  });

  // Get user reputation
  const getUserReputation = (userAddress: `0x${string}`) => {
    return useReadContract({
      address: REPUTATION_SYSTEM_ADDRESS,
      abi: ReputationSystemABI,
      functionName: 'getUserReputation',
      args: [userAddress],
      chainId: CHAIN_ID,
      enabled: !!userAddress,
    });
  };

  // Check if user is qualified verifier
  const checkQualifiedVerifier = (userAddress: `0x${string}`) => {
    return useReadContract({
      address: REPUTATION_SYSTEM_ADDRESS,
      abi: ReputationSystemABI,
      functionName: 'isQualifiedVerifier',
      args: [userAddress],
      chainId: CHAIN_ID,
      enabled: !!userAddress,
    });
  };

  // Calculate points for a given amount
  const calculatePoints = (usdcAmount: string, isVerifier: boolean) => {
    const amount = parseFloat(usdcAmount) * 1e6; // Convert to USDC wei (6 decimals)
    
    return useReadContract({
      address: REPUTATION_SYSTEM_ADDRESS,
      abi: ReputationSystemABI,
      functionName: 'calculatePoints',
      args: [BigInt(Math.floor(amount)), isVerifier],
      chainId: CHAIN_ID,
    });
  };

  // Format leaderboard data
  const formatLeaderboard = (): LeaderboardEntry[] => {
    if (!leaderboardData) return [];
    
    const [users, points] = leaderboardData;
    
    return users.map((address, index) => ({
      address: address as `0x${string}`,
      points: Number(points[index]),
    }));
  };

  // Format user reputation data
  const formatUserReputation = (data: any): UserReputation | null => {
    if (!data) return null;
    
    const [totalPoints, challengeCount, winnerCount, verifierCount, verifierPoints, lastUpdate] = data;
    
    return {
      totalPoints: Number(totalPoints),
      challengeCount: Number(challengeCount),
      winnerCount: Number(winnerCount),
      verifierCount: Number(verifierCount),
      verifierPoints: Number(verifierPoints),
      lastUpdate: Number(lastUpdate),
    };
  };

  // Get user rank based on points
  const getUserRank = (userPoints: number): string => {
    const leaderboard = formatLeaderboard();
    const userIndex = leaderboard.findIndex(entry => entry.points <= userPoints);
    
    if (userIndex === -1) {
      return `>${leaderboard.length}`;
    }
    
    return `#${userIndex + 1}`;
  };

  // Calculate win rate
  const calculateWinRate = (reputation: UserReputation): number => {
    if (!reputation || reputation.challengeCount === 0) return 0;
    return (reputation.winnerCount / reputation.challengeCount) * 100;
  };

  // Calculate verification rate
  const calculateVerificationRate = (reputation: UserReputation): number => {
    if (!reputation || reputation.challengeCount === 0) return 0;
    return (reputation.verifierCount / reputation.challengeCount) * 100;
  };

  return {
    // Raw data
    totalUsers: totalUsers ? Number(totalUsers) : 0,
    top10Threshold: top10Threshold ? Number(top10Threshold) : 0,
    leaderboardData,
    
    // Formatted data
    leaderboard: formatLeaderboard(),
    
    // Functions
    getUserReputation,
    checkQualifiedVerifier,
    calculatePoints,
    formatUserReputation,
    getUserRank,
    calculateWinRate,
    calculateVerificationRate,
    refetchLeaderboard,
  };
}
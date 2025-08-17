'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import Markdown from '@/components/Markdown';
import { useChallengeEscrow } from '@/hooks/useChallengeEscrow';
import { useChallengeSubmissions } from '@/hooks/useApi';
import { useReputation } from '@/hooks/useReputation';
import { useDemoMode } from '@/hooks/useDemoMode';

interface PageProps {
  params: {
    id: string;
  };
}

export default function ChallengePage({ params }: PageProps) {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const isDemoMode = useDemoMode();
  const challengeAddress = params.id as `0x${string}`;
  
  // Validate the address format - skip validation in demo mode
  const isValidAddress = isDemoMode || /^0x[a-fA-F0-9]{40}$/.test(params.id);
  
  // Contract hooks - only use if valid address
  const { 
    readChallenge, 
    readChallengeCount,
    approveVerifier,
    approveSolution,
    isWriting,
    isConfirming,
    isSuccess
  } = useChallengeEscrow(isValidAddress ? challengeAddress : undefined);
  
  // API hooks for submissions
  const { data: submissions, isLoading: loadingSubmissions } = useChallengeSubmissions(isValidAddress ? challengeAddress : undefined);
  
  // Reputation hook
  const { checkQualifiedVerifier } = useReputation();
  const { data: isQualifiedVerifier } = checkQualifiedVerifier(address || '0x0000000000000000000000000000000000000000' as `0x${string}`);
  
  const [challengeData, setChallengeData] = useState<any>(null);
  const [challengeId, setChallengeId] = useState<number>(0);
  const [isCreator, setIsCreator] = useState(false);
  const [isVerifier, setIsVerifier] = useState(false);
  
  // Mock data for demo mode
  const mockChallengeData: any = {
    '1': {
      title: 'Prove List Reversal Properties',
      description: `# Prove List Reversal Properties\n\n**Category:** Data Structures  \n**Difficulty:** Easy\n\n## Challenge Description\n\nProve that reversing a list twice returns the original list.\n\n## Requirements\n\n1. Formalize the list reversal operation\n2. Prove the double reversal property: reverse(reverse(L)) = L\n3. Consider edge cases (empty list, single element)\n\n## Submission Guidelines\n\n- Submit your proof in Lean 4, Coq, or Isabelle\n- Include documentation explaining your approach\n- All lemmas must be fully proven`,
      creator: '0x1234567890123456789012345678901234567890',
      rewardAmount: BigInt(500000000), // 500 USDC
      deadline: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days from now
      status: 0,
      verifier: '0x0000000000000000000000000000000000000000',
    },
    '2': {
      title: 'Binary Search Tree Invariants',
      description: `# Binary Search Tree Invariants\n\n**Category:** Algorithms  \n**Difficulty:** Medium\n\n## Challenge Description\n\nFormalize and prove the invariants of a balanced binary search tree.\n\n## Requirements\n\n1. Define BST structure and operations\n2. Prove ordering invariant\n3. Prove balance invariant for AVL trees\n4. Verify insert and delete operations maintain invariants\n\n## Bonus\n\nAdditional reward for proving complexity bounds on operations.`,
      creator: '0x1234567890123456789012345678901234567890',
      rewardAmount: BigInt(1200000000), // 1200 USDC
      deadline: Math.floor(Date.now() / 1000) + 45 * 24 * 60 * 60,
      status: 0,
      verifier: '0x9876543210987654321098765432109876543210',
    },
    '3': {
      title: 'Cryptographic Hash Function Properties',
      description: `# Cryptographic Hash Function Properties\n\n**Category:** Cryptography  \n**Difficulty:** Hard\n\n## Challenge Description\n\nProve collision resistance properties for a simplified hash function.\n\n## Requirements\n\n1. Define a simplified hash function\n2. Formalize collision resistance\n3. Prove bounds on collision probability\n4. Demonstrate preimage resistance\n\n## Note\n\nThis is a theoretical exercise with a simplified model.`,
      creator: '0x1234567890123456789012345678901234567890',
      rewardAmount: BigInt(2000000000), // 2000 USDC
      deadline: Math.floor(Date.now() / 1000) + 60 * 24 * 60 * 60,
      status: 0,
      verifier: '0x0000000000000000000000000000000000000000',
    },
    '4': {
      title: 'Sorting Algorithm Correctness',
      description: `# Sorting Algorithm Correctness\n\n**Category:** Algorithms  \n**Difficulty:** Medium\n\n## Challenge Description\n\nProve the correctness of quicksort implementation.\n\n## Requirements\n\n1. Define the quicksort algorithm formally\n2. Prove that output is sorted\n3. Prove that output is a permutation of input\n4. Verify termination for all inputs\n\n## Additional Points\n\n- Include complexity analysis\n- Handle edge cases (empty list, duplicates)`,
      creator: '0x1234567890123456789012345678901234567890',
      rewardAmount: BigInt(800000000), // 800 USDC
      deadline: Math.floor(Date.now() / 1000) + 35 * 24 * 60 * 60,
      status: 0,
      verifier: '0xABCD567890123456789012345678901234567890',
    },
    '5': {
      title: 'Graph Connectivity Theorem',
      description: `# Graph Connectivity Theorem\n\n**Category:** Graph Theory  \n**Difficulty:** Medium\n\n## Challenge Description\n\nProve that a graph with n vertices and at least n edges contains a cycle.\n\n## Requirements\n\n1. Formalize graph structure and cycle definition\n2. Prove the main theorem\n3. Consider both directed and undirected cases\n4. Handle connected and disconnected graphs\n\n## Bonus Challenge\n\nExtend to finding the minimum cycle length.`,
      creator: '0x1234567890123456789012345678901234567890',
      rewardAmount: BigInt(1500000000), // 1500 USDC
      deadline: Math.floor(Date.now() / 1000) + 40 * 24 * 60 * 60,
      status: 0,
      verifier: '0x0000000000000000000000000000000000000000',
    },
    '6': {
      title: 'Prime Number Distribution',
      description: `# Prime Number Distribution\n\n**Category:** Number Theory  \n**Difficulty:** Hard\n\n## Challenge Description\n\nProve properties about the distribution of prime numbers below n.\n\n## Requirements\n\n1. Formalize primality testing\n2. Prove bounds on π(n) (prime counting function)\n3. Verify sieve algorithms\n4. Prove basic properties of primes\n\n## Advanced Tasks\n\n- Implement and verify Miller-Rabin test\n- Prove properties of twin primes`,
      creator: '0x1234567890123456789012345678901234567890',
      rewardAmount: BigInt(3000000000), // 3000 USDC
      deadline: Math.floor(Date.now() / 1000) + 70 * 24 * 60 * 60,
      status: 0,
      verifier: '0xEFGH567890123456789012345678901234567890',
    },
  };
  
  // Get the total number of challenges
  const { data: challengeCount } = readChallengeCount();
  
  // Read challenge data
  const { data: challengeInfo, refetch: refetchChallenge } = readChallenge(challengeId);
  
  useEffect(() => {
    if (isDemoMode && mockChallengeData[params.id]) {
      // Use mock data in demo mode
      const mockData = mockChallengeData[params.id];
      setChallengeData(mockData);
      
      // In demo mode, simulate creator/verifier roles
      if (address) {
        setIsCreator(false); // User is never the creator in demo mode
        setIsVerifier(mockData.verifier !== '0x0000000000000000000000000000000000000000' && 
                     Math.random() > 0.8); // Random chance to be verifier for demo
      }
    } else if (challengeInfo) {
      const [creator, rewardAmount, deadline, status, verifier, description] = challengeInfo;
      
      const data = {
        creator,
        rewardAmount,
        deadline: Number(deadline),
        status: Number(status),
        verifier,
        description: description || '',
      };
      
      setChallengeData(data);
      
      // Check if current user is creator or verifier
      if (address) {
        setIsCreator(creator.toLowerCase() === address.toLowerCase());
        setIsVerifier(verifier.toLowerCase() === address.toLowerCase());
      }
    }
  }, [challengeInfo, address, isDemoMode, params.id]);
  
  // Handle approving a verifier
  const handleApproveVerifier = async (verifierAddress: string) => {
    if (!isCreator) {
      alert('Only the challenge creator can approve verifiers');
      return;
    }
    
    try {
      await approveVerifier(challengeId, verifierAddress as `0x${string}`);
      refetchChallenge();
    } catch (error) {
      console.error('Error approving verifier:', error);
      alert('Failed to approve verifier');
    }
  };
  
  // Handle applying as verifier
  const handleApplyAsVerifier = () => {
    if (!isQualifiedVerifier) {
      alert('You need to have a minimum reputation to apply as a verifier');
      return;
    }
    
    // In a real implementation, this would submit an application
    // For now, we'll just show a message
    alert('Your verifier application has been submitted. The challenge creator will review it.');
  };
  
  // Handle approving a solution
  const handleApproveSolution = async (submissionUid: string) => {
    if (!isVerifier) {
      alert('Only the assigned verifier can approve solutions');
      return;
    }
    
    try {
      // In the real implementation, we'd get the winner address from the submission
      const submission = submissions?.find((s: any) => s.uid === submissionUid);
      if (!submission) {
        alert('Submission not found');
        return;
      }
      
      await approveSolution(challengeId, submission.wallet_address as `0x${string}`);
      refetchChallenge();
    } catch (error) {
      console.error('Error approving solution:', error);
      alert('Failed to approve solution');
    }
  };
  
  // Format functions
  const formatDeadline = (timestamp: number) => {
    if (!timestamp) return 'No deadline';
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };
  
  const formatReward = (amount: bigint) => {
    if (!amount) return '0 USDC';
    return (Number(amount) / 1e6).toFixed(2) + ' USDC';
  };
  
  const getStatusText = (status: number) => {
    const statuses = ['Open', 'Active', 'Pending Approval', 'Completed', 'Cancelled'];
    return statuses[status] || 'Unknown';
  };
  
  const getStatusColor = (status: number) => {
    const colors = [
      'text-green-600', // Open
      'text-blue-600',  // Active
      'text-yellow-600', // Pending Approval
      'text-purple-600', // Completed
      'text-gray-600'   // Cancelled
    ];
    return colors[status] || 'text-gray-600';
  };
  
  const getDifficultyFromDescription = (description: string) => {
    // Extract difficulty from markdown if present
    if (description.includes('**Difficulty:** Easy')) return 'Easy';
    if (description.includes('**Difficulty:** Hard')) return 'Hard';
    return 'Medium';
  };
  
  const getCategoryFromDescription = (description: string) => {
    // Extract category from markdown if present
    const categoryMatch = description.match(/\*\*Category:\*\* ([^\n]*)/);
    return categoryMatch ? categoryMatch[1] : 'General';
  };
  
  const getTitleFromDescription = (description: string) => {
    // Extract title from markdown if present (first # heading)
    const titleMatch = description.match(/^# ([^\n]*)/m);
    return titleMatch ? titleMatch[1] : 'Challenge';
  };
  
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'text-green-600 bg-green-100';
      case 'Medium': return 'text-yellow-600 bg-yellow-100';
      case 'Hard': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };
  
  const getTimeRemaining = (deadline: number) => {
    if (!deadline) return 'No deadline';
    const now = Date.now() / 1000;
    const diff = deadline - now;
    
    if (diff <= 0) return 'Expired';
    
    const days = Math.floor(diff / 86400);
    const hours = Math.floor((diff % 86400) / 3600);
    
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ${hours} hour${hours > 1 ? 's' : ''}`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
    
    const minutes = Math.floor((diff % 3600) / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  };
  
  // Show error if invalid address
  if (!isValidAddress) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <Card className="text-center py-12">
              <h2 className="text-xl font-semibold mb-4">Invalid Challenge Address</h2>
              <p className="text-gray-500 mb-6">The challenge address provided is not valid.</p>
              <Link href="/dashboard">
                <Button variant="primary">Browse Challenges</Button>
              </Link>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!challengeData) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <Card className="text-center py-12">
              <h2 className="text-xl font-semibold mb-4">Challenge Not Found</h2>
              <p className="text-gray-500 mb-6">
                This challenge may not have been initialized yet or doesn't exist.
              </p>
              <p className="text-xs text-gray-400 mb-6">
                Address: {challengeAddress}
              </p>
              <Link href="/dashboard">
                <Button variant="primary">Browse Challenges</Button>
              </Link>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }
  
  const title = getTitleFromDescription(challengeData.description);
  const category = getCategoryFromDescription(challengeData.description);
  const difficulty = getDifficultyFromDescription(challengeData.description);
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getDifficultyColor(difficulty)}`}>
                {difficulty}
              </span>
              <span className="text-sm text-gray-500">{category}</span>
              <span className={`text-sm font-medium ${getStatusColor(challengeData.status)}`}>
                {getStatusText(challengeData.status)}
              </span>
            </div>
            
            <h1 className="text-3xl font-bold mb-4">{title}</h1>
            
            <div className="flex flex-wrap gap-6 text-sm text-gray-600">
              <div>
                <span className="font-medium">Contract:</span> {challengeAddress.slice(0, 6)}...{challengeAddress.slice(-4)}
              </div>
              <div>
                <span className="font-medium">Creator:</span> {challengeData.creator.slice(0, 6)}...{challengeData.creator.slice(-4)}
              </div>
              <div>
                <span className="font-medium">Deadline:</span> {formatDeadline(challengeData.deadline)}
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <Card className="mb-8">
                <div className="prose prose-sm max-w-none">
                  <Markdown content={challengeData.description} />
                </div>
              </Card>
              
              <Card>
                <h2 className="text-xl font-semibold mb-4">Submissions</h2>
                {loadingSubmissions ? (
                  <p className="text-gray-500">Loading submissions...</p>
                ) : submissions && submissions.length > 0 ? (
                  <div className="space-y-3">
                    {submissions.map((submission: any) => (
                      <div key={submission.uid} className="flex justify-between items-center py-3 border-b border-black/5 last:border-0">
                        <div>
                          <p className="font-medium">{submission.wallet_address.slice(0, 6)}...{submission.wallet_address.slice(-4)}</p>
                          <p className="text-sm text-gray-500">
                            Submitted {new Date(submission.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium ${
                            submission.status === 'verified' ? 'text-green-600' :
                            submission.status === 'failed' ? 'text-red-600' :
                            submission.status === 'pending' ? 'text-yellow-600' :
                            'text-gray-600'
                          }`}>
                            {submission.status}
                          </span>
                          {isVerifier && submission.status === 'verified' && challengeData.status === 0 && (
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => handleApproveSolution(submission.uid)}
                            >
                              Approve
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No submissions yet. Be the first!</p>
                )}
              </Card>
            </div>
            
            <div>
              <Card className="sticky top-24">
                <div className="text-center mb-6">
                  <p className="text-3xl font-bold text-purple-600 mb-1">{formatReward(challengeData.rewardAmount)}</p>
                  <p className="text-sm text-gray-500">Reward</p>
                </div>
                
                <div className="space-y-4 mb-6">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Submissions:</span>
                    <span className="font-medium">{submissions?.length || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Time Remaining:</span>
                    <span className="font-medium">{getTimeRemaining(challengeData.deadline)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Verifier:</span>
                    <span className="font-medium">
                      {challengeData.verifier === '0x0000000000000000000000000000000000000000' 
                        ? 'Needed' 
                        : `${challengeData.verifier.slice(0, 6)}...${challengeData.verifier.slice(-4)}`}
                    </span>
                  </div>
                </div>
                
                {/* Action buttons based on user role */}
                {isCreator ? (
                  <div className="space-y-3">
                    <div className="text-center p-3 bg-purple-100 rounded">
                      <p className="text-sm font-medium text-purple-700">You created this challenge</p>
                    </div>
                    {challengeData.verifier === '0x0000000000000000000000000000000000000000' && (
                      <p className="text-sm text-gray-600 text-center">
                        Waiting for qualified verifiers to apply
                      </p>
                    )}
                  </div>
                ) : isVerifier ? (
                  <div className="space-y-3">
                    <div className="text-center p-3 bg-purple-100 rounded">
                      <p className="text-sm font-medium text-purple-700">You are the verifier</p>
                    </div>
                    <Button variant="secondary" size="lg" className="w-full">
                      <Link href={`/verifier-dashboard`}>
                        Review Submissions
                      </Link>
                    </Button>
                  </div>
                ) : isDemoMode || challengeData.status === 0 ? (
                  // In demo mode or when challenge is open, show Submit Solution
                  isDemoMode ? (
                    <Button variant="primary" size="lg" className="w-full">
                      <Link href={`/submit/${params.id}`}>
                        Submit Solution
                      </Link>
                    </Button>
                  ) : challengeData.verifier === '0x0000000000000000000000000000000000000000' && isQualifiedVerifier ? (
                    <Button 
                      variant="primary" 
                      size="lg" 
                      className="w-full"
                      onClick={handleApplyAsVerifier}
                    >
                      Apply as Verifier
                    </Button>
                  ) : (
                    <Button variant="primary" size="lg" className="w-full">
                      <Link href={`/submit/${challengeAddress}`}>
                        Submit Solution
                      </Link>
                    </Button>
                  )
                ) : (
                  <div className="text-center p-3 bg-gray-100 rounded">
                    <p className="text-sm font-medium text-gray-700">
                      Challenge is {getStatusText(challengeData.status)}
                    </p>
                  </div>
                )}
                
                <div className="mt-4 pt-4 border-t border-black/10">
                  <p className="text-xs text-gray-500 text-center">
                    Solutions are verified on-chain. Rewards are distributed automatically upon successful verification.
                  </p>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAccount, useBalance, useReadContract, useSwitchChain } from 'wagmi';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { useDemoMode } from '@/hooks/useDemoMode';
import { USDC_ADDRESS, CHAIN_ID } from '@/lib/contractAddresses';
import { baseSepolia } from 'viem/chains';
import { formatUnits } from 'viem';
import { useChallengeFactory } from '@/hooks/useChallengeFactory';
import { useSubmissions } from '@/hooks/useApi';
import { useReputation } from '@/hooks/useReputation';
import { useChallengeEscrow } from '@/hooks/useChallengeEscrow';

// Minimal ERC20 ABI for balance checking
const ERC20_ABI = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// Mock data for demo mode
const mockActivity = [
  {
    id: '1',
    type: 'submission',
    action: 'Submitted Solution',
    challenge: 'Prove List Reversal Properties',
    status: 'verified',
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    reward: '500 USDC',
  },
  {
    id: '2',
    type: 'challenge',
    action: 'Created Challenge',
    challenge: 'Binary Search Tree Invariants',
    status: 'active',
    date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
    reward: '1,200 USDC',
  },
  {
    id: '3',
    type: 'submission',
    action: 'Submitted Solution',
    challenge: 'Sorting Algorithm Correctness',
    status: 'pending',
    date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
    reward: '800 USDC',
  },
  {
    id: '4',
    type: 'verification',
    action: 'Verified Solution',
    challenge: 'Graph Connectivity Theorem',
    status: 'completed',
    date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago
    reward: '50 USDC', // Verifier fee
  },
];

const mockSubmissions = [
  {
    uid: 'sub-1',
    challenge_address: '0xChallenge1234567890123456789012345678901',
    challenge_name: 'Prove List Reversal Properties',
    status: 'verified',
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    reward: '500 USDC',
    verifier: '0xVerifier123456',
  },
  {
    uid: 'sub-2',
    challenge_address: '0xChallenge2345678901234567890123456789012',
    challenge_name: 'Sorting Algorithm Correctness',
    status: 'pending',
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    reward: '800 USDC',
    verifier: null,
  },
  {
    uid: 'sub-3',
    challenge_address: '0xChallenge3456789012345678901234567890123',
    challenge_name: 'Prime Number Distribution',
    status: 'failed',
    created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    reward: '3,000 USDC',
    verifier: '0xVerifier789012',
  },
];

const mockChallenges = [
  {
    address: '0xChallenge9876543210987654321098765432109',
    title: 'Binary Search Tree Invariants',
    status: 'active',
    reward: '1,200 USDC',
    submissions: 7,
    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    address: '0xChallengeABCDEF123456789012345678901234',
    title: 'Cryptographic Hash Function Properties',
    status: 'pending_verifier',
    reward: '2,000 USDC',
    submissions: 1,
    deadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const mockStats = {
  totalPoints: 2850,
  winnerCount: 3,
  challengeCount: 8,
  verifierCount: 2,
  verifierPoints: 150,
  totalEarned: '2,300 USDC',
  successRate: 75,
  rank: 42,
};

export default function Profile() {
  const { address, isConnected, chainId, connector } = useAccount();
  const { switchChain } = useSwitchChain();
  const { data: ethBalance } = useBalance({ 
    address,
    chainId: baseSepolia.id 
  });
  
  // Fetch USDC balance on Base Sepolia
  const { data: usdcBalance } = useReadContract({
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: baseSepolia.id,
    query: {
      enabled: !!address,
    }
  });
  
  // Contract hooks
  const { userChallenges } = useChallengeFactory();
  const { data: userSubmissions } = useSubmissions(address);
  const { getUserReputation, formatUserReputation } = useReputation();
  const { data: reputationData } = getUserReputation(address || '0x0000000000000000000000000000000000000000' as `0x${string}`);
  
  const [recipientAddress, setRecipientAddress] = useState('');
  const [sendAmount, setAmount] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'send' | 'receive' | 'challenges' | 'submissions'>('overview');
  const [challengeDetails, setChallengeDetails] = useState<any[]>([]);
  const isDemoMode = useDemoMode();
  
  // Format reputation data - use mock data in demo mode
  const reputation = isDemoMode ? mockStats : formatUserReputation(reputationData);
  const displaySubmissions = isDemoMode ? mockSubmissions : userSubmissions;
  const displayChallenges = isDemoMode ? mockChallenges : challengeDetails;
  const displayActivity = isDemoMode ? mockActivity : [];
  
  // Check if using Coinbase embedded wallet
  const isCoinbaseWallet = connector?.id === 'cdp-embedded-wallet' || 
                           connector?.name?.toLowerCase().includes('coinbase');
  
  const isWrongNetwork = !isCoinbaseWallet && chainId !== baseSepolia.id;
  const isWrongWallet = isConnected && !isCoinbaseWallet;
  
  if (!isConnected && !isDemoMode) {
    redirect('/');
  }
  
  // Fetch challenge details for each user challenge
  useEffect(() => {
    const fetchChallengeDetails = async () => {
      if (!userChallenges || userChallenges.length === 0) {
        setChallengeDetails([]);
        return;
      }
      
      const details = [];
      for (const challengeAddress of userChallenges) {
        // We could fetch challenge details here if needed
        details.push({
          address: challengeAddress,
          // Additional details would be fetched here
        });
      }
      setChallengeDetails(details);
    };
    
    fetchChallengeDetails();
  }, [userChallenges]);
  
  const handleSendUSDC = () => {
    console.log('Sending USDC:', { to: recipientAddress, amount: sendAmount });
    setRecipientAddress('');
    setAmount('');
  };
  
  const getSubmissionStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return 'text-green-600';
      case 'failed': return 'text-red-600';
      case 'pending': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-12">
            <h1 className="text-5xl font-black uppercase mb-4">Your Profile</h1>
            <p className="font-mono text-sm">
              Manage your wallet and track your performance
            </p>
          </div>
          
          {isWrongWallet && (
            <div className="mb-6 p-4 bg-red-100 border-2 border-red-600 shadow-box-sm">
              <div>
                <p className="font-black text-lg uppercase">Wrong Wallet Connected</p>
                <p className="text-sm font-mono mt-1">
                  You are connected with {connector?.name || 'an external wallet'}. 
                  Please disconnect and use the Coinbase embedded wallet to access this app.
                </p>
                <p className="text-xs font-mono mt-2 text-red-700">
                  Go to the homepage and click "Disconnect", then reconnect with the Coinbase wallet.
                </p>
              </div>
            </div>
          )}
          
          {!isWrongWallet && isWrongNetwork && chainId && (
            <div className="mb-6 p-4 bg-yellow-100 border-2 border-yellow-600 shadow-box-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-black text-lg uppercase">Wrong Network</p>
                  <p className="text-sm font-mono mt-1">Please switch to Base Sepolia to use this app</p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => switchChain({ chainId: baseSepolia.id })}
                >
                  Switch Network
                </Button>
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <Card className="bg-white mb-8">
                <div className="mb-6">
                  <h2 className="font-black text-2xl uppercase mb-2">Wallet Details</h2>
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-mono uppercase mb-1">
                        Wallet ({connector?.name || 'Connected'})
                      </p>
                      <p className="font-mono text-sm break-all">{address}</p>
                    </div>
                    <div>
                      <p className="text-xs font-mono uppercase mb-1">Network</p>
                      <p className="font-mono text-sm">
                        {chainId === baseSepolia.id ? 'Base Sepolia' : `Chain ID: ${chainId}`}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-mono uppercase mb-1">ETH Balance</p>
                      <p className="font-black text-xl text-gray-700">
                        {isDemoMode ? '0.1234 ETH' : ethBalance ? `${parseFloat(ethBalance.formatted).toFixed(4)} ETH` : '0.0000 ETH'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-mono uppercase mb-1">USDC Balance</p>
                      <p className="font-black text-2xl text-purple-700">
                        {isDemoMode ? '5,420.69 USDC' : usdcBalance ? `${parseFloat(formatUnits(usdcBalance, 6)).toFixed(2)} USDC` : '0.00 USDC'}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="border-t-2 border-black pt-6">
                  <div className="flex gap-2 mb-6 flex-wrap">
                    <Button
                      variant={activeTab === 'overview' ? 'primary' : 'ghost'}
                      size="sm"
                      onClick={() => setActiveTab('overview')}
                    >
                      Overview
                    </Button>
                    <Button
                      variant={activeTab === 'challenges' ? 'primary' : 'ghost'}
                      size="sm"
                      onClick={() => setActiveTab('challenges')}
                    >
                      My Challenges ({isDemoMode ? mockChallenges.length : userChallenges?.length || 0})
                    </Button>
                    <Button
                      variant={activeTab === 'submissions' ? 'primary' : 'ghost'}
                      size="sm"
                      onClick={() => setActiveTab('submissions')}
                    >
                      My Submissions ({isDemoMode ? mockSubmissions.length : userSubmissions?.length || 0})
                    </Button>
                    <Button
                      variant={activeTab === 'send' ? 'primary' : 'ghost'}
                      size="sm"
                      onClick={() => setActiveTab('send')}
                    >
                      Send USDC
                    </Button>
                    <Button
                      variant={activeTab === 'receive' ? 'primary' : 'ghost'}
                      size="sm"
                      onClick={() => setActiveTab('receive')}
                    >
                      Receive
                    </Button>
                  </div>
                  
                  {activeTab === 'overview' && (
                    <div>
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="p-4 bg-white shadow-box-sm">
                          <p className="text-xs font-mono uppercase mb-1">Reputation Score</p>
                          <p className="font-black text-2xl">{reputation?.totalPoints || 0}</p>
                        </div>
                        <div className="p-4 bg-white shadow-box-sm">
                          <p className="text-xs font-mono uppercase mb-1">Challenges Won</p>
                          <p className="font-black text-2xl text-green-600">{reputation?.winnerCount || 0}</p>
                        </div>
                        <div className="p-4 bg-white shadow-box-sm">
                          <p className="text-xs font-mono uppercase mb-1">Challenges Created</p>
                          <p className="font-black text-2xl">{isDemoMode ? mockChallenges.length : userChallenges?.length || 0}</p>
                        </div>
                        <div className="p-4 bg-white shadow-box-sm">
                          <p className="text-xs font-mono uppercase mb-1">Verifications</p>
                          <p className="font-black text-2xl">{reputation?.verifierCount || 0}</p>
                        </div>
                        <div className="p-4 bg-white shadow-box-sm">
                          <p className="text-xs font-mono uppercase mb-1">Total Earned</p>
                          <p className="font-black text-2xl text-purple-600">{isDemoMode ? mockStats.totalEarned : '0 USDC'}</p>
                        </div>
                        <div className="p-4 bg-white shadow-box-sm">
                          <p className="text-xs font-mono uppercase mb-1">Success Rate</p>
                          <p className="font-black text-2xl">{isDemoMode ? `${mockStats.successRate}%` : reputation && reputation.challengeCount > 0 ? `${Math.round((reputation.winnerCount / reputation.challengeCount) * 100)}%` : '0%'}</p>
                        </div>
                      </div>
                      
                      {isDemoMode && (
                        <div>
                          <h3 className="font-bold text-lg mb-3">Recent Activity</h3>
                          <div className="space-y-3">
                            {mockActivity.slice(0, 5).map((activity) => (
                              <div key={activity.id} className="flex justify-between items-center p-3 bg-gray-50 border border-gray-200 rounded">
                                <div>
                                  <p className="font-medium text-sm">{activity.action}</p>
                                  <p className="text-xs text-gray-600">{activity.challenge}</p>
                                  <p className="text-xs text-gray-500">{formatDate(activity.date)}</p>
                                </div>
                                <div className="text-right">
                                  <span className={`text-xs font-medium px-2 py-1 rounded ${
                                    activity.status === 'verified' ? 'bg-green-100 text-green-700' :
                                    activity.status === 'active' ? 'bg-blue-100 text-blue-700' :
                                    activity.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                    activity.status === 'completed' ? 'bg-purple-100 text-purple-700' :
                                    'bg-gray-100 text-gray-700'
                                  }`}>
                                    {activity.status}
                                  </span>
                                  <p className="text-sm font-bold mt-1">{activity.reward}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {activeTab === 'challenges' && (
                    <div className="space-y-4">
                      <h3 className="font-bold text-lg mb-2">Challenges You Created</h3>
                      {(isDemoMode ? mockChallenges : userChallenges) && (isDemoMode ? mockChallenges.length : userChallenges?.length || 0) > 0 ? (
                        <div className="space-y-3">
                          {isDemoMode ? (
                            mockChallenges.map((challenge: any) => (
                              <div key={challenge.address} className="p-4 bg-gray-50 border border-gray-200 rounded">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className="font-bold text-sm">{challenge.title}</p>
                                    <p className="text-xs text-gray-600 font-mono">
                                      {challenge.address.slice(0, 6)}...{challenge.address.slice(-4)}
                                    </p>
                                    <div className="flex gap-4 mt-2 text-xs text-gray-500">
                                      <span>Reward: {challenge.reward}</span>
                                      <span>Submissions: {challenge.submissions}</span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">
                                      Created {formatDate(challenge.created_at)}
                                    </p>
                                  </div>
                                  <div className="flex flex-col gap-2">
                                    <span className={`text-xs font-medium px-2 py-1 rounded ${
                                      challenge.status === 'active' ? 'bg-green-100 text-green-700' :
                                      challenge.status === 'pending_verifier' ? 'bg-yellow-100 text-yellow-700' :
                                      'bg-gray-100 text-gray-700'
                                    }`}>
                                      {challenge.status === 'active' ? 'Active' : 
                                       challenge.status === 'pending_verifier' ? 'Needs Verifier' : 
                                       challenge.status}
                                    </span>
                                    <Link href={`/challenge/${challenge.address}`}>
                                      <Button variant="secondary" size="sm">
                                        View Details
                                      </Button>
                                    </Link>
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            userChallenges?.map((challengeAddress: string, index: number) => (
                              <div key={challengeAddress} className="p-4 bg-gray-50 border border-gray-200 rounded">
                                <div className="flex justify-between items-center">
                                  <div>
                                    <p className="font-mono text-sm">Challenge #{index + 1}</p>
                                    <p className="text-xs text-gray-600 font-mono">
                                      {challengeAddress.slice(0, 6)}...{challengeAddress.slice(-4)}
                                    </p>
                                  </div>
                                  <div className="flex gap-2">
                                    <Link href={`/challenge/${challengeAddress}`}>
                                      <Button variant="secondary" size="sm">
                                        View Details
                                      </Button>
                                    </Link>
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <p>You haven't created any challenges yet.</p>
                          <Link href="/create">
                            <Button variant="primary" size="sm" className="mt-4">
                              Create Your First Challenge
                            </Button>
                          </Link>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {activeTab === 'submissions' && (
                    <div className="space-y-4">
                      <h3 className="font-bold text-lg mb-2">Your Submissions</h3>
                      {(isDemoMode ? mockSubmissions : userSubmissions) && (isDemoMode ? mockSubmissions.length : userSubmissions?.length || 0) > 0 ? (
                        <div className="space-y-3">
                          {(isDemoMode ? mockSubmissions : userSubmissions || []).map((submission: any) => (
                            <div key={submission.uid} className="p-4 bg-gray-50 border border-gray-200 rounded">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="font-bold text-sm">{isDemoMode ? submission.challenge_name : 'Challenge'}</p>
                                  <p className="text-xs text-gray-600 font-mono">
                                    {submission.challenge_address.slice(0, 6)}...{submission.challenge_address.slice(-4)}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    Submitted {formatDate(submission.created_at)}
                                  </p>
                                  {isDemoMode && submission.reward && (
                                    <p className="text-sm font-bold text-purple-600 mt-1">
                                      Reward: {submission.reward}
                                    </p>
                                  )}
                                </div>
                                <div className="text-right">
                                  <span className={`text-xs font-medium px-2 py-1 rounded ${
                                    submission.status === 'verified' ? 'bg-green-100 text-green-700' :
                                    submission.status === 'failed' ? 'bg-red-100 text-red-700' :
                                    submission.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-gray-100 text-gray-700'
                                  }`}>
                                    {submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}
                                  </span>
                                  {isDemoMode && submission.verifier && (
                                    <p className="text-xs text-gray-500 mt-2">
                                      Verifier: {submission.verifier.slice(0, 6)}...
                                    </p>
                                  )}
                                  <div className="mt-2">
                                    <Link href={`/challenge/${isDemoMode ? '1' : submission.challenge_address}`}>
                                      <Button variant="ghost" size="sm">
                                        View Challenge
                                      </Button>
                                    </Link>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <p>You haven't submitted any solutions yet.</p>
                          <Link href="/dashboard">
                            <Button variant="primary" size="sm" className="mt-4">
                              Browse Challenges
                            </Button>
                          </Link>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {activeTab === 'send' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-mono uppercase mb-2">
                          Recipient Address
                        </label>
                        <input
                          type="text"
                          placeholder="0x..."
                          className="w-full px-4 py-3 border-2 border-black shadow-box-sm font-mono text-sm focus:outline-none"
                          value={recipientAddress}
                          onChange={(e) => setRecipientAddress(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-mono uppercase mb-2">
                          Amount (USDC)
                        </label>
                        <input
                          type="number"
                          placeholder="0.00"
                          className="w-full px-4 py-3 border-2 border-black shadow-box-sm font-mono text-sm focus:outline-none"
                          value={sendAmount}
                          onChange={(e) => setAmount(e.target.value)}
                        />
                      </div>
                      <Button
                        variant="primary"
                        size="lg"
                        onClick={handleSendUSDC}
                        className="w-full"
                        disabled={!recipientAddress || !sendAmount}
                      >
                        Send USDC
                      </Button>
                    </div>
                  )}
                  
                  {activeTab === 'receive' && (
                    <div className="space-y-4">
                      <div className="p-6 bg-white shadow-box-sm text-center">
                        <p className="text-xs font-mono uppercase mb-4">Your Wallet Address</p>
                        <p className="font-mono text-sm break-all mb-4">{address}</p>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => navigator.clipboard.writeText(address || '')}
                        >
                          Copy Address
                        </Button>
                      </div>
                      <div className="p-4 bg-purple-100 border-2 border-purple-700">
                        <p className="text-sm font-mono">
                          Share this address to receive USDC payments. Only send USDC on Base Sepolia network.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </div>
            
            <div className="lg:col-span-1">
              <Card className="bg-white mb-6">
                <h3 className="font-black text-xl mb-4 uppercase">Quick Stats</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Points</span>
                    <span className="font-bold">{reputation?.totalPoints || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Win Rate</span>
                    <span className="font-bold">
                      {reputation && reputation.challengeCount > 0 
                        ? `${Math.round((reputation.winnerCount / reputation.challengeCount) * 100)}%`
                        : '0%'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Verifier Points</span>
                    <span className="font-bold">{reputation?.verifierPoints || 0}</span>
                  </div>
                </div>
              </Card>
              
              <Card className="bg-white mb-6">
                <h3 className="font-black text-xl mb-4 uppercase">Recent Activity</h3>
                <div className="space-y-3">
                  {isDemoMode ? (
                    mockActivity.slice(0, 3).map((activity) => (
                      <div key={activity.id} className="pb-3 border-b border-gray-200 last:border-0">
                        <p className="font-mono text-xs text-gray-600">{formatDate(activity.date)}</p>
                        <p className="font-bold text-sm">{activity.action}</p>
                        <p className="text-xs text-gray-500">{activity.challenge}</p>
                        <div className="flex justify-between items-center mt-1">
                          <span className={`text-xs font-medium ${
                            activity.status === 'verified' ? 'text-green-600' :
                            activity.status === 'active' ? 'text-blue-600' :
                            activity.status === 'pending' ? 'text-yellow-600' :
                            activity.status === 'completed' ? 'text-purple-600' :
                            'text-gray-600'
                          }`}>
                            {activity.status}
                          </span>
                          <span className="text-xs font-bold text-purple-600">{activity.reward}</span>
                        </div>
                      </div>
                    ))
                  ) : userSubmissions && userSubmissions.length > 0 ? (
                    userSubmissions.slice(0, 3).map((submission: any) => (
                      <div key={submission.uid} className="pb-3 border-b border-gray-200">
                        <p className="font-mono text-xs text-gray-600">{formatDate(submission.created_at)}</p>
                        <p className="font-bold text-sm">Submitted Solution</p>
                        <p className={`font-medium ${getSubmissionStatusColor(submission.status)}`}>
                          Status: {submission.status}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm">No recent activity</p>
                  )}
                </div>
              </Card>
              
              <Card className="bg-white">
                <h3 className="font-black text-xl mb-4 uppercase">Achievements</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className={`p-3 ${reputation && reputation.winnerCount > 0 ? 'bg-purple-700 text-white' : 'bg-gray-300 text-black opacity-50'} text-center shadow-box-sm`}>
                    <div className="text-2xl mb-1">🏆</div>
                    <p className="text-xs font-black uppercase">First Win</p>
                  </div>
                  <div className={`p-3 ${reputation && reputation.winnerCount >= 10 ? 'bg-yellow-500 text-black' : 'bg-gray-300 text-black opacity-50'} text-center shadow-box-sm`}>
                    <div className="text-2xl mb-1">⭐</div>
                    <p className="text-xs font-black uppercase">10 Wins</p>
                  </div>
                  <div className={`p-3 ${reputation && reputation.totalPoints >= 1000 ? 'bg-green-500 text-white' : 'bg-gray-300 text-black opacity-50'} text-center shadow-box-sm`}>
                    <div className="text-2xl mb-1">💎</div>
                    <p className="text-xs font-black uppercase">1K Points</p>
                  </div>
                  <div className={`p-3 ${reputation && reputation.verifierCount >= 5 ? 'bg-blue-500 text-white' : 'bg-gray-300 text-black opacity-50'} text-center shadow-box-sm`}>
                    <div className="text-2xl mb-1">🔍</div>
                    <p className="text-xs font-black uppercase">Verifier</p>
                  </div>
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
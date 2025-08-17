'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { VerifierOnly } from '@/components/VerifierOnly';
import Link from 'next/link';
import { useDemoMode } from '@/hooks/useDemoMode';
import { useVerifierMode } from '@/hooks/useVerifierMode';
import { useSearchParams } from 'next/navigation';

interface Challenge {
  id: string;
  title: string;
  description: string;
  reward: string;
  deadline: string;
  submissions: number;
  category: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  verifier?: string | null;
  needsVerifier?: boolean;
}

const mockChallenges: Challenge[] = [
  {
    id: '1',
    title: 'Prove List Reversal Properties',
    description: 'Prove that reversing a list twice returns the original list.',
    reward: '500 USDC',
    deadline: '2024-02-15',
    submissions: 3,
    category: 'Data Structures',
    difficulty: 'Easy',
    verifier: null,
    needsVerifier: true,
  },
  {
    id: '2',
    title: 'Binary Search Tree Invariants',
    description: 'Formalize and prove the invariants of a balanced binary search tree.',
    reward: '1,200 USDC',
    deadline: '2024-02-20',
    submissions: 7,
    category: 'Algorithms',
    difficulty: 'Medium',
    verifier: '0x9876...5432',
    needsVerifier: false,
  },
  {
    id: '3',
    title: 'Cryptographic Hash Function Properties',
    description: 'Prove collision resistance properties for a simplified hash function.',
    reward: '2,000 USDC',
    deadline: '2024-03-01',
    submissions: 1,
    category: 'Cryptography',
    difficulty: 'Hard',
    verifier: null,
    needsVerifier: true,
  },
  {
    id: '4',
    title: 'Sorting Algorithm Correctness',
    description: 'Prove the correctness of quicksort implementation.',
    reward: '800 USDC',
    deadline: '2024-02-18',
    submissions: 5,
    category: 'Algorithms',
    difficulty: 'Medium',
    verifier: '0xABCD...1234',
    needsVerifier: false,
  },
  {
    id: '5',
    title: 'Graph Connectivity Theorem',
    description: 'Prove that a graph with n vertices and at least n edges contains a cycle.',
    reward: '1,500 USDC',
    deadline: '2024-02-25',
    submissions: 2,
    category: 'Graph Theory',
    difficulty: 'Medium',
    verifier: null,
    needsVerifier: true,
  },
  {
    id: '6',
    title: 'Prime Number Distribution',
    description: 'Prove properties about the distribution of prime numbers below n.',
    reward: '3,000 USDC',
    deadline: '2024-03-10',
    submissions: 0,
    category: 'Number Theory',
    difficulty: 'Hard',
    verifier: '0xEFGH...5678',
    needsVerifier: false,
  },
];

export default function Dashboard() {
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [showNeedsVerifier, setShowNeedsVerifier] = useState(false);
  const isDemoMode = useDemoMode();
  const isVerifierMode = useVerifierMode();
  const searchParams = useSearchParams();
  
  useEffect(() => {
    if (isDemoMode || isVerifierMode) {
      setChallenges(mockChallenges);
      if (isVerifierMode) {
        setShowNeedsVerifier(true);
      }
    } else {
      // TODO: Fetch real challenges from backend/blockchain
      setChallenges([]);
    }
  }, [isDemoMode, isVerifierMode]);
  
  const filteredChallenges = challenges.filter(challenge => {
    const matchesFilter = filter === 'all' || challenge.difficulty === filter;
    const matchesSearch = challenge.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          challenge.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesVerifierFilter = !showNeedsVerifier || (isVerifierMode && challenge.needsVerifier && !challenge.verifier);
    return matchesFilter && matchesSearch && (isVerifierMode ? matchesVerifierFilter : true);
  });
  
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'bg-green-500 text-white';
      case 'Medium': return 'bg-yellow-500 text-black';
      case 'Hard': return 'bg-red-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-12">
            <h1 className="text-5xl font-black uppercase mb-4">Open Challenges</h1>
            <p className="font-mono text-sm">
              Browse and submit solutions to earn rewards
            </p>
            <VerifierOnly>
              <div className="mt-4 p-3 bg-purple-700 text-white shadow-box-sm">
                <p className="text-sm font-mono">
                  As a verified solver, you can review and validate submissions
                </p>
              </div>
            </VerifierOnly>
          </div>
          
          <div className="mb-8 flex flex-col sm:flex-row gap-4">
            <input
              type="text"
              placeholder="SEARCH CHALLENGES..."
              className="flex-1 px-4 py-3 border-2 border-black shadow-box-sm font-mono uppercase text-sm focus:outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            
            <div className="flex gap-2">
              {isVerifierMode && (
                <Button
                  variant={showNeedsVerifier ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setShowNeedsVerifier(!showNeedsVerifier)}
                >
                  Needs Verifier
                </Button>
              )}
              <Button
                variant={filter === 'all' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setFilter('all')}
              >
                All
              </Button>
              <Button
                variant={filter === 'Easy' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setFilter('Easy')}
              >
                Easy
              </Button>
              <Button
                variant={filter === 'Medium' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setFilter('Medium')}
              >
                Medium
              </Button>
              <Button
                variant={filter === 'Hard' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setFilter('Hard')}
              >
                Hard
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredChallenges.map((challenge) => (
              <Link key={challenge.id} href={`/challenge/${challenge.id}${isVerifierMode ? '?verifier' : searchParams.has('live') ? '?live' : ''}`}>
                <Card hover className="h-full">
                  <div className="flex justify-between items-start mb-4">
                    <span className={`px-3 py-1 text-xs font-black uppercase shadow-box-sm ${getDifficultyColor(challenge.difficulty)}`}>
                      {challenge.difficulty}
                    </span>
                    <div className="flex gap-2 items-center">
                      {isVerifierMode && challenge.needsVerifier && !challenge.verifier && (
                        <span className="px-2 py-1 text-xs font-bold uppercase bg-purple-100 text-purple-700">Needs Verifier</span>
                      )}
                      <span className="text-xs font-bold uppercase">{challenge.category}</span>
                    </div>
                  </div>
                  
                  <h3 className="font-black text-lg uppercase mb-3">{challenge.title}</h3>
                  <p className="font-mono text-xs mb-4 line-clamp-2">
                    {challenge.description}
                  </p>
                  
                  <div className="flex justify-between items-center pt-4 border-t-2 border-black">
                    <div>
                      <p className="text-purple-700 font-black">{challenge.reward}</p>
                      <p className="text-xs font-mono uppercase">Reward</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black">{challenge.submissions}</p>
                      <p className="text-xs font-mono uppercase">Submissions</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm">
                        {new Date(challenge.deadline).toLocaleDateString()}
                      </p>
                      <p className="text-xs font-mono uppercase">Deadline</p>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
          
          {filteredChallenges.length === 0 && (
            <div className="text-center py-12 border-2 border-black shadow-box-lg bg-white">
              <p className="font-mono mb-6 uppercase">No challenges found matching your criteria.</p>
              <Button variant="primary">
                <Link href={`/create${isVerifierMode ? '?verifier' : searchParams.has('live') ? '?live' : ''}`}>Create a Challenge</Link>
              </Button>
            </div>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
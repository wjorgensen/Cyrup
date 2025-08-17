'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/Button';
import { useDemoMode } from '@/hooks/useDemoMode';

interface LeaderboardEntry {
  rank: number;
  address: string;
  reputationScore: number;
  usdcWon: number;
  challengesSolved: number;
}

const mockLeaderboard: LeaderboardEntry[] = [
  {
    rank: 1,
    address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0fA0B',
    reputationScore: 2847,
    usdcWon: 15250,
    challengesSolved: 42,
  },
  {
    rank: 2,
    address: '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199',
    reputationScore: 2632,
    usdcWon: 8900,
    challengesSolved: 38,
  },
  {
    rank: 3,
    address: '0xdD2FD4581271e230360230F9337D5c0430Bf44C0',
    reputationScore: 2415,
    usdcWon: 22100,
    challengesSolved: 35,
  },
  {
    rank: 4,
    address: '0xbDA5747bFD65F08deb54cb465eB87D40e51B197E',
    reputationScore: 2103,
    usdcWon: 6750,
    challengesSolved: 31,
  },
  {
    rank: 5,
    address: '0x2546BcD3c84621e976D8185a91A922aE77ECEc30',
    reputationScore: 1892,
    usdcWon: 12300,
    challengesSolved: 28,
  },
  {
    rank: 6,
    address: '0xDA9dfA130Df4dE4673b89022EE50ff26f6EA73Cf',
    reputationScore: 1754,
    usdcWon: 5200,
    challengesSolved: 25,
  },
  {
    rank: 7,
    address: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
    reputationScore: 1623,
    usdcWon: 9800,
    challengesSolved: 22,
  },
  {
    rank: 8,
    address: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    reputationScore: 1498,
    usdcWon: 4100,
    challengesSolved: 20,
  },
  {
    rank: 9,
    address: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
    reputationScore: 1342,
    usdcWon: 18500,
    challengesSolved: 18,
  },
  {
    rank: 10,
    address: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9',
    reputationScore: 1205,
    usdcWon: 3200,
    challengesSolved: 15,
  },
];

type SortBy = 'reputation' | 'usdc';

export default function Leaderboard() {
  const [sortBy, setSortBy] = useState<SortBy>('reputation');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const isDemoMode = useDemoMode();
  
  useEffect(() => {
    if (isDemoMode) {
      setLeaderboard(mockLeaderboard);
    } else {
      // TODO: Fetch real leaderboard from backend/blockchain
      setLeaderboard([]);
    }
  }, [isDemoMode]);
  
  const sortedLeaderboard = [...leaderboard].sort((a, b) => {
    if (sortBy === 'reputation') {
      return b.reputationScore - a.reputationScore;
    } else {
      return b.usdcWon - a.usdcWon;
    }
  });
  
  const getRankDisplay = (index: number) => {
    if (sortBy === 'reputation') {
      return index + 1;
    }
    return sortedLeaderboard[index].rank;
  };
  
  const getRankColor = (rank: number) => {
    if (rank === 1) return 'bg-yellow-500 text-black';
    if (rank === 2) return 'bg-gray-400 text-black';
    if (rank === 3) return 'bg-orange-600 text-white';
    return 'bg-white';
  };
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-12">
            <h1 className="text-5xl font-black uppercase mb-4">Leaderboard</h1>
            <p className="font-mono text-sm">
              Top verifiers ranked by reputation and earnings
            </p>
          </div>
          
          <div className="mb-8 flex gap-4">
            <Button
              variant={sortBy === 'reputation' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setSortBy('reputation')}
            >
              Sort by Reputation
            </Button>
            <Button
              variant={sortBy === 'usdc' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setSortBy('usdc')}
            >
              Sort by USDC Won
            </Button>
          </div>
          
          <div className="bg-white shadow-box-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-purple-700 text-white">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider">
                      Rank
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider">
                      Address
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider">
                      Reputation Score
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider">
                      USDC Won
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider">
                      Challenges Solved
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-black">
                  {sortedLeaderboard.map((entry, index) => {
                    const displayRank = getRankDisplay(index);
                    return (
                      <tr key={entry.address} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`inline-flex items-center justify-center w-10 h-10 shadow-box-sm ${getRankColor(displayRank)}`}>
                            <span className="font-black text-sm">{displayRank}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-mono text-sm">
                            {entry.address.slice(0, 6)}...{entry.address.slice(-4)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-black text-lg">{entry.reputationScore.toLocaleString()}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-black text-lg text-green-600">
                            ${entry.usdcWon.toLocaleString()} USDC
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-mono text-sm">{entry.challengesSolved}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 shadow-box hover-lift">
              <h3 className="font-black text-xl mb-3 uppercase">Total Value Locked</h3>
              <p className="font-black text-3xl text-purple-700">
                ${leaderboard.reduce((sum, entry) => sum + entry.usdcWon, 0).toLocaleString()} USDC
              </p>
            </div>
            
            <div className="bg-white p-6 shadow-box hover-lift">
              <h3 className="font-black text-xl mb-3 uppercase">Active Verifiers</h3>
              <p className="font-black text-3xl text-purple-700">
                {leaderboard.length}
              </p>
            </div>
            
            <div className="bg-white p-6 shadow-box hover-lift">
              <h3 className="font-black text-xl mb-3 uppercase">Challenges Solved</h3>
              <p className="font-black text-3xl text-purple-700">
                {leaderboard.reduce((sum, entry) => sum + entry.challengesSolved, 0)}
              </p>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
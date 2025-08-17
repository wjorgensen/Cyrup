'use client';

import Link from 'next/link';
import { Button } from '../ui/Button';
import { useState } from 'react';
import { WalletConnect } from '../WalletConnect';
import { ChainIndicator } from '../ChainIndicator';
import { ModeSwitcher } from '../ModeSwitcher';
import { useSearchParams } from 'next/navigation';
import { useDemoMode } from '@/hooks/useDemoMode';
import { useVerifierMode } from '@/hooks/useVerifierMode';

export const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const searchParams = useSearchParams();
  const isDemoMode = useDemoMode();
  const isVerifierMode = useVerifierMode();
  const queryParams = isVerifierMode ? '?verifier' : searchParams.has('live') ? '?live' : '';
  
  return (
    <header className="border-b-4 border-black bg-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <Link href={`/${queryParams}`} className="font-black text-3xl uppercase tracking-wider">
            Cyrup {isVerifierMode && <span className="text-purple-700 text-lg">(Verifier)</span>}
          </Link>
          
          <nav className="hidden md:flex space-x-8">
            <Link href={`/dashboard${queryParams}`} className="text-black font-bold uppercase text-sm hover:text-purple-700 transition-colors">
              Challenges
            </Link>
            {isVerifierMode && (
              <Link href={`/verifier-dashboard${queryParams}`} className="text-black font-bold uppercase text-sm hover:text-purple-700 transition-colors">
                Verifier's Challenges
              </Link>
            )}
            <Link href={`/leaderboard${queryParams}`} className="text-black font-bold uppercase text-sm hover:text-purple-700 transition-colors">
              Leaderboard
            </Link>
            <Link href={`/create${queryParams}`} className="text-black font-bold uppercase text-sm hover:text-purple-700 transition-colors">
              Create
            </Link>
          </nav>
          
          <div className="hidden md:flex items-center space-x-4">
            <ModeSwitcher />
            <WalletConnect />
          </div>
          
          <button
            className="md:hidden p-2 border-2 border-black shadow-box-sm"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
        
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t-4 border-black">
            <nav className="flex flex-col space-y-4">
              <Link href={`/dashboard${queryParams}`} className="text-black font-bold uppercase hover:text-purple-700 transition-colors">
                Challenges
              </Link>
              {isVerifierMode && (
                <Link href={`/verifier-dashboard${queryParams}`} className="text-black font-bold uppercase hover:text-purple-700 transition-colors">
                  Verifier's Challenges
                </Link>
              )}
              <Link href={`/leaderboard${queryParams}`} className="text-black font-bold uppercase hover:text-purple-700 transition-colors">
                Leaderboard
              </Link>
              <Link href={`/create${queryParams}`} className="text-black font-bold uppercase hover:text-purple-700 transition-colors">
                Create
              </Link>
              <div className="pt-2 space-y-2">
                <ModeSwitcher />
                <WalletConnect />
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};
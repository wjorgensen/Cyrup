'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export const Footer = () => {
  const searchParams = useSearchParams();
  const isDemoMode = searchParams.has('demo');
  const demoQuery = isDemoMode ? '?demo' : '';
  
  return (
    <footer className="bg-black text-white border-t-4 border-black mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="font-black text-2xl mb-4 uppercase">Cyrup</h3>
            <p className="text-sm">
              The decentralized marketplace for Lean formal verification proofs.
            </p>
          </div>
          
          <div>
            <h4 className="font-bold mb-4 uppercase tracking-wider">Platform</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href={`/dashboard${demoQuery}`} className="hover:text-purple-400 transition-colors uppercase">
                  Browse Challenges
                </Link>
              </li>
              <li>
                <Link href={`/create${demoQuery}`} className="hover:text-purple-400 transition-colors uppercase">
                  Create Challenge
                </Link>
              </li>
              <li>
                <Link href={`/leaderboard${demoQuery}`} className="hover:text-purple-400 transition-colors uppercase">
                  Leaderboard
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-bold mb-4 uppercase tracking-wider">Resources</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#" className="hover:text-purple-400 transition-colors uppercase">
                  Documentation
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-purple-400 transition-colors uppercase">
                  Lean Tutorial
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-purple-400 transition-colors uppercase">
                  API
                </a>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-bold mb-4 uppercase tracking-wider">Community</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#" className="hover:text-purple-400 transition-colors uppercase">
                  Discord
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-purple-400 transition-colors uppercase">
                  Twitter
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-purple-400 transition-colors uppercase">
                  GitHub
                </a>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="mt-8 pt-8 border-t border-white/20 text-center text-sm">
          © 2024 Cyrup. All rights reserved.
        </div>
      </div>
    </footer>
  );
};
'use client';

import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useDemoMode } from '@/hooks/useDemoMode';
import { useVerifierMode } from '@/hooks/useVerifierMode';

export function ModeSwitcher() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const isDemoMode = useDemoMode();
  const isVerifierMode = useVerifierMode();
  const [isOpen, setIsOpen] = useState(false);
  
  const currentMode = isVerifierMode ? 'Verifier' : searchParams.has('live') ? 'Live' : 'Demo';
  
  const handleModeChange = (mode: 'demo' | 'verifier' | 'live') => {
    const params = new URLSearchParams(searchParams.toString());
    
    // Clear all mode params
    params.delete('demo');
    params.delete('verifier');
    params.delete('live');
    
    // Set the new mode
    if (mode === 'verifier') {
      params.set('verifier', 'true');
    } else if (mode === 'live') {
      params.set('live', 'true');
    }
    // demo is default, so no param needed
    
    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.push(newUrl);
    setIsOpen(false);
  };
  
  return (
    <div className="relative">
      {/* Mode Indicator */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-white border-2 border-black shadow-box-sm hover:shadow-box-lg transition-all font-mono text-xs uppercase"
      >
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${
            currentMode === 'Live' ? 'bg-green-500' : 
            currentMode === 'Verifier' ? 'bg-purple-500' : 
            'bg-yellow-500'
          }`} />
          <span className="font-bold">{currentMode} Mode</span>
        </div>
        <svg 
          className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {/* Dropdown Menu */}
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-48 bg-white border-2 border-black shadow-box-lg z-50">
            <button
              onClick={() => handleModeChange('demo')}
              className={`w-full px-4 py-2 text-left font-mono text-xs uppercase hover:bg-gray-100 flex items-center gap-2 ${
                currentMode === 'Demo' ? 'bg-yellow-50' : ''
              }`}
            >
              <div className="w-2 h-2 rounded-full bg-yellow-500" />
              <div>
                <div className="font-bold">Demo Mode</div>
                <div className="text-xs normal-case opacity-60">Try features</div>
              </div>
            </button>
            
            <button
              onClick={() => handleModeChange('verifier')}
              className={`w-full px-4 py-2 text-left font-mono text-xs uppercase hover:bg-gray-100 flex items-center gap-2 border-t border-gray-200 ${
                currentMode === 'Verifier' ? 'bg-purple-50' : ''
              }`}
            >
              <div className="w-2 h-2 rounded-full bg-purple-500" />
              <div>
                <div className="font-bold">Verifier Mode</div>
                <div className="text-xs normal-case opacity-60">Review proofs</div>
              </div>
            </button>
            
            <button
              onClick={() => handleModeChange('live')}
              className={`w-full px-4 py-2 text-left font-mono text-xs uppercase hover:bg-gray-100 flex items-center gap-2 border-t border-gray-200 ${
                currentMode === 'Live' ? 'bg-green-50' : ''
              }`}
            >
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <div>
                <div className="font-bold">Live Mode</div>
                <div className="text-xs normal-case opacity-60">Real contracts</div>
              </div>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
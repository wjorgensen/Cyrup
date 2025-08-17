'use client';

import { useSearchParams } from 'next/navigation';
import { useMemo } from 'react';

export function useDemoMode() {
  const searchParams = useSearchParams();
  
  const isDemoMode = useMemo(() => {
    // Default to demo mode unless explicitly set to live mode
    return !searchParams.has('live');
  }, [searchParams]);
  
  return isDemoMode;
}
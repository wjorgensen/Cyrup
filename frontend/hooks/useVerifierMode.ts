'use client';

import { useSearchParams } from 'next/navigation';
import { useMemo } from 'react';

export function useVerifierMode() {
  const searchParams = useSearchParams();
  
  const isVerifierMode = useMemo(() => {
    return searchParams.has('verifier');
  }, [searchParams]);
  
  return isVerifierMode;
}
'use client';

import { ReactNode } from 'react';

interface VerifierOnlyProps {
  children: ReactNode;
}

export function VerifierOnly({ children }: VerifierOnlyProps) {
  const isVerifier = false;
  
  if (!isVerifier) {
    return null;
  }
  
  return <>{children}</>;
}
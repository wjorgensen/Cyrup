"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ReputationContextType {
  reputation: number;
  updateReputation: (amount: number) => void;
}

const ReputationContext = createContext<ReputationContextType | undefined>(undefined);

export function ReputationProvider({ children }: { children: ReactNode }) {
  const [reputation, setReputation] = useState(0);

  const updateReputation = (amount: number) => {
    setReputation(prev => prev + amount);
  };

  return (
    <ReputationContext.Provider value={{ reputation, updateReputation }}>
      {children}
    </ReputationContext.Provider>
  );
}

export function useReputation() {
  const context = useContext(ReputationContext);
  if (context === undefined) {
    throw new Error('useReputation must be used within a ReputationProvider');
  }
  return context;
}
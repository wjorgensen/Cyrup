'use client';

import { CDPReactProvider } from '@coinbase/cdp-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { wagmiConfig } from '@/lib/wagmi';
import { useState } from 'react';

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <CDPReactProvider 
      config={{ projectId: process.env.NEXT_PUBLIC_CDP_PROJECT_ID! }}
      app={{
        name: 'Cyrup',
        showCoinbaseFooter: false,
        authMethods: ['email']
      }}
    >
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </WagmiProvider>
    </CDPReactProvider>
  );
}
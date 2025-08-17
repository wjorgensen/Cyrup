'use client';

import { AuthButton } from '@coinbase/cdp-react';
import { useAccount, useDisconnect, useEnsAvatar, useEnsName } from 'wagmi';
import { useState, useEffect, useRef } from 'react';
import { Button } from './ui/Button';
import Link from 'next/link';

export function WalletConnect() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { data: ensName } = useEnsName({ address });
  const { data: ensAvatar } = useEnsAvatar({ name: ensName ?? undefined });
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Apply styles to the Coinbase button after it renders
  useEffect(() => {
    if (buttonRef.current && !isConnected) {
      const applyStyles = (button: HTMLButtonElement) => {
        // Apply neobrutalist styles
        button.style.backgroundColor = '#7E22CE';
        button.style.color = 'white';
        button.style.border = '2px solid #000000';
        button.style.boxShadow = '4px 4px 0px #000000';
        button.style.padding = '0.375rem 0.75rem';
        button.style.fontSize = '0.75rem';
        button.style.fontWeight = 'bold';
        button.style.textTransform = 'uppercase';
        button.style.letterSpacing = '0.05em';
        button.style.transition = 'all 0.2s ease';
        button.style.cursor = 'pointer';
        button.style.borderRadius = '0';
        
        // Add hover effect
        button.onmouseenter = () => {
          button.style.transform = 'translate(-2px, -2px)';
          button.style.boxShadow = '6px 6px 0px #000000';
          button.style.backgroundColor = '#6B21A8';
        };
        
        button.onmouseleave = () => {
          button.style.transform = 'translate(0, 0)';
          button.style.boxShadow = '4px 4px 0px #000000';
          button.style.backgroundColor = '#7E22CE';
        };
      };

      // Try to apply styles immediately
      const button = buttonRef.current.querySelector('button');
      if (button) {
        applyStyles(button as HTMLButtonElement);
      }

      // Use MutationObserver to detect when button is added/changed
      const observer = new MutationObserver((mutations) => {
        mutations.forEach(() => {
          const button = buttonRef.current?.querySelector('button');
          if (button && !button.style.border) {
            applyStyles(button as HTMLButtonElement);
          }
        });
      });

      observer.observe(buttonRef.current, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style']
      });

      // Cleanup
      return () => {
        observer.disconnect();
      };
    }
  }, [mounted, isConnected]);

  if (!mounted) return null;

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-2">
        <Link href="/profile">
          <Button
            variant="primary"
            size="sm"
          >
            Profile
          </Button>
        </Link>
        <Button
          onClick={() => disconnect()}
          variant="ghost"
          size="sm"
        >
          Disconnect
        </Button>
      </div>
    );
  }

  return (
    <div ref={buttonRef}>
      <AuthButton />
    </div>
  );
}
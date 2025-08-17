import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "../styles/coinbase-button.css";
import { ReputationProvider } from "@/contexts/ReputationContext";
import { Web3Provider } from "@/contexts/Web3Provider";
import { ChainSwitcher } from "@/components/ChainSwitcher";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Cyrup - Lean Proof Marketplace",
  description: "A decentralized marketplace for Lean formal verification proofs",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Web3Provider>
          <ReputationProvider>
            <ChainSwitcher />
            {children}
          </ReputationProvider>
        </Web3Provider>
      </body>
    </html>
  );
}
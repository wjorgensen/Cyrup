// Contract addresses deployed to Base Sepolia
// Deployment Date: 2025-08-17

export const BASE_SEPOLIA_CHAIN_ID = 84532;
export const BASE_SEPOLIA_RPC_URL = "https://base-sepolia-rpc.publicnode.com";

export const DEPLOYED_CONTRACTS = {
  baseSepolia: {
    ChallengeFactory: "0xb301186922D32B9AF3d5a8078090E2184c41C246",
    ReputationSystem: "0xF3C4B26F6E92d2358dC66b99Fd6cC3471b531071",
  },
} as const;

// For use with ethers.js or viem
export const CONTRACT_ADDRESSES = {
  ChallengeFactory: "0xb301186922D32B9AF3d5a8078090E2184c41C246",
  ReputationSystem: "0xF3C4B26F6E92d2358dC66b99Fd6cC3471b531071",
} as const;

// Network configuration
export const NETWORK_CONFIG = {
  chainId: BASE_SEPOLIA_CHAIN_ID,
  chainName: "Base Sepolia",
  rpcUrls: [BASE_SEPOLIA_RPC_URL],
  blockExplorers: ["https://sepolia.basescan.org"],
  nativeCurrency: {
    name: "Ethereum",
    symbol: "ETH",
    decimals: 18,
  },
} as const;

// Deployer information
export const DEPLOYER_ADDRESS = "0x8088082CecB10838380643fd044d2dbae58D5c4f";
// Contract addresses from deployed-addresses.json
import deployedAddresses from '../../contracts/deployed-addresses.json';

// Base Sepolia configuration
export const CHAIN_ID = 84532; // Base Sepolia chain ID
export const RPC_URL = deployedAddresses.baseSepolia.rpcUrl;
export const BLOCK_EXPLORER = deployedAddresses.baseSepolia.blockExplorer;

// Contract addresses
export const CONTRACT_ADDRESSES = {
  ChallengeFactory: deployedAddresses.baseSepolia.contracts.ChallengeFactory.address as `0x${string}`,
  ReputationSystem: deployedAddresses.baseSepolia.contracts.ReputationSystem.address as `0x${string}`,
} as const;

// Export individual addresses for convenience
export const CHALLENGE_FACTORY_ADDRESS = CONTRACT_ADDRESSES.ChallengeFactory;
export const REPUTATION_SYSTEM_ADDRESS = CONTRACT_ADDRESSES.ReputationSystem;

// Base Sepolia USDC address (if needed for approvals)
export const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as `0x${string}`; // Base Sepolia USDC

// Export deployment info
export const DEPLOYMENT_INFO = {
  date: deployedAddresses.baseSepolia.deploymentDate,
  deployer: deployedAddresses.baseSepolia.contracts.ChallengeFactory.deployer,
  notes: deployedAddresses.baseSepolia.notes,
} as const;
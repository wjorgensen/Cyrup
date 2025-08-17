# Cyrup Protocol - Contract Deployment Information

## Base Sepolia Testnet Deployment

### Deployment Date
- **Date**: 2025-08-17
- **Network**: Base Sepolia (Chain ID: 84532)
- **RPC URL**: https://base-sepolia-rpc.publicnode.com

### Deployed Contract Addresses

| Contract | Address | Explorer Link |
|----------|---------|---------------|
| **ChallengeFactory** | `0xb301186922D32B9AF3d5a8078090E2184c41C246` | [View on BaseScan](https://sepolia.basescan.org/address/0xb301186922D32B9AF3d5a8078090E2184c41C246) |
| **ReputationSystem** | `0xF3C4B26F6E92d2358dC66b99Fd6cC3471b531071` | [View on BaseScan](https://sepolia.basescan.org/address/0xF3C4B26F6E92d2358dC66b99Fd6cC3471b531071) |

### Deployer Information
- **Address**: `0x8088082CecB10838380643fd044d2dbae58D5c4f`
- **Private Key**: `56d9b0a2cc2964675b841dbc930d82c806c3e0838af972658268eb60155445c1` *(Test key - DO NOT use in production)*

### Key Features in This Deployment
- ✅ **UID Support**: Submissions now include a UID field for linking to PostgreSQL-stored Lean code
- ✅ **Gas Optimized**: Maintains efficient storage packing and custom errors
- ✅ **Reputation System**: Integrated reputation tracking for solvers and verifiers
- ✅ **Clone Factory Pattern**: Efficient deployment of challenge escrow contracts

### Frontend Integration

#### Using the Addresses in Your Frontend

1. **Direct Import (TypeScript/JavaScript)**:
```typescript
import { CONTRACT_ADDRESSES, NETWORK_CONFIG } from '../contracts/deployed-addresses.ts';

// Use in your app
const factoryAddress = CONTRACT_ADDRESSES.ChallengeFactory;
const reputationAddress = CONTRACT_ADDRESSES.ReputationSystem;
```

2. **JSON Import**:
```javascript
import deployedAddresses from '../contracts/deployed-addresses.json';

const factoryAddress = deployedAddresses.baseSepolia.contracts.ChallengeFactory.address;
```

3. **Environment Variables** (add to your `.env` file):
```env
NEXT_PUBLIC_CHALLENGE_FACTORY_ADDRESS=0xb301186922D32B9AF3d5a8078090E2184c41C246
NEXT_PUBLIC_REPUTATION_SYSTEM_ADDRESS=0xF3C4B26F6E92d2358dC66b99Fd6cC3471b531071
NEXT_PUBLIC_BASE_SEPOLIA_RPC=https://base-sepolia-rpc.publicnode.com
```

### Contract Interaction Examples

#### Creating a Challenge with UID Support
When submitting a solution through the ChallengeEscrow contract, you'll now need to provide a UID:

```javascript
// Example: Submitting a solution with UID
const uid = "postgres_lean_code_" + Date.now(); // Your PostgreSQL reference ID
const solutionHash = "QmXxx..."; // IPFS hash of solution

await challengeEscrow.submitSolution(
  challengeId,
  solutionHash,
  uid // New parameter linking to PostgreSQL
);
```

### Testing the Deployment

You can interact with the contracts using:
1. **Etherscan/BaseScan** - Direct contract interaction through the block explorer
2. **Foundry Cast** - Command-line interaction
3. **Your Frontend Application** - Using the addresses provided above

### Important Notes
- These contracts are deployed on **Base Sepolia testnet**
- The provided private key is for testing only - never use it for mainnet
- Make sure your wallet is connected to Base Sepolia (Chain ID: 84532)
- You'll need Base Sepolia ETH for gas fees (available from faucets)

### Next Steps
1. Update your frontend to use these contract addresses
2. Configure your PostgreSQL database to store Lean code with matching UIDs
3. Test the full flow: Challenge creation → Solution submission with UID → Verification → Reward distribution
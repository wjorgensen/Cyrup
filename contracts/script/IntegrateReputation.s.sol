// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @title Integration example for ReputationSystem with ChallengeEscrow
/// @author Cyrup Protocol
/// @notice Shows how to modify ChallengeEscrow to integrate reputation tracking
/// @dev Example modifications for the ChallengeEscrow contract

/*
Integration Instructions for ChallengeEscrow.sol:

1. Add state variable for ReputationSystem:
   ```solidity
   ReputationSystem public immutable reputationSystem;
   ```

2. Update constructor to accept ReputationSystem address:
   ```solidity
   constructor(address _reputationSystem) {
       reputationSystem = ReputationSystem(_reputationSystem);
   }
   ```

3. In the awardSolution function, after distributing rewards, add:
   ```solidity
   // Update reputation for winner
   reputationSystem.updateReputation(
       submission.solver,
       winnerReward,
       false // not a verifier
   );
   
   // Update reputation for verifier
   reputationSystem.updateReputation(
       challenge.verifier,
       verifierReward,
       true // is a verifier
   );
   ```

4. In selectVerifier function, add verification check:
   ```solidity
   // Optional: Only allow qualified verifiers
   require(
       reputationSystem.isQualifiedVerifier(verifier),
       "Not qualified verifier"
   );
   ```

Example modified awardSolution function:
*/

abstract contract ChallengeEscrowIntegration {
    // Simplified interface for demonstration
    struct Challenge {
        address verifier;
        uint96 reward;
        address token;
    }
    
    struct Submission {
        address solver;
    }
    
    mapping(uint256 => Challenge) public challenges;
    mapping(uint256 => mapping(uint256 => Submission)) public submissions;
    
    // Add reputation system
    IReputationSystem public immutable reputationSystem;
    
    constructor(address _reputationSystem) {
        reputationSystem = IReputationSystem(_reputationSystem);
    }
    
    /// @notice Modified awardSolution with reputation tracking
    /// @dev Integrates reputation updates after reward distribution
    function awardSolutionWithReputation(
        uint256 challengeId,
        uint256 submissionId
    ) external {
        Challenge memory challenge = challenges[challengeId];
        Submission memory submission = submissions[challengeId][submissionId];
        
        // Calculate rewards (simplified)
        uint256 totalReward = challenge.reward;
        uint256 verifierReward = (totalReward * 500) / 10000; // 5%
        uint256 winnerReward = totalReward - verifierReward;
        
        // ... existing reward distribution logic ...
        
        // NEW: Update reputation for both parties
        reputationSystem.updateReputation(
            submission.solver,
            winnerReward,
            false // winner, not verifier
        );
        
        reputationSystem.updateReputation(
            challenge.verifier,
            verifierReward,
            true // verifier
        );
    }
    
    /// @notice Modified selectVerifier with qualification check
    /// @dev Only allows top 10% users to be verifiers
    function selectQualifiedVerifier(
        uint256 challengeId,
        address verifier
    ) external {
        // NEW: Check verifier qualification
        require(
            reputationSystem.isQualifiedVerifier(verifier),
            "Verifier not in top 10%"
        );
        
        // ... existing verifier selection logic ...
        challenges[challengeId].verifier = verifier;
    }
}

/// @notice Interface for ReputationSystem
interface IReputationSystem {
    function updateReputation(
        address user,
        uint256 usdcAmount,
        bool isVerifier
    ) external;
    
    function isQualifiedVerifier(address user) external view returns (bool);
    
    function getUserReputation(address user) external view returns (
        uint256 totalPoints,
        uint256 challengeCount,
        uint256 winnerCount,
        uint256 verifierCount,
        uint256 verifierPoints,
        uint256 lastUpdate
    );
}

/*
Deployment Order:
1. Deploy ReputationSystem with placeholder escrow address
2. Deploy ChallengeEscrow with ReputationSystem address
3. Update ReputationSystem if needed (only if using upgradeable pattern)

Gas Optimization Notes:
- The reputation update adds ~70k gas to award transactions
- Batch updates can be used for historical data migration
- Top performer tracking is limited to 100 users for gas efficiency
- Threshold updates are throttled to every 10 users

Security Considerations:
- Only ChallengeEscrow can update reputation (prevents manipulation)
- Points calculation is deterministic and transparent
- No external calls in reputation logic (reentrancy safe)
- Immutable tier configuration prevents gaming
*/
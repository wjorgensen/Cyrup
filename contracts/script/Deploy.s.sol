// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {ReputationSystem} from "../src/ReputationSystem.sol";
import {ChallengeFactory} from "../src/ChallengeFactory.sol";
import {ChallengeEscrow} from "../src/ChallengeEscrow.sol";

/// @title Deploy Script for Cyrup Protocol
/// @notice Deploys ReputationSystem and ChallengeFactory contracts
/// @dev Run with: forge script script/Deploy.s.sol --rpc-url <RPC_URL> --broadcast
contract Deploy is Script {
    // Deployment configuration
    address public constant USDC_ADDRESS = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48; // Mainnet USDC
    
    // For testnet deployments, use these addresses:
    // Sepolia USDC: 0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8
    // Base Sepolia USDC: 0x036CbD53842c5426634e7929541eC2318f3dCF7e
    // Polygon Mumbai USDC: 0x9999f7Fea5938fD3b1E26A12c3f2fb024e194f97

    function run() external returns (
        address reputationSystem,
        address challengeFactory,
        address implementationAddress
    ) {
        // Get deployer private key from environment
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console2.log("Deploying contracts with deployer:", deployer);
        console2.log("Deployer balance:", deployer.balance);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Step 1: Deploy ChallengeFactory first (without reputation system)
        console2.log("\n=== Deploying ChallengeFactory ===");
        ChallengeFactory factory = new ChallengeFactory();
        challengeFactory = address(factory);
        console2.log("ChallengeFactory deployed at:", challengeFactory);
        console2.log("Factory implementation:", factory.challengeImplementation());
        implementationAddress = factory.challengeImplementation();
        
        // Step 2: Deploy ReputationSystem with factory address
        console2.log("\n=== Deploying ReputationSystem ===");
        ReputationSystem reputation = new ReputationSystem(challengeFactory);
        reputationSystem = address(reputation);
        console2.log("ReputationSystem deployed at:", reputationSystem);
        
        // Step 3: Set ReputationSystem in ChallengeFactory
        console2.log("\n=== Setting ReputationSystem in Factory ===");
        factory.setReputationSystem(reputationSystem);
        console2.log("ReputationSystem set in factory");
        
        vm.stopBroadcast();
        
        // Log deployment summary
        console2.log("\n========================================");
        console2.log("Deployment Complete!");
        console2.log("========================================");
        console2.log("ReputationSystem:", reputationSystem);
        console2.log("ChallengeFactory:", challengeFactory);
        console2.log("ChallengeEscrow Implementation:", implementationAddress);
        console2.log("========================================");
        
        // Log next steps
        console2.log("\nNext Steps:");
        console2.log("1. Verify contracts on Etherscan:");
        console2.log("   forge verify-contract <address> <contract_name> --chain <chain>");
        console2.log("2. Transfer ownership if needed");
        console2.log("3. Create first challenge via factory.createChallenge()");
        
        return (reputationSystem, challengeFactory, implementationAddress);
    }
    
    /// @notice Deploy to local anvil for testing
    /// @dev Run with: forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --broadcast
    function deployLocal() external returns (
        address reputationSystem,
        address challengeFactory,
        address implementationAddress
    ) {
        // For local testing, use the default anvil account
        uint256 deployerPrivateKey = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
        address deployer = vm.addr(deployerPrivateKey);
        
        console2.log("Deploying to local anvil with deployer:", deployer);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy factory first (without reputation system)
        ChallengeFactory factory = new ChallengeFactory();
        challengeFactory = address(factory);
        console2.log("Factory:", challengeFactory);
        
        // Get implementation address from factory
        implementationAddress = factory.challengeImplementation();
        console2.log("Implementation:", implementationAddress);
        
        // Deploy reputation system with factory address
        ReputationSystem reputation = new ReputationSystem(challengeFactory);
        reputationSystem = address(reputation);
        console2.log("ReputationSystem:", reputationSystem);
        
        // Set reputation system in factory
        factory.setReputationSystem(reputationSystem);
        console2.log("ReputationSystem set in factory");
        
        vm.stopBroadcast();
        
        return (reputationSystem, challengeFactory, implementationAddress);
    }
}
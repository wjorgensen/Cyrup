// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {ReputationSystem} from "../src/ReputationSystem.sol";
import {ChallengeFactory} from "../src/ChallengeFactory.sol";
import {ChallengeEscrow} from "../src/ChallengeEscrow.sol";
import {IERC20} from "lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

/// @title Advanced Deployment Script with Verification
/// @notice Deploys and verifies the Cyrup Protocol contracts
/// @dev Includes network detection, verification, and post-deployment setup
contract DeployWithVerification is Script {
    // Network configurations
    struct NetworkConfig {
        address usdcAddress;
        string name;
        uint256 chainId;
    }
    
    mapping(uint256 => NetworkConfig) public networkConfigs;
    
    // Deployed contract addresses
    address public reputationSystem;
    address public challengeFactory;
    address public challengeImplementation;
    
    constructor() {
        // Mainnet
        networkConfigs[1] = NetworkConfig({
            usdcAddress: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48,
            name: "Ethereum Mainnet",
            chainId: 1
        });
        
        // Sepolia
        networkConfigs[11155111] = NetworkConfig({
            usdcAddress: 0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8,
            name: "Sepolia Testnet",
            chainId: 11155111
        });
        
        // Base
        networkConfigs[8453] = NetworkConfig({
            usdcAddress: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913,
            name: "Base Mainnet",
            chainId: 8453
        });
        
        // Base Sepolia
        networkConfigs[84532] = NetworkConfig({
            usdcAddress: 0x036CbD53842c5426634e7929541eC2318f3dCF7e,
            name: "Base Sepolia",
            chainId: 84532
        });
        
        // Polygon
        networkConfigs[137] = NetworkConfig({
            usdcAddress: 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174,
            name: "Polygon Mainnet",
            chainId: 137
        });
        
        // Arbitrum
        networkConfigs[42161] = NetworkConfig({
            usdcAddress: 0xaf88d065e77c8cC2239327C5EDb3A432268e5831,
            name: "Arbitrum One",
            chainId: 42161
        });
    }
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        uint256 chainId = block.chainid;
        
        NetworkConfig memory config = networkConfigs[chainId];
        
        console2.log("\n========================================");
        console2.log("Cyrup Protocol Deployment");
        console2.log("========================================");
        console2.log("Network:", config.name);
        console2.log("Chain ID:", chainId);
        console2.log("Deployer:", deployer);
        console2.log("Balance:", deployer.balance / 1e18, "ETH");
        console2.log("USDC Address:", config.usdcAddress);
        console2.log("========================================\n");
        
        // Check if we have a configured USDC address
        if (config.usdcAddress == address(0)) {
            console2.log("Warning: No USDC address configured for this network");
            console2.log("Using placeholder address: 0x0000000000000000000000000000000000000001");
            config.usdcAddress = address(1);
        }
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy contracts
        _deployContracts();
        
        // Verify deployment
        _verifyDeployment();
        
        // Optional: Create sample challenge
        if (vm.envOr("CREATE_SAMPLE", false)) {
            _createSampleChallenge(config.usdcAddress);
        }
        
        vm.stopBroadcast();
        
        // Print deployment summary
        _printSummary();
        
        // Generate verification commands
        _generateVerificationCommands(chainId);
        
        // Save deployment info
        _saveDeploymentInfo(chainId);
    }
    
    function _deployContracts() internal {
        console2.log("\nDeploying ChallengeFactory...");
        challengeFactory = address(new ChallengeFactory());
        console2.log("   Factory:", challengeFactory);
        
        // Get the implementation address from the factory
        challengeImplementation = ChallengeFactory(challengeFactory).challengeImplementation();
        console2.log("   Implementation:", challengeImplementation);
        
        console2.log("\nDeploying ReputationSystem...");
        reputationSystem = address(new ReputationSystem(challengeFactory));
        console2.log("   ReputationSystem:", reputationSystem);
        
        console2.log("\nSetting ReputationSystem in Factory...");
        ChallengeFactory(challengeFactory).setReputationSystem(reputationSystem);
        console2.log("   Factory initialized");
    }
    
    function _verifyDeployment() internal view {
        console2.log("\nVerifying Deployment...");
        
        // Verify factory has correct implementation
        require(
            ChallengeFactory(challengeFactory).challengeImplementation() == challengeImplementation,
            "Factory implementation mismatch"
        );
        console2.log("   Factory implementation correct");
        
        // Verify factory has reputation system
        require(
            ChallengeFactory(challengeFactory).reputationSystem() == reputationSystem,
            "Factory reputation system not set"
        );
        console2.log("   Factory reputation system set");
        
        // Verify reputation system has correct factory
        require(
            ReputationSystem(reputationSystem).challengeFactory() == challengeFactory,
            "ReputationSystem factory mismatch"
        );
        console2.log("   ReputationSystem authorized address correct");
        
        console2.log("   All verifications passed!");
    }
    
    function _createSampleChallenge(address usdcAddress) internal {
        console2.log("\nCreating Sample Challenge...");
        
        // Deploy a sample challenge using nonce-based deployment
        address challenge = ChallengeFactory(challengeFactory).deployChallenge(1);
        
        // Note: The actual challenge initialization (setting rewards, deadlines, etc.)
        // would be done by calling functions on the deployed ChallengeEscrow contract
        
        console2.log("   Sample challenge deployed!");
        console2.log("   Challenge Address:", challenge);
    }
    
    function _printSummary() internal view {
        console2.log("\n========================================");
        console2.log("Deployment Complete!");
        console2.log("========================================");
        console2.log("ReputationSystem:", reputationSystem);
        console2.log("ChallengeFactory:", challengeFactory);
        console2.log("Implementation:", challengeImplementation);
        console2.log("========================================");
    }
    
    function _generateVerificationCommands(uint256 chainId) internal view {
        console2.log("\nEtherscan Verification Commands:");
        console2.log("========================================");
        
        string memory chainName = _getChainName(chainId);
        
        // ReputationSystem verification
        console2.log(
            string.concat(
                "forge verify-contract ",
                vm.toString(reputationSystem),
                " ReputationSystem --constructor-args ",
                vm.toString(abi.encode(challengeFactory)),
                " --chain ",
                chainName
            )
        );
        
        // ChallengeFactory verification
        console2.log(
            string.concat(
                "forge verify-contract ",
                vm.toString(challengeFactory),
                " ChallengeFactory --constructor-args ",
                vm.toString(abi.encode(challengeImplementation)),
                " --chain ",
                chainName
            )
        );
        
        // Implementation verification
        console2.log(
            string.concat(
                "forge verify-contract ",
                vm.toString(challengeImplementation),
                " ChallengeEscrow --chain ",
                chainName
            )
        );
    }
    
    function _saveDeploymentInfo(uint256 chainId) internal {
        string memory json = "deployment";
        vm.serializeAddress(json, "reputationSystem", reputationSystem);
        vm.serializeAddress(json, "challengeFactory", challengeFactory);
        vm.serializeAddress(json, "implementation", challengeImplementation);
        vm.serializeUint(json, "chainId", chainId);
        string memory timestamp = vm.toString(block.timestamp);
        string memory output = vm.serializeString(json, "timestamp", timestamp);
        
        string memory filename = string.concat(
            "deployments/",
            vm.toString(chainId),
            "-",
            timestamp,
            ".json"
        );
        
        vm.writeJson(output, filename);
        console2.log("\nDeployment info saved to:", filename);
    }
    
    function _getChainName(uint256 chainId) internal pure returns (string memory) {
        if (chainId == 1) return "mainnet";
        if (chainId == 11155111) return "sepolia";
        if (chainId == 8453) return "base";
        if (chainId == 84532) return "base-sepolia";
        if (chainId == 137) return "polygon";
        if (chainId == 42161) return "arbitrum";
        return vm.toString(chainId);
    }
}
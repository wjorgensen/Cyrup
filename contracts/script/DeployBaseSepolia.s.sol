// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console} from "forge-std/Script.sol";
import {ChallengeFactory} from "../src/ChallengeFactory.sol";
import {ReputationSystem} from "../src/ReputationSystem.sol";

contract DeployBaseSepolia is Script {
    function run() external {
        // Get deployer private key from environment
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        // Start broadcasting transactions
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("Deploying contracts to Base Sepolia...");
        console.log("Deployer address:", vm.addr(deployerPrivateKey));
        
        // Deploy ReputationSystem
        ReputationSystem reputation = new ReputationSystem();
        console.log("ReputationSystem deployed at:", address(reputation));
        
        // Deploy ChallengeFactory with ReputationSystem address
        ChallengeFactory factory = new ChallengeFactory(address(reputation));
        console.log("ChallengeFactory deployed at:", address(factory));
        
        // Authorize the factory in the reputation system
        reputation.authorizeFactory(address(factory));
        console.log("Factory authorized in ReputationSystem");
        
        vm.stopBroadcast();
        
        // Log deployment summary
        console.log("\n=== DEPLOYMENT SUMMARY ===");
        console.log("Network: Base Sepolia");
        console.log("ReputationSystem:", address(reputation));
        console.log("ChallengeFactory:", address(factory));
        console.log("========================\n");
    }
}
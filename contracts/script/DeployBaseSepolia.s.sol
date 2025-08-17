// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console} from "forge-std/Script.sol";
import {ChallengeFactory} from "../src/ChallengeFactory.sol";
import {ReputationSystem} from "../src/ReputationSystem.sol";

contract DeployBaseSepolia is Script {
    function run() external {
        // Start broadcasting transactions (forge will use the private key from command line)
        vm.startBroadcast();
        
        console.log("Deploying contracts to Base Sepolia...");
        console.log("Deployer address:", msg.sender);
        
        // Deploy ChallengeFactory first (it has no constructor parameters)
        ChallengeFactory factory = new ChallengeFactory();
        console.log("ChallengeFactory deployed at:", address(factory));
        
        // Deploy ReputationSystem with the ChallengeFactory address
        ReputationSystem reputation = new ReputationSystem(address(factory));
        console.log("ReputationSystem deployed at:", address(reputation));
        
        // Set the reputation system in the factory
        factory.setReputationSystem(address(reputation));
        console.log("ReputationSystem set in ChallengeFactory");
        
        vm.stopBroadcast();
        
        // Log deployment summary
        console.log("\n=== DEPLOYMENT SUMMARY ===");
        console.log("Network: Base Sepolia");
        console.log("ReputationSystem:", address(reputation));
        console.log("ChallengeFactory:", address(factory));
        console.log("========================\n");
    }
}
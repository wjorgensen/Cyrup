// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {ChallengeEscrow} from "../src/ChallengeEscrow.sol";

/// @title ChallengeEscrow deployment script
/// @notice Deploys the ChallengeEscrow contract to the target network
contract DeployChallengeEscrowScript is Script {
    function setUp() public {}

    /// @notice Main deployment function
    /// @dev Broadcasts transaction using private key from environment
    /// @return escrow The deployed ChallengeEscrow contract
    function run() public returns (ChallengeEscrow escrow) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console2.log("Deploying ChallengeEscrow with account:", deployer);
        console2.log("Account balance:", deployer.balance);
        
        vm.startBroadcast(deployerPrivateKey);
        
        escrow = new ChallengeEscrow();
        
        vm.stopBroadcast();
        
        console2.log("ChallengeEscrow deployed at:", address(escrow));
        console2.log("Deployment cost:", address(escrow).code.length * 32, "bytes");
        
        // Log deployment details for verification
        console2.log("=== Deployment Summary ===");
        console2.log("Contract: ChallengeEscrow");
        console2.log("Address:", address(escrow));
        console2.log("Deployer:", deployer);
        console2.log("Network:", block.chainid);
        console2.log("Block:", block.number);
    }
}
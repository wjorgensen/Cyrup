// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script} from "forge-std/Script.sol";
import {ReputationSystem} from "../src/ReputationSystem.sol";
import {ChallengeFactory} from "../src/ChallengeFactory.sol";
import {ChallengeEscrow} from "../src/ChallengeEscrow.sol";

contract DeployFlow is Script {
    function run() external returns (
        address reputationSystem,
        address challengeFactory
    ) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy ChallengeFactory (which includes ChallengeEscrow implementation)
        challengeFactory = address(new ChallengeFactory());
        
        // Deploy ReputationSystem with ChallengeFactory address
        reputationSystem = address(new ReputationSystem(challengeFactory));
        
        // Set the ReputationSystem in ChallengeFactory
        ChallengeFactory(challengeFactory).setReputationSystem(reputationSystem);
        
        vm.stopBroadcast();
        
        return (reputationSystem, challengeFactory);
    }
}
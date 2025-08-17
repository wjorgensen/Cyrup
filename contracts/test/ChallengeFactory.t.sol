// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @title ChallengeFactory Test Suite
/// @author Cyrup Protocol
/// @notice Comprehensive tests for factory pattern implementation
/// @dev Tests deployment, initialization, and reputation integration

import {Test, console2} from "forge-std/Test.sol";
import {ChallengeFactory} from "../src/ChallengeFactory.sol";
import {ChallengeEscrow} from "../src/ChallengeEscrow.sol";
import {ReputationSystem} from "../src/ReputationSystem.sol";
import {IERC20} from "lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {ERC20} from "lib/openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";

/// @notice Mock USDC token for testing
/// @dev Simple ERC20 with 6 decimals like USDC
contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USDC", "USDC") {}
    
    function decimals() public pure override returns (uint8) {
        return 6;
    }
    
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract ChallengeFactoryTest is Test {
    /*//////////////////////////////////////////////////////////////
                              TEST STORAGE
    //////////////////////////////////////////////////////////////*/
    
    ChallengeFactory public factory;
    ReputationSystem public reputation;
    MockUSDC public usdc;
    
    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");
    address public charlie = makeAddr("charlie");
    address public verifier = makeAddr("verifier");
    
    uint256 constant REWARD_AMOUNT = 1000e6; // 1000 USDC
    uint256 constant VERIFIER_REWARD = 50e6; // 50 USDC (5%)
    
    /*//////////////////////////////////////////////////////////////
                              SETUP
    //////////////////////////////////////////////////////////////*/
    
    function setUp() public {
        // Deploy mock USDC
        usdc = new MockUSDC();
        
        // Deploy factory first without reputation system
        factory = new ChallengeFactory();
        
        // Deploy reputation system with factory address
        reputation = new ReputationSystem(address(factory));
        
        // Set reputation system in factory
        factory.setReputationSystem(address(reputation));
        
        // Fund test accounts
        usdc.mint(alice, 10000e6);
        usdc.mint(bob, 10000e6);
        usdc.mint(charlie, 10000e6);
        
        // Setup verifier with reputation
        _setupVerifier();
    }
    
    /// @notice Setup a qualified verifier with sufficient reputation
    /// @dev Updates reputation to meet top 10% threshold
    function _setupVerifier() internal {
        // Deploy a challenge to update reputation through
        vm.prank(alice);
        address challenge = factory.deployChallenge(999);
        
        // Create many users with varying reputation to establish proper threshold
        vm.startPrank(challenge);
        // Create 20 users with low reputation
        for (uint i = 1; i <= 20; i++) {
            factory.updateReputation(makeAddr(string(abi.encodePacked("user", i))), 10e6, false);
        }
        
        // Create 10 users with medium reputation
        for (uint i = 21; i <= 30; i++) {
            factory.updateReputation(makeAddr(string(abi.encodePacked("user", i))), 100e6, false);
        }
        
        // Give verifier high reputation to be in top 10% (top 3 out of 31 users)
        factory.updateReputation(verifier, 5000e6, false); // High winner reward - 200 points
        
        // Force threshold update
        vm.stopPrank();
        
        // Call updateTop10Threshold to recalculate
        reputation.updateTop10Threshold();
    }
    
    /*//////////////////////////////////////////////////////////////
                         DEPLOYMENT TESTS
    //////////////////////////////////////////////////////////////*/
    
    /// @notice Test challenge deployment with deterministic address
    /// @dev Verifies clone deployment and initialization
    function test_DeployChallenge() public {
        vm.startPrank(alice);
        
        // Get initial count (1 from setup)
        uint256 initialCount = factory.getTotalChallenges();
        
        // Deploy challenge with salt
        bytes32 salt = keccak256("test-salt");
        address challenge = factory.deployChallenge(salt);
        
        // Verify deployment
        assertTrue(factory.isChallengeContract(challenge));
        assertEq(factory.getTotalChallenges(), initialCount + 1);
        assertEq(factory.getChallengeCounter(), initialCount + 1);
        
        // Verify challenge initialization
        ChallengeEscrow escrow = ChallengeEscrow(challenge);
        assertEq(escrow.factory(), address(factory));
        
        vm.stopPrank();
    }
    
    /// @notice Test deployment with nonce-based salt
    /// @dev Tests convenience function for deployment
    function test_DeployWithNonce() public {
        vm.startPrank(alice);
        
        // Deploy with nonce
        address challenge1 = factory.deployChallenge(1);
        address challenge2 = factory.deployChallenge(2);
        
        // Verify different addresses
        assertTrue(challenge1 != challenge2);
        assertTrue(factory.isChallengeContract(challenge1));
        assertTrue(factory.isChallengeContract(challenge2));
        
        vm.stopPrank();
    }
    
    /// @notice Test address prediction
    /// @dev Verifies CREATE2 address computation
    function test_PredictAddress() public {
        bytes32 salt = keccak256("predict-test");
        
        // Predict address
        address predicted = factory.computeChallengeAddress(salt);
        
        // Deploy and verify
        vm.prank(alice);
        address deployed = factory.deployChallenge(salt);
        
        assertEq(deployed, predicted);
    }
    
    /*//////////////////////////////////////////////////////////////
                      REPUTATION INTEGRATION TESTS
    //////////////////////////////////////////////////////////////*/
    
    /// @notice Test verifier qualification check
    /// @dev Verifies integration with reputation system
    function test_VerifierQualification() public view {
        // Check qualified verifier
        assertTrue(factory.isQualifiedVerifier(verifier));
        
        // Check unqualified user
        assertFalse(factory.isQualifiedVerifier(alice));
    }
    
    /// @notice Test reputation update through factory
    /// @dev Verifies only challenges can update reputation
    function test_ReputationUpdate() public {
        // Deploy challenge
        vm.prank(alice);
        address challenge = factory.deployChallenge(1);
        
        // Try to update reputation directly (should fail)
        vm.expectRevert(ChallengeFactory.NotChallengeContract.selector);
        factory.updateReputation(bob, 100e6, false);
        
        // Update from challenge contract (mock the call)
        vm.prank(challenge);
        factory.updateReputation(bob, 100e6, false);
        
        // Verify reputation updated
        (uint256 points,,,,,) = reputation.getUserReputation(bob);
        assertTrue(points > 0);
    }
    
    /*//////////////////////////////////////////////////////////////
                      CHALLENGE WORKFLOW TESTS
    //////////////////////////////////////////////////////////////*/
    
    /// @notice Test complete challenge workflow with factory
    /// @dev Tests challenge creation, verification, and reward distribution
    function test_CompleteWorkflow() public {
        // Deploy challenge contract
        vm.prank(alice);
        address challengeAddr = factory.deployChallenge(1);
        ChallengeEscrow challenge = ChallengeEscrow(challengeAddr);
        
        // Create challenge
        vm.startPrank(alice);
        usdc.approve(challengeAddr, REWARD_AMOUNT);
        challenge.createChallenge(
            REWARD_AMOUNT,
            address(usdc),
            block.timestamp + 7 days,
            "Test challenge"
        );
        vm.stopPrank();
        
        // Verifier proposes (should check qualification)
        vm.prank(verifier);
        challenge.proposeAsVerifier(1);
        
        // Select verifier
        vm.prank(alice);
        challenge.selectVerifier(1, verifier);
        
        // Submit solution
        vm.prank(bob);
        challenge.submitSolution(1, "ipfs://solution", "uid-factory-test");
        
        // Approve solution
        vm.prank(verifier);
        challenge.approveSolution(1, 1);
        
        // Award solution (creator approval + distribution)
        vm.prank(alice);
        challenge.awardSolution(1, 1);
        
        // Verify reputation was updated
        (uint256 bobPoints,,,,,) = reputation.getUserReputation(bob);
        (uint256 verifierPoints,,,,,) = reputation.getUserReputation(verifier);
        
        assertTrue(bobPoints > 0, "Bob should have reputation");
        assertTrue(verifierPoints > 200, "Verifier should have increased reputation");
    }
    
    /// @notice Test unqualified verifier cannot propose
    /// @dev Verifies qualification check in ChallengeEscrow
    function test_UnqualifiedVerifierCannotPropose() public {
        // Deploy and create challenge
        vm.prank(alice);
        address challengeAddr = factory.deployChallenge(100);
        ChallengeEscrow challenge = ChallengeEscrow(challengeAddr);
        
        vm.startPrank(alice);
        usdc.approve(challengeAddr, REWARD_AMOUNT);
        uint256 challengeId = challenge.createChallenge(
            REWARD_AMOUNT,
            address(usdc),
            block.timestamp + 7 days,
            "Test challenge"
        );
        vm.stopPrank();
        
        // Unqualified user (bob has no reputation) tries to propose
        vm.prank(bob);
        vm.expectRevert(ChallengeEscrow.NotQualifiedVerifier.selector);
        challenge.proposeAsVerifier(challengeId);
    }
    
    /*//////////////////////////////////////////////////////////////
                          QUERY TESTS
    //////////////////////////////////////////////////////////////*/
    
    /// @notice Test challenge enumeration
    /// @dev Tests pagination and query functions
    function test_ChallengeEnumeration() public {
        uint256 initialCount = factory.getTotalChallenges();
        
        // Deploy multiple challenges
        vm.startPrank(alice);
        address challenge1 = factory.deployChallenge(1);
        address challenge2 = factory.deployChallenge(2);
        address challenge3 = factory.deployChallenge(3);
        vm.stopPrank();
        
        // Test total count
        assertEq(factory.getTotalChallenges(), initialCount + 3);
        
        // Test pagination (skip initial challenge)
        address[] memory page1 = factory.getDeployedChallenges(initialCount, 2);
        assertEq(page1.length, 2);
        assertEq(page1[0], challenge1);
        assertEq(page1[1], challenge2);
        
        address[] memory page2 = factory.getDeployedChallenges(initialCount + 2, 2);
        assertEq(page2.length, 1);
        assertEq(page2[0], challenge3);
    }
    
    /// @notice Test challenges by creator
    /// @dev Verifies creator-specific queries
    function test_ChallengesByCreator() public {
        // Get initial alice challenges (1 from setup)
        uint256 initialAliceCount = factory.getChallengesByCreator(alice).length;
        
        // Alice deploys challenges
        vm.startPrank(alice);
        address aliceChallenge1 = factory.deployChallenge(1);
        address aliceChallenge2 = factory.deployChallenge(2);
        vm.stopPrank();
        
        // Bob deploys challenge
        vm.prank(bob);
        address bobChallenge = factory.deployChallenge(1);
        
        // Check creator queries
        address[] memory aliceChallenges = factory.getChallengesByCreator(alice);
        assertEq(aliceChallenges.length, initialAliceCount + 2);
        assertEq(aliceChallenges[initialAliceCount], aliceChallenge1);
        assertEq(aliceChallenges[initialAliceCount + 1], aliceChallenge2);
        
        address[] memory bobChallenges = factory.getChallengesByCreator(bob);
        assertEq(bobChallenges.length, 1);
        assertEq(bobChallenges[0], bobChallenge);
    }
    
    /// @notice Test recent challenges query
    /// @dev Tests retrieval of most recent deployments
    function test_RecentChallenges() public {
        // Deploy challenges
        vm.startPrank(alice);
        address challenge1 = factory.deployChallenge(1);
        address challenge2 = factory.deployChallenge(2);
        address challenge3 = factory.deployChallenge(3);
        vm.stopPrank();
        
        // Get recent challenges
        address[] memory recent = factory.getRecentChallenges(2);
        assertEq(recent.length, 2);
        assertEq(recent[0], challenge2);
        assertEq(recent[1], challenge3);
    }
    
    /// @notice Test batch validation
    /// @dev Verifies multiple challenges can be validated efficiently
    function test_BatchValidation() public {
        // Deploy challenges
        vm.startPrank(alice);
        address challenge1 = factory.deployChallenge(1);
        address challenge2 = factory.deployChallenge(2);
        vm.stopPrank();
        
        // Create array with valid and invalid addresses
        address[] memory toCheck = new address[](4);
        toCheck[0] = challenge1;
        toCheck[1] = challenge2;
        toCheck[2] = address(0x1234); // Invalid
        toCheck[3] = address(factory); // Invalid
        
        // Batch validate
        bool[] memory results = factory.areChallengesValid(toCheck);
        
        assertTrue(results[0]);
        assertTrue(results[1]);
        assertFalse(results[2]);
        assertFalse(results[3]);
    }
    
    /*//////////////////////////////////////////////////////////////
                          ERROR TESTS
    //////////////////////////////////////////////////////////////*/
    
    /// @notice Test invalid reputation system
    /// @dev Verifies setReputationSystem validation
    function test_InvalidReputationSystem() public {
        ChallengeFactory newFactory = new ChallengeFactory();
        vm.expectRevert(ChallengeFactory.InvalidReputationSystem.selector);
        newFactory.setReputationSystem(address(0));
    }
    
    /// @notice Test reputation system can only be set once
    /// @dev Verifies setReputationSystem can't be called twice
    function test_ReputationSystemAlreadySet() public {
        ChallengeFactory newFactory = new ChallengeFactory();
        newFactory.setReputationSystem(address(reputation));
        
        vm.expectRevert(ChallengeFactory.ReputationSystemAlreadySet.selector);
        newFactory.setReputationSystem(address(reputation));
    }
    
    /// @notice Test operations fail when reputation system not set
    /// @dev Verifies functions check for reputation system
    function test_ReputationSystemNotSet() public {
        ChallengeFactory newFactory = new ChallengeFactory();
        
        // Deploy a challenge
        address challenge = newFactory.deployChallenge(bytes32(uint256(1)));
        
        // Try to update reputation (should fail)
        vm.prank(challenge);
        vm.expectRevert(ChallengeFactory.ReputationSystemNotSet.selector);
        newFactory.updateReputation(alice, 100e6, false);
        
        // Try to check verifier qualification (should fail)
        vm.expectRevert(ChallengeFactory.ReputationSystemNotSet.selector);
        newFactory.isQualifiedVerifier(alice);
    }
    
    /// @notice Test query size limits
    /// @dev Verifies pagination limits are enforced
    function test_QuerySizeLimits() public {
        vm.expectRevert(ChallengeFactory.ExcessiveQuerySize.selector);
        factory.getDeployedChallenges(0, 101);
        
        vm.expectRevert(ChallengeFactory.ExcessiveQuerySize.selector);
        factory.getRecentChallenges(101);
    }
    
    /// @notice Test out of bounds queries
    /// @dev Verifies bounds checking
    function test_OutOfBoundsQuery() public {
        vm.expectRevert(ChallengeFactory.IndexOutOfBounds.selector);
        factory.getDeployedChallenges(100, 10);
    }
}
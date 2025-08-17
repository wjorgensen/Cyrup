// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Test.sol";
import "../src/ReputationSystem.sol";
import "../src/ChallengeEscrow.sol";
import "lib/openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";

/// @title ReputationSystem Test Suite
/// @notice Comprehensive tests for reputation system functionality
/// @dev Tests gas optimization, security, and integration
contract ReputationSystemTest is Test {
    ReputationSystem public reputationSystem;
    ChallengeEscrow public challengeEscrow;
    MockUSDC public usdc;
    
    address public alice = address(0x1);
    address public bob = address(0x2);
    address public charlie = address(0x3);
    address public creator = address(0x4);
    address public verifier = address(0x5);
    
    event ReputationUpdated(
        address indexed user,
        uint256 pointsAdded,
        uint256 totalPoints,
        bool isVerifier
    );
    
    event ThresholdUpdated(
        uint256 oldThreshold,
        uint256 newThreshold,
        uint256 totalUsers
    );

    function setUp() public {
        // Deploy contracts
        usdc = new MockUSDC();
        challengeEscrow = new ChallengeEscrow();
        reputationSystem = new ReputationSystem(address(challengeEscrow));
        
        // Fund test accounts
        usdc.mint(creator, 10000e6); // 10,000 USDC
        usdc.mint(alice, 10000e6);
        usdc.mint(bob, 10000e6);
        usdc.mint(charlie, 10000e6);
        
        // Approve escrow
        vm.prank(creator);
        usdc.approve(address(challengeEscrow), type(uint256).max);
    }
    
    /*//////////////////////////////////////////////////////////////
                          POINT CALCULATION TESTS
    //////////////////////////////////////////////////////////////*/
    
    function testCalculatePointsTier0Winner() public view {
        // 0-100 USDC: 10 points for winner
        assertEq(reputationSystem.calculatePoints(50e6, false), 10);
        assertEq(reputationSystem.calculatePoints(100e6, false), 10);
    }
    
    function testCalculatePointsTier0Verifier() public view {
        // 0-100 USDC: 2 points for verifier
        assertEq(reputationSystem.calculatePoints(50e6, true), 2);
        assertEq(reputationSystem.calculatePoints(100e6, true), 2);
    }
    
    function testCalculatePointsTier1() public view {
        // 100-500 USDC
        assertEq(reputationSystem.calculatePoints(101e6, false), 50);
        assertEq(reputationSystem.calculatePoints(500e6, false), 50);
        assertEq(reputationSystem.calculatePoints(101e6, true), 10);
        assertEq(reputationSystem.calculatePoints(500e6, true), 10);
    }
    
    function testCalculatePointsTier2() public view {
        // 500-1000 USDC
        assertEq(reputationSystem.calculatePoints(501e6, false), 100);
        assertEq(reputationSystem.calculatePoints(1000e6, false), 100);
        assertEq(reputationSystem.calculatePoints(501e6, true), 20);
        assertEq(reputationSystem.calculatePoints(1000e6, true), 20);
    }
    
    function testCalculatePointsTier3() public view {
        // 1000+ USDC
        assertEq(reputationSystem.calculatePoints(1001e6, false), 200);
        assertEq(reputationSystem.calculatePoints(10000e6, false), 200);
        assertEq(reputationSystem.calculatePoints(1001e6, true), 40);
        assertEq(reputationSystem.calculatePoints(10000e6, true), 40);
    }
    
    /*//////////////////////////////////////////////////////////////
                        REPUTATION UPDATE TESTS
    //////////////////////////////////////////////////////////////*/
    
    function testUpdateReputationAsWinner() public {
        vm.prank(address(challengeEscrow));
        vm.expectEmit(true, false, false, true);
        emit ReputationUpdated(alice, 50, 50, false);
        reputationSystem.updateReputation(alice, 150e6, false);
        
        (
            uint256 totalPoints,
            uint256 challengeCount,
            uint256 winnerCount,
            uint256 verifierCount,
            uint256 verifierPoints,
        ) = reputationSystem.getUserReputation(alice);
        
        assertEq(totalPoints, 50);
        assertEq(challengeCount, 1);
        assertEq(winnerCount, 1);
        assertEq(verifierCount, 0);
        assertEq(verifierPoints, 0);
    }
    
    function testUpdateReputationAsVerifier() public {
        vm.prank(address(challengeEscrow));
        vm.expectEmit(true, false, false, true);
        emit ReputationUpdated(bob, 10, 10, true);
        reputationSystem.updateReputation(bob, 150e6, true);
        
        (
            uint256 totalPoints,
            uint256 challengeCount,
            uint256 winnerCount,
            uint256 verifierCount,
            uint256 verifierPoints,
        ) = reputationSystem.getUserReputation(bob);
        
        assertEq(totalPoints, 10);
        assertEq(challengeCount, 1);
        assertEq(winnerCount, 0);
        assertEq(verifierCount, 1);
        assertEq(verifierPoints, 10);
    }
    
    function testMultipleUpdates() public {
        vm.startPrank(address(challengeEscrow));
        
        // First update - winner
        reputationSystem.updateReputation(alice, 100e6, false);
        
        // Second update - verifier
        reputationSystem.updateReputation(alice, 500e6, true);
        
        // Third update - winner again
        reputationSystem.updateReputation(alice, 1000e6, false);
        
        vm.stopPrank();
        
        (
            uint256 totalPoints,
            uint256 challengeCount,
            uint256 winnerCount,
            uint256 verifierCount,
            uint256 verifierPoints,
        ) = reputationSystem.getUserReputation(alice);
        
        // 10 + 10 + 100 = 120 points
        assertEq(totalPoints, 120);
        assertEq(challengeCount, 3);
        assertEq(winnerCount, 2);
        assertEq(verifierCount, 1);
        assertEq(verifierPoints, 10);
    }
    
    /*//////////////////////////////////////////////////////////////
                          ACCESS CONTROL TESTS
    //////////////////////////////////////////////////////////////*/
    
    function testOnlyEscrowCanUpdateReputation() public {
        vm.expectRevert(Unauthorized.selector);
        reputationSystem.updateReputation(alice, 100e6, false);
    }
    
    function testOnlyEscrowCanBatchUpdate() public {
        address[] memory users = new address[](1);
        uint256[] memory amounts = new uint256[](1);
        bool[] memory isVerifiers = new bool[](1);
        
        users[0] = alice;
        amounts[0] = 100e6;
        isVerifiers[0] = false;
        
        vm.expectRevert(Unauthorized.selector);
        reputationSystem.batchUpdateReputation(users, amounts, isVerifiers);
    }
    
    /*//////////////////////////////////////////////////////////////
                          BATCH UPDATE TESTS
    //////////////////////////////////////////////////////////////*/
    
    function testBatchUpdateReputation() public {
        address[] memory users = new address[](3);
        uint256[] memory amounts = new uint256[](3);
        bool[] memory isVerifiers = new bool[](3);
        
        users[0] = alice;
        users[1] = bob;
        users[2] = charlie;
        
        amounts[0] = 100e6;  // 10 points
        amounts[1] = 500e6;  // 50 points
        amounts[2] = 1000e6; // 100 points
        
        isVerifiers[0] = false;
        isVerifiers[1] = false;
        isVerifiers[2] = false;
        
        vm.prank(address(challengeEscrow));
        reputationSystem.batchUpdateReputation(users, amounts, isVerifiers);
        
        (uint256 alicePoints,,,,,) = reputationSystem.getUserReputation(alice);
        (uint256 bobPoints,,,,,) = reputationSystem.getUserReputation(bob);
        (uint256 charliePoints,,,,,) = reputationSystem.getUserReputation(charlie);
        
        assertEq(alicePoints, 10);
        assertEq(bobPoints, 50);
        assertEq(charliePoints, 100);
        assertEq(reputationSystem.getTotalUsers(), 3);
    }
    
    function testBatchUpdateMismatchedArrays() public {
        address[] memory users = new address[](2);
        uint256[] memory amounts = new uint256[](3);
        bool[] memory isVerifiers = new bool[](2);
        
        vm.prank(address(challengeEscrow));
        vm.expectRevert(LengthMismatch.selector);
        reputationSystem.batchUpdateReputation(users, amounts, isVerifiers);
    }
    
    /*//////////////////////////////////////////////////////////////
                        LEADERBOARD TESTS
    //////////////////////////////////////////////////////////////*/
    
    function testLeaderboardSorting() public {
        vm.startPrank(address(challengeEscrow));
        
        // Add users with different points
        reputationSystem.updateReputation(alice, 100e6, false);   // 10 points
        reputationSystem.updateReputation(bob, 500e6, false);     // 50 points
        reputationSystem.updateReputation(charlie, 1000e6, false); // 100 points
        
        vm.stopPrank();
        
        (address[] memory users, uint256[] memory points) = reputationSystem.getLeaderboard(3);
        
        // Should be sorted: charlie (100), bob (50), alice (10)
        assertEq(users[0], charlie);
        assertEq(users[1], bob);
        assertEq(users[2], alice);
        assertEq(points[0], 100);
        assertEq(points[1], 50);
        assertEq(points[2], 10);
    }
    
    function testLeaderboardLimit() public {
        vm.prank(address(challengeEscrow));
        vm.expectRevert(ExcessiveLimit.selector);
        reputationSystem.getLeaderboard(101);
    }
    
    /*//////////////////////////////////////////////////////////////
                      TOP 10% THRESHOLD TESTS
    //////////////////////////////////////////////////////////////*/
    
    function testThresholdUpdateWithManyUsers() public {
        vm.startPrank(address(challengeEscrow));
        
        // Add 20 users with varying points
        for (uint160 i = 1; i <= 20; i++) {
            address user = address(i);
            uint256 amount = i * 50e6; // Increasing amounts
            reputationSystem.updateReputation(user, amount, false);
        }
        
        vm.stopPrank();
        
        // Force threshold update
        reputationSystem.updateTop10Threshold();
        
        // Top 10% of 20 users = top 2 users
        // User 20 has most points, user 19 second most
        // Threshold should be around user 18's points
        uint256 threshold = reputationSystem.getTop10Threshold();
        assertGt(threshold, 0);
    }
    
    function testIsQualifiedVerifier() public {
        vm.startPrank(address(challengeEscrow));
        
        // Create users with different point levels
        reputationSystem.updateReputation(alice, 1000e6, false);  // 100 points
        reputationSystem.updateReputation(bob, 100e6, false);     // 10 points
        
        vm.stopPrank();
        
        // Update threshold
        reputationSystem.updateTop10Threshold();
        
        // Alice should be qualified (high points)
        bool aliceQualified = reputationSystem.isQualifiedVerifier(alice);
        assertTrue(aliceQualified);
    }
    
    /*//////////////////////////////////////////////////////////////
                          EDGE CASE TESTS
    //////////////////////////////////////////////////////////////*/
    
    function testZeroAmountReverts() public {
        vm.prank(address(challengeEscrow));
        vm.expectRevert(InvalidAmount.selector);
        reputationSystem.updateReputation(alice, 0, false);
    }
    
    function testZeroAddressReverts() public {
        vm.prank(address(challengeEscrow));
        vm.expectRevert(InvalidUser.selector);
        reputationSystem.updateReputation(address(0), 100e6, false);
    }
    
    function testGetUserReputationEmptyUser() public view {
        (
            uint256 totalPoints,
            uint256 challengeCount,
            uint256 winnerCount,
            uint256 verifierCount,
            uint256 verifierPoints,
            uint256 lastUpdate
        ) = reputationSystem.getUserReputation(address(0xdead));
        
        assertEq(totalPoints, 0);
        assertEq(challengeCount, 0);
        assertEq(winnerCount, 0);
        assertEq(verifierCount, 0);
        assertEq(verifierPoints, 0);
        assertEq(lastUpdate, 0);
    }
    
    /*//////////////////////////////////////////////////////////////
                            GAS TESTS
    //////////////////////////////////////////////////////////////*/
    
    function testGasFirstUserUpdate() public {
        vm.prank(address(challengeEscrow));
        uint256 gasBefore = gasleft();
        reputationSystem.updateReputation(alice, 100e6, false);
        uint256 gasUsed = gasBefore - gasleft();
        console.log("Gas used for first user update:", gasUsed);
        assertLt(gasUsed, 200000); // Reasonable for first user (cold storage)
    }
    
    function testGasSubsequentUpdate() public {
        vm.prank(address(challengeEscrow));
        reputationSystem.updateReputation(alice, 100e6, false);
        
        vm.prank(address(challengeEscrow));
        uint256 gasBefore = gasleft();
        reputationSystem.updateReputation(alice, 200e6, false);
        uint256 gasUsed = gasBefore - gasleft();
        console.log("Gas used for subsequent update:", gasUsed);
        assertLt(gasUsed, 80000); // Reasonable for warm storage update
    }
    
    function testGasLeaderboardQuery() public {
        // Populate some users
        vm.startPrank(address(challengeEscrow));
        for (uint160 i = 1; i <= 10; i++) {
            reputationSystem.updateReputation(address(i), i * 100e6, false);
        }
        vm.stopPrank();
        
        uint256 gasBefore = gasleft();
        reputationSystem.getLeaderboard(10);
        uint256 gasUsed = gasBefore - gasleft();
        console.log("Gas used for leaderboard query (10 users):", gasUsed);
        assertLt(gasUsed, 50000); // Should be under 50k gas
    }
}

/// @notice Mock USDC token for testing
contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USDC", "USDC") {}
    
    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }
    
    function decimals() public pure override returns (uint8) {
        return 6;
    }
}
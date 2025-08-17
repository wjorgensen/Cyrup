// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test, console2} from "forge-std/Test.sol";
import {ChallengeEscrow} from "../src/ChallengeEscrow.sol";
import {IERC20} from "lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {ERC20} from "lib/openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";

/// @title Mock USDC token for testing
contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USDC", "USDC") {
        _mint(msg.sender, 1000000 * 10**6); // 1M USDC
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }
}

/// @title Mock ChallengeFactory for testing
/// @notice Provides minimal factory interface for escrow testing
/// @dev Implements reputation and verifier qualification mocks
contract MockFactory {
    mapping(address => bool) public qualifiedVerifiers;
    
    constructor() {
        // Pre-qualify test verifier
        qualifiedVerifiers[address(0x2)] = true;
    }
    
    /// @notice Mock reputation update
    /// @dev Does nothing in test environment
    function updateReputation(address, uint256, bool) external {}
    
    /// @notice Check if address is qualified verifier
    /// @dev Returns true for pre-qualified addresses
    function isQualifiedVerifier(address user) external view returns (bool) {
        return qualifiedVerifiers[user];
    }
    
    /// @notice Qualify a verifier for testing
    /// @dev Test helper to add qualified verifiers
    function addQualifiedVerifier(address user) external {
        qualifiedVerifiers[user] = true;
    }
}

/// @title ChallengeEscrow test suite
contract ChallengeEscrowTest is Test {
    ChallengeEscrow public escrow;
    MockUSDC public usdc;
    MockFactory public factory;
    
    address public creator = address(0x1);
    address public verifier = address(0x2);
    address public solver = address(0x3);
    address public otherSolver = address(0x4);
    
    uint256 constant REWARD = 1000 * 10**6; // 1000 USDC
    uint256 constant DEADLINE = 7 days;

    function setUp() public {
        // Deploy mock factory first
        factory = new MockFactory();
        
        // Deploy and initialize escrow with factory
        escrow = new ChallengeEscrow();
        escrow.initialize(address(factory));
        
        usdc = new MockUSDC();
        
        // Transfer USDC to test accounts
        usdc.transfer(creator, REWARD * 10);
        
        // Setup approvals
        vm.prank(creator);
        usdc.approve(address(escrow), type(uint256).max);
    }

    function testCreateChallenge() public {
        vm.prank(creator);
        uint256 challengeId = escrow.createChallenge(
            REWARD,
            address(usdc),
            block.timestamp + DEADLINE,
            "Test challenge description"
        );
        
        assertEq(challengeId, 1);
        
        (
            address _creator,
            ChallengeEscrow.Status status,
            uint40 deadline,
            uint48 submissionCount,
            address _verifier,
            uint96 reward,
            IERC20 token,
            uint96 winningSubmission,
            string memory description
        ) = escrow.challenges(challengeId);
        
        assertEq(_creator, creator);
        assertEq(uint8(status), uint8(ChallengeEscrow.Status.Open));
        assertEq(deadline, block.timestamp + DEADLINE);
        assertEq(submissionCount, 0);
        assertEq(_verifier, address(0));
        assertEq(reward, REWARD);
        assertEq(address(token), address(usdc));
        assertEq(winningSubmission, 0);
        assertEq(description, "Test challenge description");
    }

    function testFullWorkflow() public {
        // Create challenge
        vm.prank(creator);
        uint256 challengeId = escrow.createChallenge(
            REWARD,
            address(usdc),
            block.timestamp + DEADLINE,
            "Solve this problem"
        );
        
        // Propose as verifier
        vm.prank(verifier);
        escrow.proposeAsVerifier(challengeId);
        
        // Select verifier
        vm.prank(creator);
        escrow.selectVerifier(challengeId, verifier);
        
        // Submit solution with UID
        string memory testUid = "uid-12345-lean-code";
        vm.prank(solver);
        uint256 submissionId = escrow.submitSolution(
            challengeId,
            "QmSolutionHash123",
            testUid
        );
        
        // Verify UID was stored
        (address submittedSolver, , string memory hash, string memory uid) = 
            escrow.getSubmission(challengeId, submissionId);
        assertEq(submittedSolver, solver);
        assertEq(hash, "QmSolutionHash123");
        assertEq(uid, testUid);
        
        // Approve by verifier
        vm.prank(verifier);
        escrow.approveSolution(challengeId, submissionId);
        
        // Award by creator (triggers distribution)
        uint256 solverBalanceBefore = usdc.balanceOf(solver);
        uint256 verifierBalanceBefore = usdc.balanceOf(verifier);
        
        vm.prank(creator);
        escrow.awardSolution(challengeId, submissionId);
        
        // Check rewards distributed correctly
        uint256 verifierReward = (REWARD * 500) / 10000; // 5%
        uint256 solverReward = REWARD - verifierReward;   // 95%
        
        assertEq(usdc.balanceOf(solver) - solverBalanceBefore, solverReward);
        assertEq(usdc.balanceOf(verifier) - verifierBalanceBefore, verifierReward);
        
        // Check status updated
        (, ChallengeEscrow.Status status,,,,,,,) = escrow.challenges(challengeId);
        assertEq(uint8(status), uint8(ChallengeEscrow.Status.Completed));
    }

    function testCancelChallenge() public {
        vm.prank(creator);
        uint256 challengeId = escrow.createChallenge(
            REWARD,
            address(usdc),
            block.timestamp + DEADLINE,
            "Cancel me"
        );
        
        uint256 balanceBefore = usdc.balanceOf(creator);
        
        vm.prank(creator);
        escrow.cancelChallenge(challengeId);
        
        assertEq(usdc.balanceOf(creator) - balanceBefore, REWARD);
        
        (, ChallengeEscrow.Status status,,,,,,,) = escrow.challenges(challengeId);
        assertEq(uint8(status), uint8(ChallengeEscrow.Status.Cancelled));
    }

    function testEmergencyWithdraw() public {
        vm.prank(creator);
        uint256 challengeId = escrow.createChallenge(
            REWARD,
            address(usdc),
            block.timestamp + DEADLINE,
            "Emergency test"
        );
        
        // Fast forward past deadline + grace period
        vm.warp(block.timestamp + DEADLINE + 31 days);
        
        uint256 balanceBefore = usdc.balanceOf(creator);
        
        vm.prank(creator);
        escrow.emergencyWithdraw(challengeId);
        
        assertEq(usdc.balanceOf(creator) - balanceBefore, REWARD);
    }

    function testRevertConditions() public {
        // Test zero reward
        vm.prank(creator);
        vm.expectRevert(ChallengeEscrow.ZeroReward.selector);
        escrow.createChallenge(0, address(usdc), block.timestamp + DEADLINE, "");
        
        // Test deadline in past
        vm.prank(creator);
        vm.expectRevert(ChallengeEscrow.DeadlinePassed.selector);
        escrow.createChallenge(REWARD, address(usdc), block.timestamp - 1, "");
        
        // Create valid challenge
        vm.prank(creator);
        uint256 challengeId = escrow.createChallenge(
            REWARD,
            address(usdc),
            block.timestamp + DEADLINE,
            "Test"
        );
        
        // Test double proposal
        vm.prank(verifier);
        escrow.proposeAsVerifier(challengeId);
        
        vm.prank(verifier);
        vm.expectRevert(ChallengeEscrow.AlreadyProposed.selector);
        escrow.proposeAsVerifier(challengeId);
        
        // Test selecting non-proposed verifier
        vm.prank(creator);
        vm.expectRevert(ChallengeEscrow.NotProposed.selector);
        escrow.selectVerifier(challengeId, solver);
    }

    function testSubmissionWithUID() public {
        // Create challenge
        vm.prank(creator);
        uint256 challengeId = escrow.createChallenge(
            REWARD,
            address(usdc),
            block.timestamp + DEADLINE,
            "Test UID storage"
        );
        
        // Setup verifier
        vm.prank(verifier);
        escrow.proposeAsVerifier(challengeId);
        vm.prank(creator);
        escrow.selectVerifier(challengeId, verifier);
        
        // Test various UID formats
        string memory uid1 = "db-uid-12345678-90ab-cdef";
        string memory uid2 = "postgres://lean/code/abc123";
        
        // Submit with first UID
        vm.prank(solver);
        uint256 submissionId1 = escrow.submitSolution(
            challengeId,
            "QmHash1",
            uid1
        );
        
        // Submit with different solver and UID
        vm.prank(otherSolver);
        uint256 submissionId2 = escrow.submitSolution(
            challengeId,
            "QmHash2",
            uid2
        );
        
        // Verify both UIDs stored correctly
        (address solver1, uint96 timestamp1, string memory hash1, string memory storedUid1) = 
            escrow.getSubmission(challengeId, submissionId1);
        assertEq(solver1, solver);
        assertEq(hash1, "QmHash1");
        assertEq(storedUid1, uid1);
        assertGt(timestamp1, 0);
        
        (address solver2, uint96 timestamp2, string memory hash2, string memory storedUid2) = 
            escrow.getSubmission(challengeId, submissionId2);
        assertEq(solver2, otherSolver);
        assertEq(hash2, "QmHash2");
        assertEq(storedUid2, uid2);
        assertGt(timestamp2, 0);
    }
    
    function testEmptyUID() public {
        // Create and setup challenge
        vm.prank(creator);
        uint256 challengeId = escrow.createChallenge(
            REWARD,
            address(usdc),
            block.timestamp + DEADLINE,
            "Test empty UID"
        );
        
        vm.prank(verifier);
        escrow.proposeAsVerifier(challengeId);
        vm.prank(creator);
        escrow.selectVerifier(challengeId, verifier);
        
        // Submit with empty UID (should work)
        vm.prank(solver);
        uint256 submissionId = escrow.submitSolution(
            challengeId,
            "QmHashEmpty",
            ""
        );
        
        // Verify empty UID stored
        (, , , string memory uid) = escrow.getSubmission(challengeId, submissionId);
        assertEq(uid, "");
    }
    
    function testLongUID() public {
        // Create and setup challenge
        vm.prank(creator);
        uint256 challengeId = escrow.createChallenge(
            REWARD,
            address(usdc),
            block.timestamp + DEADLINE,
            "Test long UID"
        );
        
        vm.prank(verifier);
        escrow.proposeAsVerifier(challengeId);
        vm.prank(creator);
        escrow.selectVerifier(challengeId, verifier);
        
        // Create a long UID (simulating complex database reference)
        string memory longUid = "postgresql://db.cyrup.io/lean_submissions/"
            "theorem_proofs/2024/challenge_12345/"
            "submission_67890_hash_abcdef1234567890/"
            "version_3_timestamp_1234567890";
        
        // Submit with long UID
        vm.prank(solver);
        uint256 submissionId = escrow.submitSolution(
            challengeId,
            "QmHashLong",
            longUid
        );
        
        // Verify long UID stored correctly
        (, , , string memory storedUid) = escrow.getSubmission(challengeId, submissionId);
        assertEq(storedUid, longUid);
    }

    function testGasReport() public {
        // Create challenge
        vm.prank(creator);
        uint256 challengeId = escrow.createChallenge(
            REWARD,
            address(usdc),
            block.timestamp + DEADLINE,
            "Gas test"
        );
        
        // Measure gas for key operations
        vm.prank(verifier);
        uint256 gasPropose = gasleft();
        escrow.proposeAsVerifier(challengeId);
        console2.log("Gas - Propose as verifier:", gasPropose - gasleft());
        
        vm.prank(creator);
        uint256 gasSelect = gasleft();
        escrow.selectVerifier(challengeId, verifier);
        console2.log("Gas - Select verifier:", gasSelect - gasleft());
        
        vm.prank(solver);
        uint256 gasSubmit = gasleft();
        uint256 submissionId = escrow.submitSolution(
            challengeId, 
            "QmHash",
            "uid-gas-test-123"
        );
        console2.log("Gas - Submit solution:", gasSubmit - gasleft());
        
        vm.prank(verifier);
        uint256 gasApprove = gasleft();
        escrow.approveSolution(challengeId, submissionId);
        console2.log("Gas - Approve solution:", gasApprove - gasleft());
        
        vm.prank(creator);
        uint256 gasAward = gasleft();
        escrow.awardSolution(challengeId, submissionId);
        console2.log("Gas - Award solution:", gasAward - gasleft());
    }
}
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @title ChallengeEscrow - Gas-optimized challenge/escrow system
/// @author Cyrup Protocol
/// @notice Manages challenge creation, verification, and reward distribution
/// @dev Implements packed storage, custom errors, and bitmap flags for gas efficiency

import {IERC20} from "lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "lib/openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";
import {Initializable} from "lib/openzeppelin-contracts/contracts/proxy/utils/Initializable.sol";

interface IChallengeFactory {
    function updateReputation(address user, uint256 usdcAmount, bool isVerifier) external;
    function isQualifiedVerifier(address user) external view returns (bool);
}

contract ChallengeEscrow is Initializable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /*//////////////////////////////////////////////////////////////
                                CONSTANTS
    //////////////////////////////////////////////////////////////*/

    /// @notice Verifier reward percentage (5%)
    /// @dev Using basis points for precision (500 / 10000 = 5%)
    uint256 private constant VERIFIER_BPS = 500;
    
    /// @notice Grace period after deadline for emergency withdrawal
    /// @dev 30 days in seconds
    uint256 private constant GRACE_PERIOD = 30 days;
    
    /// @notice Maximum description length to prevent gas griefing
    uint256 private constant MAX_DESCRIPTION_LENGTH = 512;

    /*//////////////////////////////////////////////////////////////
                            CUSTOM ERRORS
    //////////////////////////////////////////////////////////////*/

    /// @custom:error Thrown when challenge doesn't exist
    error ChallengeNotFound();
    
    /// @custom:error Thrown when caller is not the challenge creator
    error NotCreator();
    
    /// @custom:error Thrown when caller is not the selected verifier
    error NotVerifier();
    
    /// @custom:error Thrown when action is invalid for current status
    error InvalidStatus();
    
    /// @custom:error Thrown when deadline has passed
    error DeadlinePassed();
    
    /// @custom:error Thrown when deadline hasn't passed yet
    error DeadlineNotPassed();
    
    /// @custom:error Thrown when grace period hasn't ended
    error GracePeriodActive();
    
    /// @custom:error Thrown when reward amount is zero
    error ZeroReward();
    
    /// @custom:error Thrown when description is too long
    error DescriptionTooLong();
    
    /// @custom:error Thrown when submission doesn't exist
    error SubmissionNotFound();
    
    /// @custom:error Thrown when verifier is already proposed
    error AlreadyProposed();
    
    /// @custom:error Thrown when verifier hasn't proposed
    error NotProposed();
    
    /// @custom:error Thrown when signature already provided
    error AlreadyApproved();
    
    /// @custom:error Thrown when both signatures not provided
    error MissingApprovals();
    
    /// @custom:error Thrown when solution already submitted
    error AlreadySubmitted();
    
    /// @custom:error Thrown when already initialized
    error AlreadyInitialized();
    
    /// @custom:error Thrown when factory address is invalid
    error InvalidFactory();
    
    /// @custom:error Thrown when verifier doesn't meet qualification
    error NotQualifiedVerifier();

    /*//////////////////////////////////////////////////////////////
                                ENUMS
    //////////////////////////////////////////////////////////////*/

    /// @notice Challenge lifecycle status
    /// @dev Packed into uint8 for storage efficiency
    enum Status {
        Open,      // 0: Accepting verifier proposals
        Active,    // 1: Verifier selected, accepting submissions
        Completed, // 2: Winner awarded
        Cancelled  // 3: Challenge cancelled by creator
    }

    /*//////////////////////////////////////////////////////////////
                              STRUCTS
    //////////////////////////////////////////////////////////////*/

    /// @notice Core challenge data
    /// @dev Packed to minimize storage slots (4 slots total)
    struct Challenge {
        address creator;           // Slot 1: 20 bytes
        Status status;            // Slot 1: 1 byte  
        uint40 deadline;          // Slot 1: 5 bytes (sufficient until year 36812)
        uint48 submissionCount;   // Slot 1: 6 bytes (enough for 281T submissions)
        
        address verifier;         // Slot 2: 20 bytes
        uint96 reward;           // Slot 2: 12 bytes (enough for 79B tokens with 18 decimals)
        
        IERC20 token;            // Slot 3: 20 bytes
        uint96 winningSubmission; // Slot 3: 12 bytes
        
        string description;       // Slot 4+: dynamic
    }

    /// @notice Solution submission data
    /// @dev Packed to 3 storage slots minimum
    struct Submission {
        address solver;          // Slot 1: 20 bytes
        uint96 timestamp;        // Slot 1: 12 bytes
        string solutionHash;     // Slot 2+: IPFS hash (dynamic)
        string uid;              // Slot 3+: Database UID (dynamic)
    }

    /*//////////////////////////////////////////////////////////////
                              STORAGE
    //////////////////////////////////////////////////////////////*/

    /// @notice Factory contract that deployed this instance
    /// @dev Used for reputation updates and verifier qualification checks
    address public factory;

    /// @notice Counter for challenge IDs
    /// @dev Using uint96 to save gas while supporting 79 septillion challenges
    uint96 private challengeCounter;

    /// @notice Challenge ID => Challenge data
    mapping(uint256 => Challenge) public challenges;

    /// @notice Challenge ID => Submission ID => Submission data
    mapping(uint256 => mapping(uint256 => Submission)) public submissions;

    /// @notice Challenge ID => solver address => submission ID
    /// @dev Prevents duplicate submissions and enables O(1) lookup
    mapping(uint256 => mapping(address => uint256)) public solverSubmissions;

    /// @notice Challenge ID => verifier address => proposed
    /// @dev Bitmap for tracking verifier proposals
    mapping(uint256 => mapping(address => bool)) public verifierProposals;

    /// @notice Challenge ID => submission ID => approval bitmap
    /// @dev Bit 0: verifier approved, Bit 1: creator approved
    mapping(uint256 => mapping(uint256 => uint8)) public approvals;

    /*//////////////////////////////////////////////////////////////
                              EVENTS
    //////////////////////////////////////////////////////////////*/

    /// @notice Emitted when a challenge is created
    /// @param challengeId Unique identifier for the challenge
    /// @param creator Address that created the challenge
    /// @param reward Amount of tokens in escrow
    /// @param token ERC20 token address
    /// @param deadline Timestamp when challenge expires
    event ChallengeCreated(
        uint256 indexed challengeId,
        address indexed creator,
        uint256 reward,
        address token,
        uint256 deadline
    );

    /// @notice Emitted when a verifier proposes to verify
    /// @param challengeId Challenge being proposed for
    /// @param verifier Address proposing to verify
    event VerifierProposed(
        uint256 indexed challengeId,
        address indexed verifier
    );

    /// @notice Emitted when a verifier is selected
    /// @param challengeId Challenge getting a verifier
    /// @param verifier Selected verifier address
    event VerifierSelected(
        uint256 indexed challengeId,
        address indexed verifier
    );

    /// @notice Emitted when a solution is submitted
    /// @param challengeId Challenge being solved
    /// @param submissionId Unique submission identifier
    /// @param solver Address submitting the solution
    /// @param solutionHash IPFS hash of the solution
    /// @param uid Unique identifier linking to Lean code in database
    event SolutionSubmitted(
        uint256 indexed challengeId,
        uint256 indexed submissionId,
        address indexed solver,
        string solutionHash,
        string uid
    );

    /// @notice Emitted when a solution is approved
    /// @param challengeId Challenge containing the solution
    /// @param submissionId Submission being approved
    /// @param approver Address providing approval
    event SolutionApproved(
        uint256 indexed challengeId,
        uint256 indexed submissionId,
        address indexed approver
    );

    /// @notice Emitted when rewards are distributed
    /// @param challengeId Completed challenge
    /// @param winner Address receiving main reward
    /// @param verifier Address receiving verification fee
    /// @param winnerAmount Amount sent to winner
    /// @param verifierAmount Amount sent to verifier
    event RewardsDistributed(
        uint256 indexed challengeId,
        address indexed winner,
        address indexed verifier,
        uint256 winnerAmount,
        uint256 verifierAmount
    );

    /// @notice Emitted when a challenge is cancelled
    /// @param challengeId Cancelled challenge
    /// @param refundAmount Amount refunded to creator
    event ChallengeCancelled(
        uint256 indexed challengeId,
        uint256 refundAmount
    );

    /*//////////////////////////////////////////////////////////////
                            MODIFIERS
    //////////////////////////////////////////////////////////////*/

    /// @notice Ensures challenge exists
    /// @dev Checks if challenge has been created (creator != 0)
    /// @param challengeId Challenge to validate
    modifier challengeExists(uint256 challengeId) {
        if (challenges[challengeId].creator == address(0)) {
            revert ChallengeNotFound();
        }
        _;
    }

    /// @notice Ensures caller is the challenge creator
    /// @param challengeId Challenge to check ownership
    modifier onlyCreator(uint256 challengeId) {
        if (msg.sender != challenges[challengeId].creator) {
            revert NotCreator();
        }
        _;
    }

    /// @notice Ensures caller is the selected verifier
    /// @param challengeId Challenge to check verifier
    modifier onlyVerifier(uint256 challengeId) {
        if (msg.sender != challenges[challengeId].verifier) {
            revert NotVerifier();
        }
        _;
    }

    /// @notice Ensures challenge has specific status
    /// @param challengeId Challenge to check
    /// @param status Required status
    modifier requireStatus(uint256 challengeId, Status status) {
        if (challenges[challengeId].status != status) {
            revert InvalidStatus();
        }
        _;
    }

    /*//////////////////////////////////////////////////////////////
                            INITIALIZATION
    //////////////////////////////////////////////////////////////*/

    /// @notice Initialize the challenge escrow with factory address
    /// @dev Can only be called once by the factory during deployment
    /// @param _factory Address of the ChallengeFactory contract
    function initialize(address _factory) external initializer {
        if (_factory == address(0)) revert InvalidFactory();
        factory = _factory;
    }

    /*//////////////////////////////////////////////////////////////
                         EXTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @notice Creates a new challenge with USDC reward
    /// @dev Transfers tokens to contract and initializes challenge
    /// @param reward Amount of tokens to escrow (must be > 0)
    /// @param usdcToken Address of the USDC token contract
    /// @param deadline Unix timestamp when challenge expires
    /// @param description Challenge requirements (max 512 chars)
    /// @return challengeId Unique identifier for created challenge
    function createChallenge(
        uint256 reward,
        address usdcToken,
        uint256 deadline,
        string calldata description
    ) external nonReentrant returns (uint256 challengeId) {
        // Input validation
        if (reward == 0) revert ZeroReward();
        if (reward > type(uint96).max) revert ZeroReward();
        if (deadline <= block.timestamp) revert DeadlinePassed();
        if (deadline > type(uint40).max) revert DeadlinePassed();
        if (bytes(description).length > MAX_DESCRIPTION_LENGTH) {
            revert DescriptionTooLong();
        }

        // Increment counter and get ID
        unchecked {
            challengeId = ++challengeCounter;
        }

        // Initialize challenge with packed data
        challenges[challengeId] = Challenge({
            creator: msg.sender,
            status: Status.Open,
            deadline: uint40(deadline),
            submissionCount: 0,
            verifier: address(0),
            reward: uint96(reward),
            token: IERC20(usdcToken),
            winningSubmission: 0,
            description: description
        });

        // Transfer tokens to escrow
        IERC20(usdcToken).safeTransferFrom(
            msg.sender,
            address(this),
            reward
        );

        emit ChallengeCreated(
            challengeId,
            msg.sender,
            reward,
            usdcToken,
            deadline
        );
    }

    /// @notice Propose to verify a challenge
    /// @dev Records verifier interest for creator selection, requires top 10% status
    /// @param challengeId Challenge to propose for
    function proposeAsVerifier(uint256 challengeId)
        external
        challengeExists(challengeId)
        requireStatus(challengeId, Status.Open)
    {
        // Check if user is qualified to be a verifier
        if (!IChallengeFactory(factory).isQualifiedVerifier(msg.sender)) {
            revert NotQualifiedVerifier();
        }
        
        if (verifierProposals[challengeId][msg.sender]) {
            revert AlreadyProposed();
        }
        
        Challenge storage challenge = challenges[challengeId];
        if (block.timestamp > challenge.deadline) {
            revert DeadlinePassed();
        }

        verifierProposals[challengeId][msg.sender] = true;
        
        emit VerifierProposed(challengeId, msg.sender);
    }

    /// @notice Select a verifier for the challenge
    /// @dev Transitions challenge to Active status, verifies qualification
    /// @param challengeId Challenge to assign verifier
    /// @param verifier Address to select as verifier
    function selectVerifier(uint256 challengeId, address verifier)
        external
        challengeExists(challengeId)
        onlyCreator(challengeId)
        requireStatus(challengeId, Status.Open)
    {
        if (!verifierProposals[challengeId][verifier]) {
            revert NotProposed();
        }
        
        // Double-check verifier is still qualified
        if (!IChallengeFactory(factory).isQualifiedVerifier(verifier)) {
            revert NotQualifiedVerifier();
        }
        
        Challenge storage challenge = challenges[challengeId];
        if (block.timestamp > challenge.deadline) {
            revert DeadlinePassed();
        }

        challenge.verifier = verifier;
        challenge.status = Status.Active;
        
        emit VerifierSelected(challengeId, verifier);
    }

    /// @notice Submit a solution to an active challenge
    /// @dev Stores IPFS hash, database UID, and prevents duplicate submissions
    /// @param challengeId Challenge being solved
    /// @param solutionHash IPFS hash of the solution
    /// @param uid Unique identifier linking to Lean code in database
    /// @return submissionId Unique identifier for submission
    function submitSolution(
        uint256 challengeId,
        string calldata solutionHash,
        string calldata uid
    )
        external
        challengeExists(challengeId)
        requireStatus(challengeId, Status.Active)
        returns (uint256 submissionId)
    {
        if (solverSubmissions[challengeId][msg.sender] != 0) {
            revert AlreadySubmitted();
        }
        
        Challenge storage challenge = challenges[challengeId];
        if (block.timestamp > challenge.deadline) {
            revert DeadlinePassed();
        }

        unchecked {
            submissionId = ++challenge.submissionCount;
        }

        submissions[challengeId][submissionId] = Submission({
            solver: msg.sender,
            timestamp: uint96(block.timestamp),
            solutionHash: solutionHash,
            uid: uid
        });

        solverSubmissions[challengeId][msg.sender] = submissionId;
        
        emit SolutionSubmitted(
            challengeId,
            submissionId,
            msg.sender,
            solutionHash,
            uid
        );
    }

    /// @notice Verifier approves a solution
    /// @dev Sets verifier approval bit in bitmap
    /// @param challengeId Challenge containing the solution
    /// @param submissionId Submission to approve
    function approveSolution(uint256 challengeId, uint256 submissionId)
        external
        challengeExists(challengeId)
        onlyVerifier(challengeId)
        requireStatus(challengeId, Status.Active)
    {
        if (submissions[challengeId][submissionId].solver == address(0)) {
            revert SubmissionNotFound();
        }
        
        uint8 currentApprovals = approvals[challengeId][submissionId];
        if (currentApprovals & 1 != 0) {
            revert AlreadyApproved();
        }

        approvals[challengeId][submissionId] = currentApprovals | 1;
        
        emit SolutionApproved(challengeId, submissionId, msg.sender);
    }

    /// @notice Award solution with both signatures
    /// @dev Distributes rewards: 95% to winner, 5% to verifier
    /// @param challengeId Challenge to complete
    /// @param submissionId Winning submission
    function awardSolution(uint256 challengeId, uint256 submissionId)
        external
        nonReentrant
        challengeExists(challengeId)
        requireStatus(challengeId, Status.Active)
    {
        Challenge storage challenge = challenges[challengeId];
        Submission memory submission = submissions[challengeId][submissionId];
        
        if (submission.solver == address(0)) {
            revert SubmissionNotFound();
        }

        // Check creator approval
        if (msg.sender == challenge.creator) {
            uint8 currentApprovals = approvals[challengeId][submissionId];
            if (currentApprovals & 2 != 0) {
                revert AlreadyApproved();
            }
            approvals[challengeId][submissionId] = currentApprovals | 2;
            emit SolutionApproved(challengeId, submissionId, msg.sender);
        }

        // Verify both approvals exist
        uint8 finalApprovals = approvals[challengeId][submissionId];
        if (finalApprovals != 3) { // Both bits must be set
            revert MissingApprovals();
        }

        // Update state before transfers
        challenge.status = Status.Completed;
        challenge.winningSubmission = uint96(submissionId);

        // Calculate rewards
        uint256 totalReward = challenge.reward;
        uint256 verifierReward = (totalReward * VERIFIER_BPS) / 10000;
        uint256 winnerReward;
        unchecked {
            winnerReward = totalReward - verifierReward;
        }

        // Distribute rewards
        challenge.token.safeTransfer(submission.solver, winnerReward);
        challenge.token.safeTransfer(challenge.verifier, verifierReward);
        
        // Update reputation through factory
        IChallengeFactory(factory).updateReputation(
            submission.solver,
            winnerReward,
            false // not verifier
        );
        
        IChallengeFactory(factory).updateReputation(
            challenge.verifier,
            verifierReward,
            true // is verifier
        );

        emit RewardsDistributed(
            challengeId,
            submission.solver,
            challenge.verifier,
            winnerReward,
            verifierReward
        );
    }

    /// @notice Cancel challenge if no submissions exist
    /// @dev Returns escrowed funds to creator
    /// @param challengeId Challenge to cancel
    function cancelChallenge(uint256 challengeId)
        external
        nonReentrant
        challengeExists(challengeId)
        onlyCreator(challengeId)
    {
        Challenge storage challenge = challenges[challengeId];
        
        // Can only cancel Open challenges or Active with no submissions
        if (challenge.status == Status.Completed ||
            challenge.status == Status.Cancelled) {
            revert InvalidStatus();
        }
        
        if (challenge.status == Status.Active && 
            challenge.submissionCount > 0) {
            revert InvalidStatus();
        }

        // Update state before transfer
        uint256 refundAmount = challenge.reward;
        challenge.status = Status.Cancelled;
        challenge.reward = 0;

        // Refund creator
        challenge.token.safeTransfer(msg.sender, refundAmount);

        emit ChallengeCancelled(challengeId, refundAmount);
    }

    /// @notice Emergency withdrawal after deadline + grace period
    /// @dev Allows creator to recover funds if challenge stalls
    /// @param challengeId Challenge to withdraw from
    function emergencyWithdraw(uint256 challengeId)
        external
        nonReentrant
        challengeExists(challengeId)
        onlyCreator(challengeId)
    {
        Challenge storage challenge = challenges[challengeId];
        
        if (challenge.status == Status.Completed ||
            challenge.status == Status.Cancelled) {
            revert InvalidStatus();
        }

        uint256 withdrawTime = challenge.deadline + GRACE_PERIOD;
        if (block.timestamp < withdrawTime) {
            revert GracePeriodActive();
        }

        // Update state before transfer
        uint256 refundAmount = challenge.reward;
        challenge.status = Status.Cancelled;
        challenge.reward = 0;

        // Refund creator
        challenge.token.safeTransfer(msg.sender, refundAmount);

        emit ChallengeCancelled(challengeId, refundAmount);
    }

    /*//////////////////////////////////////////////////////////////
                          VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @notice Get current challenge counter
    /// @dev Returns the number of challenges created
    /// @return Current challenge counter value
    function getChallengeCounter() external view returns (uint256) {
        return challengeCounter;
    }

    /// @notice Check if address has proposed for a challenge
    /// @dev Queries the verifier proposals mapping
    /// @param challengeId Challenge to check
    /// @param verifier Address to check proposal status
    /// @return Whether the address has proposed
    function hasProposed(uint256 challengeId, address verifier)
        external
        view
        returns (bool)
    {
        return verifierProposals[challengeId][verifier];
    }

    /// @notice Get approval status for a submission
    /// @dev Decodes the approval bitmap
    /// @param challengeId Challenge containing submission
    /// @param submissionId Submission to check
    /// @return verifierApproved Whether verifier approved
    /// @return creatorApproved Whether creator approved
    function getApprovalStatus(uint256 challengeId, uint256 submissionId)
        external
        view
        returns (bool verifierApproved, bool creatorApproved)
    {
        uint8 approvalBits = approvals[challengeId][submissionId];
        verifierApproved = (approvalBits & 1) != 0;
        creatorApproved = (approvalBits & 2) != 0;
    }

    /// @notice Calculate reward distribution for a challenge
    /// @dev Returns the amounts that would be paid out
    /// @param challengeId Challenge to calculate for
    /// @return winnerAmount Amount winner would receive
    /// @return verifierAmount Amount verifier would receive
    function calculateRewards(uint256 challengeId)
        external
        view
        returns (uint256 winnerAmount, uint256 verifierAmount)
    {
        uint256 totalReward = challenges[challengeId].reward;
        verifierAmount = (totalReward * VERIFIER_BPS) / 10000;
        unchecked {
            winnerAmount = totalReward - verifierAmount;
        }
    }

    /// @notice Check if emergency withdrawal is available
    /// @dev Verifies grace period has passed
    /// @param challengeId Challenge to check
    /// @return Whether emergency withdrawal can be executed
    function canEmergencyWithdraw(uint256 challengeId)
        external
        view
        returns (bool)
    {
        Challenge memory challenge = challenges[challengeId];
        
        if (challenge.status == Status.Completed ||
            challenge.status == Status.Cancelled) {
            return false;
        }

        return block.timestamp >= challenge.deadline + GRACE_PERIOD;
    }

    /// @notice Get the creator of the first challenge
    /// @dev Helper function for factory to identify deployer
    /// @return Creator address of the first challenge, or zero if none exist
    function getChallengeCreator() external view returns (address) {
        if (challengeCounter > 0) {
            return challenges[1].creator;
        }
        return address(0);
    }

    /// @notice Get submission details including UID
    /// @dev Returns full submission data for database linkage
    /// @param challengeId Challenge containing the submission
    /// @param submissionId Submission to retrieve
    /// @return solver Address that submitted the solution
    /// @return timestamp When the solution was submitted
    /// @return solutionHash IPFS hash of the solution
    /// @return uid Database unique identifier
    function getSubmission(uint256 challengeId, uint256 submissionId)
        external
        view
        returns (
            address solver,
            uint96 timestamp,
            string memory solutionHash,
            string memory uid
        )
    {
        Submission memory submission = submissions[challengeId][submissionId];
        return (
            submission.solver,
            submission.timestamp,
            submission.solutionHash,
            submission.uid
        );
    }
}
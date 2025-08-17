// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @title ChallengeFactory - Gas-optimized factory for ChallengeEscrow deployment
/// @author Cyrup Protocol
/// @notice Deploys and manages ChallengeEscrow contracts with reputation integration
/// @dev Uses clone pattern for cheap deployments and packed storage for gas efficiency

import {ChallengeEscrow} from "./ChallengeEscrow.sol";
import {ReputationSystem} from "./ReputationSystem.sol";
import {Clones} from "lib/openzeppelin-contracts/contracts/proxy/Clones.sol";

contract ChallengeFactory {
    using Clones for address;

    /*//////////////////////////////////////////////////////////////
                                CONSTANTS
    //////////////////////////////////////////////////////////////*/

    /// @notice Maximum challenges that can be retrieved in a single query
    /// @dev Prevents out-of-gas errors in view functions
    uint256 private constant MAX_QUERY_SIZE = 100;

    /*//////////////////////////////////////////////////////////////
                            CUSTOM ERRORS
    //////////////////////////////////////////////////////////////*/

    /// @custom:error Thrown when caller is not a deployed challenge contract
    error NotChallengeContract();
    
    /// @custom:error Thrown when reputation system address is zero
    error InvalidReputationSystem();
    
    /// @custom:error Thrown when user address is zero
    error InvalidUser();
    
    /// @custom:error Thrown when amount is zero
    error InvalidAmount();
    
    /// @custom:error Thrown when query limit exceeds maximum
    error ExcessiveQuerySize();
    
    /// @custom:error Thrown when index is out of bounds
    error IndexOutOfBounds();
    
    /// @custom:error Thrown when reputation system has already been set
    error ReputationSystemAlreadySet();
    
    /// @custom:error Thrown when reputation system has not been set
    error ReputationSystemNotSet();

    /*//////////////////////////////////////////////////////////////
                              STORAGE
    //////////////////////////////////////////////////////////////*/

    /// @notice ReputationSystem contract for managing user reputation
    /// @dev Settable once after deployment to resolve circular dependency
    address public reputationSystem;

    /// @notice Implementation contract for cloning
    /// @dev Immutable reference to the ChallengeEscrow implementation
    address public immutable challengeImplementation;

    /// @notice Counter for deployed challenges
    /// @dev Using uint96 for gas efficiency while supporting 79 septillion challenges
    uint96 private challengeCounter;

    /// @notice Array of all deployed challenge contracts
    /// @dev Used for enumeration and tracking
    address[] public deployedChallenges;

    /// @notice Mapping to check if address is a deployed challenge
    /// @dev O(1) verification of legitimate challenge contracts
    mapping(address => bool) public isChallengeContract;

    /// @notice Mapping of creator to their deployed challenges
    /// @dev Enables efficient user-specific queries
    mapping(address => address[]) public challengesByCreator;

    /// @notice Mapping of challenge contract to its index in deployedChallenges
    /// @dev Enables O(1) lookups for challenge metadata
    mapping(address => uint256) private challengeIndex;

    /*//////////////////////////////////////////////////////////////
                              EVENTS
    //////////////////////////////////////////////////////////////*/

    /// @notice Emitted when a new challenge contract is deployed
    /// @param challenge Address of the deployed challenge contract
    /// @param creator Address that created the challenge
    /// @param challengeId Sequential ID of the challenge
    /// @param timestamp Block timestamp of deployment
    event ChallengeDeployed(
        address indexed challenge,
        address indexed creator,
        uint256 indexed challengeId,
        uint256 timestamp
    );

    /// @notice Emitted when reputation is updated through the factory
    /// @param challenge Challenge contract that triggered the update
    /// @param user User whose reputation was updated
    /// @param amount USDC amount for reputation calculation
    /// @param isVerifier Whether the user was a verifier
    event ReputationUpdated(
        address indexed challenge,
        address indexed user,
        uint256 amount,
        bool isVerifier
    );

    /// @notice Emitted when reputation system is set
    /// @param reputationSystem Address of the reputation system contract
    event ReputationSystemSet(address indexed reputationSystem);

    /*//////////////////////////////////////////////////////////////
                            MODIFIERS
    //////////////////////////////////////////////////////////////*/

    /// @notice Ensures caller is a deployed challenge contract
    /// @dev Uses mapping for O(1) verification
    modifier onlyChallenge() {
        if (!isChallengeContract[msg.sender]) {
            revert NotChallengeContract();
        }
        _;
    }

    /*//////////////////////////////////////////////////////////////
                            CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    /// @notice Initialize factory with ChallengeEscrow implementation
    /// @dev Deploys implementation and allows reputation system to be set later
    constructor() {
        // Deploy implementation contract for cloning
        challengeImplementation = address(new ChallengeEscrow());
        // ReputationSystem will be set via setReputationSystem after deployment
    }

    /*//////////////////////////////////////////////////////////////
                         EXTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @notice Set the ReputationSystem contract address
    /// @dev Can only be called once when reputationSystem is address(0)
    /// @param _reputationSystem Address of the ReputationSystem contract
    function setReputationSystem(address _reputationSystem) external {
        // Check if already set
        if (reputationSystem != address(0)) {
            revert ReputationSystemAlreadySet();
        }
        
        // Validate input
        if (_reputationSystem == address(0)) {
            revert InvalidReputationSystem();
        }
        
        // Set the reputation system
        reputationSystem = _reputationSystem;
        
        emit ReputationSystemSet(_reputationSystem);
    }

    /// @notice Deploy a new ChallengeEscrow contract
    /// @dev Uses CREATE2 for deterministic addresses and clone pattern for gas efficiency
    /// @param salt Unique salt for CREATE2 deployment
    /// @return challenge Address of the deployed challenge contract
    function deployChallenge(bytes32 salt) 
        external 
        returns (address challenge) 
    {
        // Deploy clone with CREATE2 for deterministic address
        challenge = challengeImplementation.cloneDeterministic(salt);
        
        // Initialize the challenge with factory address
        ChallengeEscrow(challenge).initialize(address(this));
        
        // Update state
        unchecked {
            uint256 id = ++challengeCounter;
            
            // Track deployment
            deployedChallenges.push(challenge);
            isChallengeContract[challenge] = true;
            challengesByCreator[msg.sender].push(challenge);
            challengeIndex[challenge] = deployedChallenges.length - 1;
            
            emit ChallengeDeployed(
                challenge,
                msg.sender,
                id,
                block.timestamp
            );
        }
    }

    /// @notice Deploy challenge with computed salt
    /// @dev Convenience function that computes salt from sender and nonce
    /// @param nonce Unique nonce for this deployer
    /// @return challenge Address of the deployed challenge contract
    function deployChallenge(uint256 nonce) 
        external 
        returns (address challenge) 
    {
        bytes32 salt = keccak256(abi.encodePacked(msg.sender, nonce));
        
        // Deploy clone with computed salt
        challenge = challengeImplementation.cloneDeterministic(salt);
        
        // Initialize the challenge with factory address
        ChallengeEscrow(challenge).initialize(address(this));
        
        // Update state
        unchecked {
            uint256 id = ++challengeCounter;
            
            // Track deployment
            deployedChallenges.push(challenge);
            isChallengeContract[challenge] = true;
            challengesByCreator[msg.sender].push(challenge);
            challengeIndex[challenge] = deployedChallenges.length - 1;
            
            emit ChallengeDeployed(
                challenge,
                msg.sender,
                id,
                block.timestamp
            );
        }
    }

    /// @notice Update reputation for a user
    /// @dev Called by challenge contracts when rewards are distributed
    /// @param user Address to update reputation for
    /// @param usdcAmount USDC amount for reputation calculation
    /// @param isVerifier Whether the user was a verifier
    function updateReputation(
        address user,
        uint256 usdcAmount,
        bool isVerifier
    ) external onlyChallenge {
        // Check reputation system is set
        if (reputationSystem == address(0)) revert ReputationSystemNotSet();
        if (user == address(0)) revert InvalidUser();
        if (usdcAmount == 0) revert InvalidAmount();
        
        // Forward to reputation system
        ReputationSystem(reputationSystem).updateReputation(
            user,
            usdcAmount,
            isVerifier
        );
        
        emit ReputationUpdated(msg.sender, user, usdcAmount, isVerifier);
    }

    /// @notice Check if a user qualifies as a verifier
    /// @dev Queries reputation system for top 10% status
    /// @param user Address to check qualification
    /// @return qualified Whether user is in top 10%
    function isQualifiedVerifier(address user) 
        external 
        view 
        returns (bool qualified) 
    {
        // Check reputation system is set
        if (reputationSystem == address(0)) revert ReputationSystemNotSet();
        return ReputationSystem(reputationSystem).isQualifiedVerifier(user);
    }

    /*//////////////////////////////////////////////////////////////
                          VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @notice Check if reputation system has been set
    /// @dev Returns true if reputation system address is non-zero
    /// @return True if reputation system is configured
    function isReputationSystemSet() external view returns (bool) {
        return reputationSystem != address(0);
    }

    /// @notice Get total number of deployed challenges
    /// @dev Returns the length of deployedChallenges array
    /// @return Total number of challenges deployed
    function getTotalChallenges() external view returns (uint256) {
        return deployedChallenges.length;
    }

    /// @notice Get challenge counter value
    /// @dev Returns the current counter used for challenge IDs
    /// @return Current challenge counter
    function getChallengeCounter() external view returns (uint256) {
        return challengeCounter;
    }

    /// @notice Get challenges deployed by a specific creator
    /// @dev Returns array of challenge addresses for a creator
    /// @param creator Address to query challenges for
    /// @return Array of challenge contract addresses
    function getChallengesByCreator(address creator) 
        external 
        view 
        returns (address[] memory) 
    {
        return challengesByCreator[creator];
    }

    /// @notice Get a paginated list of deployed challenges
    /// @dev Supports pagination to avoid gas limits
    /// @param offset Starting index for pagination
    /// @param limit Maximum number of challenges to return
    /// @return challenges Array of challenge addresses
    function getDeployedChallenges(uint256 offset, uint256 limit) 
        external 
        view 
        returns (address[] memory challenges) 
    {
        if (limit > MAX_QUERY_SIZE) revert ExcessiveQuerySize();
        
        uint256 total = deployedChallenges.length;
        if (offset >= total) revert IndexOutOfBounds();
        
        uint256 end = offset + limit;
        if (end > total) {
            end = total;
        }
        
        uint256 size = end - offset;
        challenges = new address[](size);
        
        for (uint256 i; i < size;) {
            challenges[i] = deployedChallenges[offset + i];
            unchecked {
                ++i;
            }
        }
    }

    /// @notice Compute deployment address for a challenge
    /// @dev Predicts address before deployment using CREATE2
    /// @param salt Salt for CREATE2 deployment
    /// @return predicted The address where challenge would be deployed
    function computeChallengeAddress(bytes32 salt) 
        external 
        view 
        returns (address predicted) 
    {
        return challengeImplementation.predictDeterministicAddress(salt);
    }

    /// @notice Compute deployment address with nonce
    /// @dev Convenience function for address prediction
    /// @param deployer Address that will deploy the challenge
    /// @param nonce Nonce for salt computation
    /// @return predicted The address where challenge would be deployed
    function computeChallengeAddress(address deployer, uint256 nonce) 
        external 
        view 
        returns (address predicted) 
    {
        bytes32 salt = keccak256(abi.encodePacked(deployer, nonce));
        return challengeImplementation.predictDeterministicAddress(salt);
    }

    /// @notice Get challenge metadata
    /// @dev Returns basic info about a deployed challenge
    /// @param challenge Address of the challenge contract
    /// @return isValid Whether this is a valid challenge contract
    /// @return index Index in deployedChallenges array
    /// @return creator Original deployer of the challenge
    function getChallengeMetadata(address challenge) 
        external 
        view 
        returns (
            bool isValid,
            uint256 index,
            address creator
        ) 
    {
        isValid = isChallengeContract[challenge];
        if (isValid) {
            index = challengeIndex[challenge];
            // Get creator from the challenge contract
            creator = ChallengeEscrow(challenge).getChallengeCreator();
        }
    }

    /// @notice Check if challenges were deployed by this factory
    /// @dev Batch verification for multiple addresses
    /// @param challenges Array of addresses to verify
    /// @return validities Array of boolean values indicating validity
    function areChallengesValid(address[] calldata challenges) 
        external 
        view 
        returns (bool[] memory validities) 
    {
        uint256 length = challenges.length;
        validities = new bool[](length);
        
        for (uint256 i; i < length;) {
            validities[i] = isChallengeContract[challenges[i]];
            unchecked {
                ++i;
            }
        }
    }

    /// @notice Get recent challenges
    /// @dev Returns the most recently deployed challenges
    /// @param count Number of recent challenges to return (max 100)
    /// @return challenges Array of challenge addresses
    function getRecentChallenges(uint256 count) 
        external 
        view 
        returns (address[] memory challenges) 
    {
        if (count > MAX_QUERY_SIZE) revert ExcessiveQuerySize();
        
        uint256 total = deployedChallenges.length;
        if (count > total) {
            count = total;
        }
        
        challenges = new address[](count);
        uint256 startIndex = total - count;
        
        for (uint256 i; i < count;) {
            challenges[i] = deployedChallenges[startIndex + i];
            unchecked {
                ++i;
            }
        }
    }
}
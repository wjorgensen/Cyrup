// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @title ReputationSystem - Ultra-optimized on-chain reputation tracking
/// @author Cyrup Protocol
/// @notice Manages user reputation based on USDC rewards with dynamic top 10% tracking
/// @dev Implements packed storage, custom errors, and efficient threshold algorithms

/*//////////////////////////////////////////////////////////////
                            CONSTANTS
//////////////////////////////////////////////////////////////*/

/// @dev Verifier points multiplier (20% of winner points)
uint256 constant VERIFIER_MULTIPLIER = 2000; // 20% in basis points

/// @dev Basis points denominator
uint256 constant BPS = 10000;

/// @dev Maximum users in leaderboard query
uint256 constant MAX_LEADERBOARD_SIZE = 100;

/// @dev Threshold update frequency (every N users)
uint256 constant THRESHOLD_UPDATE_INTERVAL = 10;

/// @dev Top percentage for verifier qualification (10%)
uint256 constant TOP_PERCENTAGE = 10;

/*//////////////////////////////////////////////////////////////
                        CUSTOM ERRORS
//////////////////////////////////////////////////////////////*/

/// @custom:error Thrown when caller is not authorized
error Unauthorized();

/// @custom:error Thrown when user address is zero
error InvalidUser();

/// @custom:error Thrown when amount is zero
error InvalidAmount();

/// @custom:error Thrown when leaderboard limit exceeds maximum
error ExcessiveLimit();

/// @custom:error Thrown when array lengths mismatch
error LengthMismatch();

contract ReputationSystem {
    /*//////////////////////////////////////////////////////////////
                              STRUCTS
    //////////////////////////////////////////////////////////////*/

    /// @notice User reputation data
    /// @dev Packed into 2 storage slots
    struct UserReputation {
        uint128 totalPoints;      // Slot 1: 16 bytes (sufficient for massive point values)
        uint64 challengeCount;     // Slot 1: 8 bytes (18 quintillion challenges)
        uint64 lastUpdateBlock;    // Slot 1: 8 bytes (block number)
        
        uint128 verifierPoints;    // Slot 2: 16 bytes (points earned as verifier)
        uint64 winnerCount;        // Slot 2: 8 bytes (challenges won)
        uint64 verifierCount;      // Slot 2: 8 bytes (challenges verified)
    }

    /// @notice Tier configuration for point calculation
    /// @dev Immutable after deployment for gas efficiency
    struct Tier {
        uint96 maxAmount;   // Maximum USDC for this tier (12 bytes)
        uint80 winnerPoints;   // Points for winner (10 bytes)
        uint80 verifierPoints; // Points for verifier (10 bytes)
    }

    /*//////////////////////////////////////////////////////////////
                              STORAGE
    //////////////////////////////////////////////////////////////*/

    /// @notice Address authorized to update reputation (ChallengeFactory)
    address public immutable challengeFactory;

    /// @notice Total number of users with reputation
    uint256 public totalUsers;

    /// @notice Current threshold for top 10% qualification
    uint128 public top10Threshold;

    /// @notice Last user count when threshold was updated
    uint256 private lastThresholdUpdate;

    /// @notice User address => reputation data
    mapping(address => UserReputation) public userReputation;

    /// @notice Sorted array of top performers (addresses)
    /// @dev Limited size for gas efficiency
    address[] private topPerformers;

    /// @notice Points => users at that level (for threshold calculation)
    /// @dev Used for efficient percentile tracking
    mapping(uint128 => uint256) private pointsDistribution;

    /// @notice User => index in topPerformers + 1 (0 = not in array)
    mapping(address => uint256) private topPerformerIndex;

    /// @notice Point calculation tiers
    /// @dev Stored in code for gas efficiency
    Tier[4] private tiers;

    /*//////////////////////////////////////////////////////////////
                              EVENTS
    //////////////////////////////////////////////////////////////*/

    /// @notice Emitted when reputation is updated
    /// @param user Address whose reputation changed
    /// @param pointsAdded Points added in this update
    /// @param totalPoints New total points
    /// @param isVerifier Whether points were earned as verifier
    event ReputationUpdated(
        address indexed user,
        uint256 pointsAdded,
        uint256 totalPoints,
        bool isVerifier
    );

    /// @notice Emitted when top 10% threshold changes
    /// @param oldThreshold Previous threshold value
    /// @param newThreshold New threshold value
    /// @param totalUsers Current total user count
    event ThresholdUpdated(
        uint256 oldThreshold,
        uint256 newThreshold,
        uint256 totalUsers
    );

    /// @notice Emitted when user enters top performers list
    /// @param user Address entering the list
    /// @param position Position in the list
    event EnteredTopPerformers(
        address indexed user,
        uint256 position
    );

    /*//////////////////////////////////////////////////////////////
                            CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    /// @notice Initialize reputation system with factory address
    /// @dev Sets up immutable tier configuration for gas efficiency
    /// @param _challengeFactory Address of the ChallengeFactory contract
    constructor(address _challengeFactory) {
        if (_challengeFactory == address(0)) revert InvalidUser();
        challengeFactory = _challengeFactory;

        // Initialize tier configuration (immutable after deployment)
        tiers[0] = Tier({
            maxAmount: 100e6,      // 0-100 USDC (6 decimals)
            winnerPoints: 10,
            verifierPoints: 2
        });
        
        tiers[1] = Tier({
            maxAmount: 500e6,      // 100-500 USDC
            winnerPoints: 50,
            verifierPoints: 10
        });
        
        tiers[2] = Tier({
            maxAmount: 1000e6,     // 500-1000 USDC
            winnerPoints: 100,
            verifierPoints: 20
        });
        
        tiers[3] = Tier({
            maxAmount: type(uint96).max, // 1000+ USDC
            winnerPoints: 200,
            verifierPoints: 40
        });
    }

    /*//////////////////////////////////////////////////////////////
                            MODIFIERS
    //////////////////////////////////////////////////////////////*/

    /// @notice Ensures caller is the authorized ChallengeFactory
    /// @dev Uses immutable for gas efficiency
    modifier onlyFactory() {
        if (msg.sender != challengeFactory) revert Unauthorized();
        _;
    }

    /*//////////////////////////////////////////////////////////////
                         EXTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @notice Update user reputation after challenge completion
    /// @dev Called by ChallengeFactory when rewards are distributed
    /// @param user Address to update reputation for
    /// @param usdcAmount USDC reward amount (6 decimals)
    /// @param isVerifier Whether user was verifier (true) or winner (false)
    function updateReputation(
        address user,
        uint256 usdcAmount,
        bool isVerifier
    ) external onlyFactory {
        if (user == address(0)) revert InvalidUser();
        if (usdcAmount == 0) revert InvalidAmount();

        // Calculate points based on tier
        uint256 pointsToAdd = calculatePoints(usdcAmount, isVerifier);
        
        // Load user data (single SLOAD)
        UserReputation storage rep = userReputation[user];
        
        // Track new user
        if (rep.totalPoints == 0 && rep.challengeCount == 0) {
            unchecked {
                ++totalUsers;
            }
        }

        // Update reputation (packed struct minimizes SSTOREs)
        uint128 oldPoints = rep.totalPoints;
        uint128 newPoints;
        unchecked {
            newPoints = oldPoints + uint128(pointsToAdd);
            rep.totalPoints = newPoints;
            ++rep.challengeCount;
            rep.lastUpdateBlock = uint64(block.number);
            
            if (isVerifier) {
                rep.verifierPoints += uint128(pointsToAdd);
                ++rep.verifierCount;
            } else {
                ++rep.winnerCount;
            }
        }

        // Update points distribution for threshold tracking
        if (oldPoints > 0) {
            unchecked {
                --pointsDistribution[oldPoints];
            }
        }
        unchecked {
            ++pointsDistribution[newPoints];
        }

        // Update top performers if qualified
        _updateTopPerformers(user, newPoints);

        // Periodically update threshold
        if (totalUsers > lastThresholdUpdate + THRESHOLD_UPDATE_INTERVAL) {
            _updateThreshold();
        }

        emit ReputationUpdated(user, pointsToAdd, newPoints, isVerifier);
    }

    /// @notice Batch update reputation for multiple users
    /// @dev Gas-efficient bulk operation for protocol upgrades
    /// @param users Array of user addresses
    /// @param amounts Array of USDC amounts
    /// @param isVerifiers Array of verifier flags
    function batchUpdateReputation(
        address[] calldata users,
        uint256[] calldata amounts,
        bool[] calldata isVerifiers
    ) external onlyFactory {
        uint256 length = users.length;
        if (length != amounts.length || length != isVerifiers.length) {
            revert LengthMismatch();
        }

        for (uint256 i; i < length;) {
            // Inline update logic for gas efficiency
            address user = users[i];
            if (user != address(0) && amounts[i] > 0) {
                uint256 pointsToAdd = calculatePoints(amounts[i], isVerifiers[i]);
                UserReputation storage rep = userReputation[user];
                
                if (rep.totalPoints == 0 && rep.challengeCount == 0) {
                    unchecked {
                        ++totalUsers;
                    }
                }

                unchecked {
                    rep.totalPoints += uint128(pointsToAdd);
                    ++rep.challengeCount;
                    rep.lastUpdateBlock = uint64(block.number);
                    
                    if (isVerifiers[i]) {
                        rep.verifierPoints += uint128(pointsToAdd);
                        ++rep.verifierCount;
                    } else {
                        ++rep.winnerCount;
                    }
                }

                emit ReputationUpdated(user, pointsToAdd, rep.totalPoints, isVerifiers[i]);
            }
            
            unchecked {
                ++i;
            }
        }

        // Single threshold update after batch
        if (totalUsers > lastThresholdUpdate + THRESHOLD_UPDATE_INTERVAL) {
            _updateThreshold();
        }
    }

    /// @notice Force threshold recalculation
    /// @dev Public function for manual threshold updates
    function updateTop10Threshold() external {
        _updateThreshold();
    }

    /*//////////////////////////////////////////////////////////////
                          VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @notice Calculate points for a given USDC amount
    /// @dev Pure function for external point calculation
    /// @param usdcAmount USDC amount (6 decimals)
    /// @param isVerifier Whether calculating for verifier
    /// @return points Points to be awarded
    function calculatePoints(
        uint256 usdcAmount,
        bool isVerifier
    ) public pure returns (uint256 points) {
        // Tier 0: 0-100 USDC
        if (usdcAmount <= 100e6) {
            return isVerifier ? 2 : 10;
        }
        // Tier 1: 100-500 USDC
        else if (usdcAmount <= 500e6) {
            return isVerifier ? 10 : 50;
        }
        // Tier 2: 500-1000 USDC
        else if (usdcAmount <= 1000e6) {
            return isVerifier ? 20 : 100;
        }
        // Tier 3: 1000+ USDC
        else {
            return isVerifier ? 40 : 200;
        }
    }

    /// @notice Check if user qualifies as top 10% verifier
    /// @dev Compares user points against current threshold
    /// @param user Address to check
    /// @return qualified Whether user is in top 10%
    function isQualifiedVerifier(address user) external view returns (bool qualified) {
        return userReputation[user].totalPoints >= top10Threshold;
    }

    /// @notice Get complete reputation data for a user
    /// @dev Returns all reputation fields in a single call
    /// @param user Address to query
    /// @return totalPoints Total reputation points
    /// @return challengeCount Total challenges participated
    /// @return winnerCount Challenges won
    /// @return verifierCount Challenges verified
    /// @return verifierPoints Points earned as verifier
    /// @return lastUpdate Block number of last update
    function getUserReputation(address user) external view returns (
        uint256 totalPoints,
        uint256 challengeCount,
        uint256 winnerCount,
        uint256 verifierCount,
        uint256 verifierPoints,
        uint256 lastUpdate
    ) {
        UserReputation memory rep = userReputation[user];
        return (
            rep.totalPoints,
            rep.challengeCount,
            rep.winnerCount,
            rep.verifierCount,
            rep.verifierPoints,
            rep.lastUpdateBlock
        );
    }

    /// @notice Get leaderboard of top users
    /// @dev Returns sorted list up to limit or MAX_LEADERBOARD_SIZE
    /// @param limit Maximum users to return
    /// @return users Array of user addresses
    /// @return points Array of corresponding point values
    function getLeaderboard(uint256 limit) external view returns (
        address[] memory users,
        uint256[] memory points
    ) {
        if (limit > MAX_LEADERBOARD_SIZE) revert ExcessiveLimit();
        
        uint256 count = topPerformers.length;
        if (count == 0) return (users, points);
        
        uint256 returnCount = limit < count ? limit : count;
        users = new address[](returnCount);
        points = new uint256[](returnCount);
        
        for (uint256 i; i < returnCount;) {
            users[i] = topPerformers[i];
            points[i] = userReputation[topPerformers[i]].totalPoints;
            unchecked {
                ++i;
            }
        }
    }

    /// @notice Get total number of users with reputation
    /// @dev Returns the count of unique users
    /// @return count Total user count
    function getTotalUsers() external view returns (uint256 count) {
        return totalUsers;
    }

    /// @notice Get current top 10% threshold
    /// @dev Returns minimum points needed for verifier qualification
    /// @return threshold Minimum points for top 10%
    function getTop10Threshold() external view returns (uint256 threshold) {
        return top10Threshold;
    }

    /// @notice Check if user is in top performers list
    /// @dev O(1) lookup using index mapping
    /// @param user Address to check
    /// @return isTop Whether user is in top performers
    /// @return position Position in list (0 if not in list)
    function isTopPerformer(address user) external view returns (bool isTop, uint256 position) {
        position = topPerformerIndex[user];
        isTop = position > 0;
        if (isTop) {
            unchecked {
                --position; // Convert to 0-based index
            }
        }
    }

    /*//////////////////////////////////////////////////////////////
                         INTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @notice Update top performers list
    /// @dev Maintains sorted list of top 100 users
    /// @param user User to potentially add/update
    /// @param newPoints User's new point total
    function _updateTopPerformers(address user, uint128 newPoints) private {
        uint256 currentIndex = topPerformerIndex[user];
        
        // If list isn't full and user not in list, add them
        if (topPerformers.length < MAX_LEADERBOARD_SIZE) {
            if (currentIndex == 0) {
                topPerformers.push(user);
                topPerformerIndex[user] = topPerformers.length;
                
                // Sort position
                _sortTopPerformer(topPerformers.length - 1);
                
                emit EnteredTopPerformers(user, topPerformers.length - 1);
            } else {
                // User already in list, resort
                _sortTopPerformer(currentIndex - 1);
            }
        }
        // List is full - check if user qualifies
        else if (currentIndex > 0) {
            // User already in list, resort
            _sortTopPerformer(currentIndex - 1);
        }
        else {
            // Check if user beats lowest performer
            address lowestPerformer = topPerformers[MAX_LEADERBOARD_SIZE - 1];
            if (newPoints > userReputation[lowestPerformer].totalPoints) {
                // Replace lowest performer
                topPerformerIndex[lowestPerformer] = 0;
                topPerformers[MAX_LEADERBOARD_SIZE - 1] = user;
                topPerformerIndex[user] = MAX_LEADERBOARD_SIZE;
                
                // Sort into position
                _sortTopPerformer(MAX_LEADERBOARD_SIZE - 1);
                
                emit EnteredTopPerformers(user, MAX_LEADERBOARD_SIZE - 1);
            }
        }
    }

    /// @notice Sort a user into correct position in top performers
    /// @dev Bubble sort single element for gas efficiency
    /// @param index Starting index to sort from
    function _sortTopPerformer(uint256 index) private {
        address user = topPerformers[index];
        uint128 userPoints = userReputation[user].totalPoints;
        
        // Bubble up
        while (index > 0) {
            address prevUser = topPerformers[index - 1];
            uint128 prevPoints = userReputation[prevUser].totalPoints;
            
            if (userPoints <= prevPoints) break;
            
            // Swap
            topPerformers[index] = prevUser;
            topPerformers[index - 1] = user;
            topPerformerIndex[prevUser] = index + 1;
            topPerformerIndex[user] = index;
            
            unchecked {
                --index;
            }
        }
    }

    /// @notice Recalculate top 10% threshold
    /// @dev Efficient algorithm using top performers list
    function _updateThreshold() private {
        if (totalUsers == 0) return;
        
        uint256 oldThreshold = top10Threshold;
        
        // For small user counts, use top performer if available
        if (totalUsers <= 10) {
            top10Threshold = topPerformers.length > 0 
                ? userReputation[topPerformers[0]].totalPoints 
                : 1;
        } else {
            // Calculate position for top 10%
            uint256 top10Position = totalUsers / 10;
            
            // Use top performers list for threshold
            if (top10Position < topPerformers.length) {
                top10Threshold = userReputation[topPerformers[top10Position]].totalPoints;
            } else {
                // Fallback: use last in top performers
                uint256 lastIndex = topPerformers.length;
                if (lastIndex > 0) {
                    unchecked {
                        --lastIndex;
                    }
                    top10Threshold = userReputation[topPerformers[lastIndex]].totalPoints;
                }
            }
        }
        
        lastThresholdUpdate = totalUsers;
        
        if (oldThreshold != top10Threshold) {
            emit ThresholdUpdated(oldThreshold, top10Threshold, totalUsers);
        }
    }
}
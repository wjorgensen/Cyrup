// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @title Gas Benchmark for ReputationSystem
/// @notice Compares gas usage of optimized vs standard implementations
/// @dev Demonstrates gas savings from optimization techniques

import "forge-std/Test.sol";
import "../src/ReputationSystem.sol";

contract GasBenchmarkTest is Test {
    ReputationSystem public optimizedSystem;
    UnoptimizedReputation public unoptimizedSystem;
    
    address public escrow = address(this);
    address public alice = address(0x1);
    address public bob = address(0x2);
    
    function setUp() public {
        optimizedSystem = new ReputationSystem(escrow);
        unoptimizedSystem = new UnoptimizedReputation(escrow);
    }
    
    function testCompareFirstUpdate() public {
        console.log("\n=== First User Update Comparison ===");
        
        // Optimized version
        uint256 gasStart = gasleft();
        optimizedSystem.updateReputation(alice, 500e6, false);
        uint256 optimizedGas = gasStart - gasleft();
        
        // Unoptimized version
        gasStart = gasleft();
        unoptimizedSystem.updateReputation(bob, 500e6, false);
        uint256 unoptimizedGas = gasStart - gasleft();
        
        console.log("Optimized:  ", optimizedGas, "gas");
        console.log("Unoptimized:", unoptimizedGas, "gas");
        console.log("Note: Optimized version includes advanced features:");
        console.log("      - Top performer tracking");
        console.log("      - Threshold calculation");
        console.log("      - Points distribution tracking");
    }
    
    function testCompareSubsequentUpdate() public {
        // Setup initial state
        optimizedSystem.updateReputation(alice, 100e6, false);
        unoptimizedSystem.updateReputation(alice, 100e6, false);
        
        console.log("\n=== Subsequent Update Comparison ===");
        
        // Optimized version
        uint256 gasStart = gasleft();
        optimizedSystem.updateReputation(alice, 500e6, true);
        uint256 optimizedGas = gasStart - gasleft();
        
        // Unoptimized version
        gasStart = gasleft();
        unoptimizedSystem.updateReputation(alice, 500e6, true);
        uint256 unoptimizedGas = gasStart - gasleft();
        
        console.log("Optimized:  ", optimizedGas, "gas");
        console.log("Unoptimized:", unoptimizedGas, "gas");
        console.log("Savings:    ", unoptimizedGas - optimizedGas, "gas");
        console.log("Reduction:  ", ((unoptimizedGas - optimizedGas) * 100) / unoptimizedGas, "%");
    }
    
    function testCompareBatchUpdate() public {
        console.log("\n=== Batch Update Comparison (10 users) ===");
        
        address[] memory users = new address[](10);
        uint256[] memory amounts = new uint256[](10);
        bool[] memory isVerifiers = new bool[](10);
        
        for (uint256 i = 0; i < 10; i++) {
            users[i] = address(uint160(i + 100));
            amounts[i] = (i + 1) * 100e6;
            isVerifiers[i] = i % 2 == 0;
        }
        
        // Optimized batch
        uint256 gasStart = gasleft();
        optimizedSystem.batchUpdateReputation(users, amounts, isVerifiers);
        uint256 optimizedGas = gasStart - gasleft();
        
        // Unoptimized individual updates
        gasStart = gasleft();
        for (uint256 i = 0; i < 10; i++) {
            unoptimizedSystem.updateReputation(users[i], amounts[i], isVerifiers[i]);
        }
        uint256 unoptimizedGas = gasStart - gasleft();
        
        console.log("Optimized batch:", optimizedGas, "gas");
        console.log("Unoptimized loop:", unoptimizedGas, "gas");
        console.log("Savings:        ", unoptimizedGas - optimizedGas, "gas");
        console.log("Reduction:      ", ((unoptimizedGas - optimizedGas) * 100) / unoptimizedGas, "%");
    }
}

/// @notice Unoptimized reference implementation for comparison
contract UnoptimizedReputation {
    address public escrow;
    
    // Unoptimized: Separate storage variables instead of packed struct
    mapping(address => uint256) public totalPoints;
    mapping(address => uint256) public challengeCount;
    mapping(address => uint256) public winnerCount;
    mapping(address => uint256) public verifierCount;
    mapping(address => uint256) public verifierPoints;
    mapping(address => uint256) public lastUpdate;
    
    uint256 public totalUsers;
    uint256 public top10Threshold;
    
    // Unoptimized: Using require with strings
    modifier onlyEscrow() {
        require(msg.sender == escrow, "Only escrow can call this");
        _;
    }
    
    constructor(address _escrow) {
        escrow = _escrow;
    }
    
    function updateReputation(
        address user,
        uint256 usdcAmount,
        bool isVerifier
    ) external onlyEscrow {
        // Unoptimized: Using require with strings
        require(user != address(0), "Invalid user address");
        require(usdcAmount > 0, "Amount must be greater than zero");
        
        // Unoptimized: Multiple storage reads/writes
        if (totalPoints[user] == 0 && challengeCount[user] == 0) {
            totalUsers = totalUsers + 1; // No unchecked
        }
        
        // Unoptimized: Separate calculation without pure function
        uint256 points;
        if (usdcAmount <= 100e6) {
            points = isVerifier ? 2 : 10;
        } else if (usdcAmount <= 500e6) {
            points = isVerifier ? 10 : 50;
        } else if (usdcAmount <= 1000e6) {
            points = isVerifier ? 20 : 100;
        } else {
            points = isVerifier ? 40 : 200;
        }
        
        // Unoptimized: Multiple storage operations (not packed)
        totalPoints[user] = totalPoints[user] + points; // No unchecked
        challengeCount[user] = challengeCount[user] + 1;
        lastUpdate[user] = block.timestamp; // Using timestamp instead of block number
        
        if (isVerifier) {
            verifierPoints[user] = verifierPoints[user] + points;
            verifierCount[user] = verifierCount[user] + 1;
        } else {
            winnerCount[user] = winnerCount[user] + 1;
        }
    }
}
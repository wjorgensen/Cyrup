#!/bin/bash

# Test script for LEAN verification backend

API_URL="${API_URL:-http://localhost:8080}"
LEAN_URL="${LEAN_URL:-http://localhost:8081}"

echo "Testing LEAN Verification Backend"
echo "================================="
echo "API URL: $API_URL"
echo "LEAN URL: $LEAN_URL"
echo ""

# Check if lean-runner is healthy
echo "1. Checking lean-runner health..."
curl -s "$LEAN_URL/health" | jq '.' || echo "Lean runner not accessible directly"
echo ""

# Check if API is healthy
echo "2. Checking API health..."
curl -s "$API_URL/health" | jq '.'
echo ""

# Test 1: Simple valid proof
echo "3. Testing simple valid proof..."
PROOF1='theorem simple : 1 + 1 = 2 := by rfl'

RESPONSE=$(curl -s -X POST "$API_URL/api/verify" \
  -H "Content-Type: application/json" \
  -d "{\"code\":\"$PROOF1\",\"timeout\":5000}")

ID=$(echo "$RESPONSE" | jq -r '.id')
echo "   Submitted proof, ID: $ID"

# Wait for processing
sleep 2

# Get result
echo "   Getting result..."
RESULT=$(curl -s "$API_URL/api/result/$ID")
echo "$RESULT" | jq '.'
echo ""

# Test 2: Invalid proof (should fail)
echo "4. Testing invalid proof..."
PROOF2='theorem wrong : 1 + 1 = 3 := by rfl'

RESPONSE=$(curl -s -X POST "$API_URL/api/verify" \
  -H "Content-Type: application/json" \
  -d "{\"code\":\"$PROOF2\",\"timeout\":5000}")

ID=$(echo "$RESPONSE" | jq -r '.id')
echo "   Submitted invalid proof, ID: $ID"

# Wait for processing
sleep 2

# Get result
echo "   Getting result..."
RESULT=$(curl -s "$API_URL/api/result/$ID")
echo "$RESULT" | jq '.'
echo ""

# Test 3: More complex valid proof
echo "5. Testing complex proof..."
PROOF3='
def double (n : Nat) : Nat := n + n

theorem double_eq : double 3 = 6 := by
  unfold double
  rfl
'

RESPONSE=$(curl -s -X POST "$API_URL/api/verify" \
  -H "Content-Type: application/json" \
  -d "{\"code\":\"$PROOF3\",\"timeout\":10000}")

ID=$(echo "$RESPONSE" | jq -r '.id')
echo "   Submitted complex proof, ID: $ID"

# Wait for processing
sleep 3

# Get result
echo "   Getting result..."
RESULT=$(curl -s "$API_URL/api/result/$ID")
echo "$RESULT" | jq '.'
echo ""

# Test 4: Syntax error
echo "6. Testing syntax error..."
PROOF4='theorem syntax_error : this is not valid lean code'

RESPONSE=$(curl -s -X POST "$API_URL/api/verify" \
  -H "Content-Type: application/json" \
  -d "{\"code\":\"$PROOF4\",\"timeout\":5000}")

ID=$(echo "$RESPONSE" | jq -r '.id')
echo "   Submitted syntax error proof, ID: $ID"

# Wait for processing
sleep 2

# Get result
echo "   Getting result..."
RESULT=$(curl -s "$API_URL/api/result/$ID")
echo "$RESULT" | jq '.'
echo ""

echo "================================="
echo "Test completed!"
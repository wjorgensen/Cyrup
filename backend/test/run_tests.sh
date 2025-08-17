#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

API_URL="http://localhost:8080"
PASSED=0
FAILED=0

echo "🧪 Starting LEAN Backend Test Suite"
echo "=================================="

# Function to test endpoint
test_endpoint() {
    local name="$1"
    local method="$2"
    local endpoint="$3"
    local data="$4"
    local expected_status="$5"
    
    echo -n "Testing: $name ... "
    
    if [ "$method" = "POST" ]; then
        response=$(curl -s -w "\n%{http_code}" -X POST "$API_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data" 2>/dev/null)
    else
        response=$(curl -s -w "\n%{http_code}" "$API_URL$endpoint" 2>/dev/null)
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if [ "$http_code" = "$expected_status" ]; then
        echo -e "${GREEN}✓${NC} (HTTP $http_code)"
        ((PASSED++))
        echo "$body" | jq . 2>/dev/null || echo "$body"
        return 0
    else
        echo -e "${RED}✗${NC} (Expected $expected_status, got $http_code)"
        ((FAILED++))
        echo "$body"
        return 1
    fi
}

# Function to verify LEAN proof
verify_proof() {
    local name="$1"
    local code="$2"
    local should_pass="$3"
    
    echo ""
    echo "📝 Testing proof: $name"
    echo "---"
    
    # Submit proof
    response=$(curl -s -X POST "$API_URL/api/verify" \
        -H "Content-Type: application/json" \
        -d "{\"code\": \"$code\"}" 2>/dev/null)
    
    id=$(echo "$response" | jq -r '.id' 2>/dev/null)
    
    if [ -z "$id" ] || [ "$id" = "null" ]; then
        echo -e "${RED}Failed to submit proof${NC}"
        echo "Response: $response"
        ((FAILED++))
        return 1
    fi
    
    echo "Proof ID: $id"
    echo -n "Waiting for verification"
    
    # Wait for result (max 40 seconds)
    for i in {1..40}; do
        sleep 1
        echo -n "."
        
        result=$(curl -s "$API_URL/api/result/$id" 2>/dev/null)
        status=$(echo "$result" | jq -r '.status' 2>/dev/null)
        
        if [ "$status" != "queued" ] && [ "$status" != "processing" ] && [ "$status" != "null" ]; then
            echo ""
            break
        fi
    done
    
    # Check final status
    if [ "$should_pass" = "true" ]; then
        if [ "$status" = "success" ]; then
            echo -e "${GREEN}✓ Proof verified successfully${NC}"
            ((PASSED++))
        else
            echo -e "${RED}✗ Proof should have passed but got status: $status${NC}"
            echo "Result: $result" | jq . 2>/dev/null
            ((FAILED++))
        fi
    else
        if [ "$status" = "error" ] || [ "$status" = "timeout" ]; then
            echo -e "${GREEN}✓ Proof correctly failed with status: $status${NC}"
            ((PASSED++))
        else
            echo -e "${RED}✗ Proof should have failed but got status: $status${NC}"
            echo "Result: $result" | jq . 2>/dev/null
            ((FAILED++))
        fi
    fi
}

# Check if server is running
echo "🔍 Checking server health..."
if ! curl -s "$API_URL/health" > /dev/null 2>&1; then
    echo -e "${RED}Server is not running!${NC}"
    echo "Please start the server first with: go run api/main.go"
    exit 1
fi
echo -e "${GREEN}Server is running${NC}"
echo ""

# Test basic endpoints
echo "📡 Testing Basic Endpoints"
echo "=========================="
test_endpoint "Health check" "GET" "/health" "" "200"
echo ""

# Test valid proofs
echo "✅ Testing Valid LEAN Proofs"
echo "============================"

verify_proof "Simple arithmetic (2+2=4)" "theorem simple_arithmetic : 2 + 2 = 4 := rfl" "true"
verify_proof "Basic logic (modus ponens)" "theorem modus_ponens (p q : Prop) : p → (p → q) → q := fun hp hpq => hpq hp" "true"
verify_proof "Natural number addition commutativity" "theorem add_comm_example : ∀ n m : Nat, n + m = m + n := Nat.add_comm" "true"
verify_proof "Self equality" "theorem eq_self (n : Nat) : n = n := rfl" "true"

echo ""
echo "❌ Testing Invalid LEAN Proofs"
echo "=============================="

verify_proof "Syntax error" "theorem broken_syntax : 2 + 2 = 5 :=" "false"
verify_proof "Type mismatch" "theorem type_error : \\\"hello\\\" + 2 = 4 := rfl" "false"
verify_proof "Wrong proof (2+2=5)" "theorem wrong_proof : 2 + 2 = 5 := rfl" "false"

echo ""
echo "📊 Test Results"
echo "=============="
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"

if [ $FAILED -eq 0 ]; then
    echo -e "\n${GREEN}🎉 All tests passed!${NC}"
    exit 0
else
    echo -e "\n${RED}❌ Some tests failed${NC}"
    exit 1
fi
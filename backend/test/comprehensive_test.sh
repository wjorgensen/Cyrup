#!/bin/bash

# Comprehensive test of LEAN proof verification

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

API_URL="http://localhost:8080"
PASSED=0
FAILED=0

echo "🧪 Comprehensive LEAN Backend Test"
echo "==================================="

test_proof() {
    local name="$1"
    local code="$2"
    local should_pass="$3"
    
    echo ""
    echo "Testing: $name"
    echo -n "  Submitting... "
    
    RESPONSE=$(curl -s -X POST "$API_URL/api/verify" \
        -H "Content-Type: application/json" \
        -d "{\"code\": \"$code\"}")
    
    ID=$(echo "$RESPONSE" | grep -o '"id":"[^"]*' | cut -d'"' -f4)
    
    if [ -z "$ID" ]; then
        echo -e "${RED}✗ Failed to submit${NC}"
        ((FAILED++))
        return
    fi
    echo -e "${GREEN}✓${NC}"
    
    echo -n "  Verifying"
    for i in {1..40}; do
        sleep 1
        echo -n "."
        
        RESULT=$(curl -s "$API_URL/api/result/$ID")
        STATUS=$(echo "$RESULT" | grep -o '"status":"[^"]*' | cut -d'"' -f4)
        
        if [ "$STATUS" != "queued" ] && [ "$STATUS" != "processing" ]; then
            break
        fi
    done
    
    if [ "$should_pass" = "true" ]; then
        if [ "$STATUS" = "success" ]; then
            echo -e " ${GREEN}✓ Pass (as expected)${NC}"
            ((PASSED++))
        else
            echo -e " ${RED}✗ Failed (should have passed)${NC}"
            echo "    Status: $STATUS"
            ((FAILED++))
        fi
    else
        if [ "$STATUS" = "error" ] || [ "$STATUS" = "timeout" ]; then
            echo -e " ${GREEN}✓ Failed (as expected)${NC}"
            ((PASSED++))
        else
            echo -e " ${RED}✗ Passed (should have failed)${NC}"
            echo "    Status: $STATUS"
            ((FAILED++))
        fi
    fi
}

# Valid proofs
echo "📗 Testing VALID Proofs"
echo "======================="

test_proof "Simple arithmetic" \
    "theorem simple : 2 + 2 = 4 := rfl" \
    "true"

test_proof "Natural number equality" \
    "theorem nat_eq : (5 : Nat) = 5 := rfl" \
    "true"

test_proof "Boolean logic" \
    "theorem bool_and : true && true = true := rfl" \
    "true"

test_proof "Function composition" \
    "def twice (f : Nat → Nat) (x : Nat) : Nat := f (f x)\ndef addOne (x : Nat) : Nat := x + 1\ntheorem comp_test : twice addOne 3 = 5 := rfl" \
    "true"

# Invalid proofs
echo ""
echo "📕 Testing INVALID Proofs"
echo "========================"

test_proof "Wrong arithmetic" \
    "theorem wrong : 2 + 2 = 5 := rfl" \
    "false"

test_proof "Syntax error" \
    "theorem syntax_err : 2 + 2 = := rfl" \
    "false"

test_proof "Type error" \
    "theorem type_err : \\\"hello\\\" + 2 = 4 := rfl" \
    "false"

test_proof "Undefined variable" \
    "theorem undefined : x + y = z := rfl" \
    "false"

# Summary
echo ""
echo "📊 Test Summary"
echo "==============="
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"

if [ $FAILED -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 All tests passed!${NC}"
    echo "The LEAN backend is working correctly and can:"
    echo "✓ Verify valid proofs"
    echo "✓ Reject invalid proofs"
    echo "✓ Handle syntax errors"
    echo "✓ Handle type errors"
    exit 0
else
    echo ""
    echo -e "${RED}❌ Some tests failed${NC}"
    exit 1
fi
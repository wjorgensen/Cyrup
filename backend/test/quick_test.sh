#!/bin/bash

# Quick test to verify the backend is working

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

API_URL="http://localhost:8080"

echo "🧪 Quick LEAN Backend Test"
echo "=========================="

# Test 1: Health check
echo -n "1. Health check: "
if curl -s "$API_URL/health" | grep -q "healthy"; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
    echo "Server is not running!"
    exit 1
fi

# Test 2: Submit a simple proof
echo -n "2. Submitting simple proof (2+2=4): "
RESPONSE=$(curl -s -X POST "$API_URL/api/verify" \
    -H "Content-Type: application/json" \
    -d '{"code": "theorem simple : 2 + 2 = 4 := rfl"}')

ID=$(echo "$RESPONSE" | grep -o '"id":"[^"]*' | cut -d'"' -f4)

if [ -z "$ID" ]; then
    echo -e "${RED}✗${NC}"
    echo "Failed to submit proof"
    echo "Response: $RESPONSE"
    exit 1
fi
echo -e "${GREEN}✓${NC} (ID: $ID)"

# Test 3: Check status (with timeout)
echo -n "3. Waiting for verification"
for i in {1..60}; do
    sleep 2
    echo -n "."
    
    RESULT=$(curl -s "$API_URL/api/result/$ID")
    STATUS=$(echo "$RESULT" | grep -o '"status":"[^"]*' | cut -d'"' -f4)
    
    if [ "$STATUS" = "success" ]; then
        echo -e " ${GREEN}✓${NC}"
        echo "   Proof verified successfully!"
        OUTPUT=$(echo "$RESULT" | grep -o '"output":"[^"]*' | cut -d'"' -f4)
        echo "   Output: $OUTPUT"
        break
    elif [ "$STATUS" = "error" ] || [ "$STATUS" = "timeout" ]; then
        echo -e " ${RED}✗${NC}"
        echo "   Verification failed with status: $STATUS"
        ERROR=$(echo "$RESULT" | grep -o '"error":"[^"]*' | cut -d'"' -f4)
        echo "   Error: $ERROR"
        exit 1
    fi
    
    if [ $i -eq 60 ]; then
        echo -e " ${YELLOW}⚠${NC}"
        echo "   Timeout waiting for verification"
        echo "   Last status: $STATUS"
        exit 1
    fi
done

echo ""
echo -e "${GREEN}✅ All tests passed!${NC}"
echo ""
echo "The backend is working correctly. Note:"
echo "- First run may be slow as LEAN downloads in the container"
echo "- Subsequent runs should be faster if using cached images"
echo ""
echo "To improve performance, rebuild the Docker image with:"
echo "  docker build -t lean-runner:latest -f lean-runner/Dockerfile lean-runner/"
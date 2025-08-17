#!/bin/bash

echo "Rebuilding and Testing LEAN Backend"
echo "===================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Step 1: Build the fixed Docker image
echo "Step 1: Building lean-runner Docker image..."
if docker build -t lean-runner:fixed -f ../lean-runner/Dockerfile.fixed ../lean-runner/; then
    echo -e "${GREEN}✅ Docker image built successfully${NC}"
else
    echo -e "${RED}❌ Failed to build Docker image${NC}"
    echo "Please ensure Docker daemon is running and you have permissions"
    exit 1
fi
echo ""

# Step 2: Test LEAN in the container
echo "Step 2: Testing LEAN execution in container..."
echo ""

echo "Test 2.1: Verify LEAN is installed"
if docker run --rm lean-runner:fixed lean --version; then
    echo -e "${GREEN}✅ LEAN is installed${NC}"
else
    echo -e "${RED}❌ LEAN not found${NC}"
    exit 1
fi
echo ""

echo "Test 2.2: Simple valid proof"
RESULT=$(echo 'theorem simple : 1 + 1 = 2 := by rfl' | docker run --rm -i lean-runner:fixed /scripts/run_lean.sh)
echo "Result: $RESULT"
if echo "$RESULT" | grep -q '"status":"success"'; then
    echo -e "${GREEN}✅ Valid proof verified successfully${NC}"
else
    echo -e "${RED}❌ Valid proof failed${NC}"
fi
echo ""

echo "Test 2.3: Invalid proof (should fail)"
RESULT=$(echo 'theorem wrong : 1 + 1 = 3 := by rfl' | docker run --rm -i lean-runner:fixed /scripts/run_lean.sh)
echo "Result: $RESULT"
if echo "$RESULT" | grep -q '"status":"error"'; then
    echo -e "${GREEN}✅ Invalid proof correctly rejected${NC}"
else
    echo -e "${RED}❌ Invalid proof should have failed${NC}"
fi
echo ""

# Step 3: Build and run with docker-compose
echo "Step 3: Starting services with docker-compose..."
docker-compose down 2>/dev/null

# Create a temporary docker-compose file that uses the pre-built image
cat > docker-compose-test.yml << 'EOF'
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=cyrup
      - POSTGRES_PASSWORD=cyrup_password
      - POSTGRES_DB=cyrup_db
    volumes:
      - postgres_test_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    networks:
      - cyrup-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U cyrup"]
      interval: 10s
      timeout: 5s
      retries: 5

  api:
    build:
      context: .
      dockerfile: Dockerfile.api
    ports:
      - "8080:8080"
    environment:
      - PORT=8080
      - LEAN_RUNNER_URL=http://lean-runner:8081
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_USER=cyrup
      - DB_PASSWORD=cyrup_password
      - DB_NAME=cyrup_db
    depends_on:
      postgres:
        condition: service_healthy
      lean-runner:
        condition: service_started
    networks:
      - cyrup-network

  lean-runner:
    image: lean-runner:fixed
    ports:
      - "8081:8081"
    environment:
      - PORT=8081
    networks:
      - cyrup-network

networks:
  cyrup-network:
    driver: bridge

volumes:
  postgres_test_data:
EOF

if docker-compose -f docker-compose-test.yml up -d; then
    echo -e "${GREEN}✅ Services started${NC}"
    
    # Wait for services to be ready
    echo "Waiting for services to start..."
    sleep 5
    
    # Step 4: Run API tests
    echo ""
    echo "Step 4: Testing API endpoints..."
    
    # Test health check
    echo "Test 4.1: API Health check"
    if curl -s http://localhost:8080/health | grep -q "healthy"; then
        echo -e "${GREEN}✅ API is healthy${NC}"
    else
        echo -e "${RED}❌ API health check failed${NC}"
    fi
    echo ""
    
    # Test LEAN verification through API
    echo "Test 4.2: Submit proof through API"
    RESPONSE=$(curl -s -X POST http://localhost:8080/api/verify \
        -H "Content-Type: application/json" \
        -d '{"code":"theorem api_test : 2 + 2 = 4 := by rfl","timeout":5000}')
    
    ID=$(echo "$RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    echo "Submitted proof with ID: $ID"
    
    # Wait for processing
    sleep 3
    
    # Get result
    RESULT=$(curl -s "http://localhost:8080/api/result/$ID")
    echo "Result: $RESULT"
    
    if echo "$RESULT" | grep -q '"status":"success"'; then
        echo -e "${GREEN}✅ API verification working!${NC}"
    else
        echo -e "${RED}❌ API verification failed${NC}"
    fi
    echo ""
    
    # Test database endpoints
    echo "Test 4.3: Test submission endpoint"
    SUBMISSION_RESPONSE=$(curl -s -X POST http://localhost:8080/api/submissions \
        -H "Content-Type: application/json" \
        -d '{
            "uid":"test-uid-123",
            "challenge_address":"0x1234567890123456789012345678901234567890",
            "wallet_address":"0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
            "solution_code":"theorem test : 1 + 1 = 2 := by rfl"
        }')
    
    if echo "$SUBMISSION_RESPONSE" | grep -q '"uid":"test-uid-123"'; then
        echo -e "${GREEN}✅ Submission endpoint working!${NC}"
    else
        echo -e "${RED}❌ Submission endpoint failed${NC}"
        echo "Response: $SUBMISSION_RESPONSE"
    fi
    echo ""
    
    # Test leaderboard endpoint
    echo "Test 4.4: Test leaderboard endpoint"
    LEADERBOARD_RESPONSE=$(curl -s http://localhost:8080/api/leaderboard?limit=10)
    
    if echo "$LEADERBOARD_RESPONSE" | grep -q '"leaderboard"'; then
        echo -e "${GREEN}✅ Leaderboard endpoint working!${NC}"
    else
        echo -e "${RED}❌ Leaderboard endpoint failed${NC}"
        echo "Response: $LEADERBOARD_RESPONSE"
    fi
    
    # Show logs if there were errors
    if [ $? -ne 0 ]; then
        echo ""
        echo "Docker logs:"
        docker-compose -f docker-compose-test.yml logs --tail=20
    fi
    
    # Clean up temporary file
    rm -f docker-compose-test.yml
else
    echo -e "${RED}❌ Failed to start services${NC}"
    rm -f docker-compose-test.yml
    exit 1
fi

echo ""
echo "===================================="
echo "Testing complete!"
echo ""
echo "To stop services: docker-compose -f docker-compose-test.yml down"
echo "To view logs: docker-compose -f docker-compose-test.yml logs -f"
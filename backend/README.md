# Cyrup Backend - LEAN 4 Proof Verification API

## Overview
Go API server that provides LEAN 4 proof verification via an HTTP service architecture.

## Architecture
- **API Server**: Go with Gin framework (handles requests and queuing)
- **LEAN Runner**: Persistent HTTP service running LEAN 4 in a container
- **Communication**: Services communicate via HTTP (supports both Docker Compose and Railway)

## API Endpoints
- `POST /api/verify` - Submit LEAN code for verification
- `GET /api/status/:id` - Check verification status
- `GET /api/result/:id` - Get verification results
- `GET /health` - Health check endpoint

## Local Development

### Using Docker Compose (Recommended)
```bash
# Build and run both services
docker-compose up --build

# Services will be available at:
# - API: http://localhost:8080
# - LEAN Runner: http://localhost:8081 (for debugging)
```

### Manual Setup
```bash
# 1. Build and run lean-runner
docker build -t lean-runner:latest -f lean-runner/Dockerfile lean-runner/
docker run -p 8081:8081 lean-runner:latest

# 2. Run API server
export LEAN_RUNNER_URL=http://localhost:8081
go run api/main.go
```

## Railway Deployment

The backend requires deploying two separate services on Railway:
1. **lean-runner**: HTTP service for LEAN execution
2. **api-server**: Public-facing API

See [DEPLOY_RAILWAY.md](./DEPLOY_RAILWAY.md) for detailed deployment instructions.

### Key Features
- Automatic PORT detection
- CORS configuration for frontend access
- Internal service communication via Railway's private network
- Persistent LEAN container (no restart per request)

## API Usage Examples

### Submit a Simple Proof
```bash
curl -X POST http://localhost:8080/api/verify \
  -H "Content-Type: application/json" \
  -d '{"code": "theorem simple : 1 + 1 = 2 := by rfl", "timeout": 5000}'
```

### Check Status
```bash
curl http://localhost:8080/api/status/{id}
```

### Get Results
```bash
curl http://localhost:8080/api/result/{id}
```

### Complex Proof Example
```bash
curl -X POST http://localhost:8080/api/verify \
  -H "Content-Type: application/json" \
  -d '{
    "code": "def double (n : Nat) : Nat := n + n\n\ntheorem double_eq : double 3 = 6 := by\n  unfold double\n  rfl",
    "timeout": 10000
  }'
```

## Testing

Run the test suite:
```bash
cd test
./test_lean_verification.sh
```

## Performance Notes

- First LEAN execution may take ~30 seconds (downloading/caching LEAN)
- Subsequent verifications are much faster
- Container remains running, no restart overhead per request
- Supports concurrent API requests (queued for sequential LEAN processing)
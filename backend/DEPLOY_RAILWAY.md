# Railway Deployment Guide for LEAN Backend

## Architecture Overview

The backend consists of two services that need to be deployed separately on Railway:
1. **lean-runner**: HTTP service that executes LEAN proofs
2. **api-server**: Go API that handles requests and communicates with lean-runner

## Deployment Steps

### 1. Deploy lean-runner Service

1. Create a new service in Railway
2. Connect to your GitHub repository
3. Set the root directory to `/backend`
4. Add these settings:
   - **Build Command**: Leave empty (uses Dockerfile)
   - **Dockerfile Path**: `Dockerfile.lean-runner`
   - **Start Command**: Leave empty (uses CMD from Dockerfile)
   
5. Environment Variables:
   ```
   PORT=8081
   ```

6. After deployment, note the internal URL (e.g., `lean-runner.railway.internal`)

### 2. Deploy API Server

1. Create another new service in Railway
2. Connect to the same GitHub repository
3. Set the root directory to `/backend`
4. Add these settings:
   - **Build Command**: Leave empty (uses Dockerfile)
   - **Dockerfile Path**: `Dockerfile.api`
   - **Start Command**: Leave empty
   
5. Environment Variables:
   ```
   PORT=8080
   LEAN_RUNNER_URL=http://lean-runner.railway.internal:8081
   ```
   (Replace `lean-runner.railway.internal` with your actual lean-runner internal URL)

6. Generate a domain for external access

### 3. Network Configuration

Railway services communicate via internal URLs. Make sure:
- lean-runner is accessible at port 8081 internally
- api-server is exposed publicly on port 8080
- The LEAN_RUNNER_URL environment variable points to the lean-runner's internal URL

### 4. Testing

After deployment, test the API:

```bash
# Test health endpoint
curl https://your-api.railway.app/health

# Test LEAN verification
curl -X POST https://your-api.railway.app/api/verify \
  -H "Content-Type: application/json" \
  -d '{"code":"theorem simple : 1 + 1 = 2 := by rfl","timeout":5000}'
```

## Important Notes

1. **First Run**: The lean-runner service will download LEAN on first startup, which may take ~30 seconds. After that, it's cached in the container.

2. **Scaling**: Each service can be scaled independently. The API server can handle multiple concurrent requests, and lean-runner processes them sequentially.

3. **Memory**: LEAN verification can be memory-intensive. Monitor your Railway usage and adjust resource limits if needed.

4. **Logs**: Check Railway logs for both services to debug any issues.

## Environment Variables Summary

### lean-runner:
- `PORT`: Port for the HTTP server (default: 8081)

### api-server:
- `PORT`: Port for the API server (default: 8080)
- `LEAN_RUNNER_URL`: Internal URL of lean-runner service

## Troubleshooting

1. **"Connection refused" errors**: Ensure LEAN_RUNNER_URL uses the internal Railway URL
2. **Timeouts**: Increase timeout values in the API if complex proofs take longer
3. **Memory issues**: Monitor Railway metrics and increase limits if needed
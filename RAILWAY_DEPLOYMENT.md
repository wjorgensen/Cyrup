# Railway Deployment Guide

## Architecture Overview
The Cyrup backend consists of three separate services that need to be deployed:
1. **PostgreSQL Database** - Stores submissions, leaderboard, and reputation events
2. **LEAN Runner Service** - Verifies LEAN proofs in isolated containers
3. **Backend API** - Main API server that coordinates between services

## Deployment Steps

### 1. Deploy PostgreSQL Database
Railway provides PostgreSQL as a managed service:
1. In your Railway project, click "New Service"
2. Select "Database" → "Add PostgreSQL"
3. Note the connection details from the Variables tab

### 2. Deploy LEAN Runner Service
1. Create a new service in Railway
2. Connect your GitHub repo
3. Configure the service:
   - **Root Directory**: `/lean-runner`
   - **Dockerfile Path**: `Dockerfile.fixed`
4. The service will auto-deploy with the railway.json configuration
5. Note the internal URL (e.g., `lean-runner.railway.internal`)

### 3. Deploy Backend API
1. Create another new service
2. Connect your GitHub repo
3. Configure the service:
   - **Root Directory**: `/backend`
   - **Dockerfile Path**: `Dockerfile.api`
4. Add environment variables:
   ```
   LEAN_RUNNER_URL=http://lean-runner.railway.internal:8081
   DB_HOST=<postgres-host>.railway.internal
   DB_PORT=5432
   DB_USER=postgres
   DB_PASSWORD=<from-postgres-service>
   DB_NAME=railway
   ```

### 4. Internal Networking
Railway services communicate via internal private network:
- Services can reach each other using `<service-name>.railway.internal`
- No need to expose internal ports publicly
- Only the API service needs a public domain

## Environment Variables

### Backend API Service
```bash
# Required
PORT=${{PORT}}                                    # Railway auto-assigns
LEAN_RUNNER_URL=http://lean-runner.railway.internal:8081
DB_HOST=<postgres-service>.railway.internal
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=${{POSTGRES_PASSWORD}}                # Reference from PostgreSQL service
DB_NAME=railway
```

### LEAN Runner Service
```bash
# Required
PORT=${{PORT}}                                    # Railway auto-assigns
```

## Monitoring & Logs
- View logs for each service in the Railway dashboard
- API health check: `https://<your-api-domain>/health`
- Database tables are auto-created on first API startup

## API Endpoints

### LEAN Verification
- `POST /api/verify` - Submit LEAN proof for verification
- `GET /api/status/:id` - Check verification status
- `GET /api/result/:id` - Get verification result

### Submissions
- `POST /api/submissions` - Store solution submission
- `GET /api/submissions/:uid` - Get submission by UID
- `PUT /api/submissions/:uid/status` - Update submission status
- `GET /api/submissions/wallet/:wallet` - Get user's submissions
- `GET /api/submissions/challenge/:address` - Get challenge submissions

### Leaderboard
- `GET /api/leaderboard` - Get leaderboard (paginated)
- `GET /api/leaderboard/top` - Get top performers
- `GET /api/leaderboard/user/:wallet` - Get user stats and position
- `POST /api/leaderboard/events` - Record reputation event (from smart contract)
- `GET /api/leaderboard/events/recent` - Get recent reputation events

## Testing Deployment
After deployment, test the services:

```bash
# Test API health
curl https://<your-api-domain>/health

# Test LEAN verification
curl -X POST https://<your-api-domain>/api/verify \
  -H "Content-Type: application/json" \
  -d '{"code":"theorem test : 1 + 1 = 2 := by rfl","timeout":5000}'

# Test database connection
curl https://<your-api-domain>/api/leaderboard?limit=10
```

## Troubleshooting

### Database Connection Issues
- Ensure PostgreSQL service is running
- Check environment variables are correctly set
- Verify internal networking is working

### LEAN Runner Issues
- Check Docker is properly configured in the container
- Verify the LEAN installation in logs
- Ensure sufficient memory allocation (min 512MB recommended)

### API Issues
- Check all environment variables are set
- Verify both database and LEAN runner are accessible
- Review logs for specific error messages
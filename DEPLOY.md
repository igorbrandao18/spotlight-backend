# Deployment Guide

This document describes how to deploy the Spotlight Backend to the production server.

## Server Information

- **IP**: 134.209.174.77
- **User**: root
- **Deploy Path**: `/var/www/spotlight-backend`
- **Port**: 8080

## Deployment Methods

### Method 1: GitHub Actions (Recommended)

The project includes GitHub Actions workflows that automatically deploy when code is pushed to the `main` branch.

#### Setup

The pipeline is configured with direct server access. No additional setup needed - just push to `main` branch or manually trigger the workflow.

**Workflows Available:**
- **`.github/workflows/deploy.yml`**: Direct deployment with PM2 (recommended)
- **`.github/workflows/deploy-docker.yml`**: Docker-based deployment

#### How It Works

1. **Automatic Deployment**:
   - Push to `main` branch triggers the workflow
   - The pipeline connects directly to the server via SSH
   - Stops all existing services
   - Clones/updates the repository
   - Installs dependencies (Node.js, pnpm, Docker, PM2 if needed)
   - Builds the application
   - Runs database migrations
   - Starts the application with PM2
   - Verifies deployment

2. **Manual Trigger**:
   - Go to Actions tab in GitHub
   - Select the workflow
   - Click "Run workflow"

### Method 2: Manual Deployment via SSH

#### Prerequisites

```bash
# Install required tools on server
apt-get update
apt-get install -y curl git nodejs npm docker.io docker-compose

# Install pnpm
curl -fsSL https://get.pnpm.io/install.sh | sh
export PNPM_HOME="$HOME/.local/share/pnpm"
export PATH="$PNPM_HOME:$PATH"

# Install PM2
npm install -g pm2
```

#### Deployment Steps

1. **Connect to server**:
   ```bash
   ssh root@134.209.174.77
   ```

2. **Stop existing services**:
   ```bash
   cd /var/www/spotlight-backend
   pm2 stop spotlight-backend || true
   docker-compose down || true
   ```

3. **Clone/Update repository**:
   ```bash
   mkdir -p /var/www/spotlight-backend
   cd /var/www/spotlight-backend
   git clone https://github.com/igorbrandao18/spotlight-backend.git . || git pull
   ```

4. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your production settings
   nano .env
   ```

5. **Install dependencies and build**:
   ```bash
   pnpm install --prod
   pnpm prisma generate
   pnpm prisma migrate deploy
   pnpm run build
   ```

6. **Start application**:
   ```bash
   pm2 start dist/main.js --name spotlight-backend
   pm2 save
   pm2 startup
   ```

### Method 3: Docker Deployment

1. **Connect to server**:
   ```bash
   ssh root@134.209.174.77
   ```

2. **Deploy**:
   ```bash
   cd /var/www/spotlight-backend
   git pull origin main
   docker-compose down
   docker-compose build --no-cache
   docker-compose up -d
   ```

## Environment Variables

Create a `.env` file in the deployment directory with the following variables:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/spotlight_db
DATABASE_USER=spotlight_user
DATABASE_PASSWORD=your_password

# JWT
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRATION_TIME=1h
REFRESH_TOKEN_SECRET=your_refresh_token_secret
REFRESH_TOKEN_EXPIRATION_TIME=7d

# Server
PORT=8080
API_PREFIX=api
CORS_ORIGIN=https://your-frontend-domain.com

# Email (optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_email_password

# AWS S3 (optional)
AWS_S3_REGION=us-east-1
AWS_S3_ACCESS_KEY_ID=your_access_key
AWS_S3_SECRET_ACCESS_KEY=your_secret_key
AWS_S3_BUCKET_NAME=your_bucket_name
AWS_S3_ENDPOINT=https://s3.amazonaws.com
```

## Health Checks

After deployment, verify the application is running:

```bash
# Check PM2 status
pm2 status

# Check logs
pm2 logs spotlight-backend

# Check API health
curl http://localhost:8080/api/docs

# Check Docker containers (if using Docker)
docker-compose ps
docker-compose logs
```

## Rollback

If you need to rollback to a previous version:

```bash
cd /var/www/spotlight-backend
git checkout <previous-commit-hash>
pnpm install --prod
pnpm prisma generate
pnpm run build
pm2 restart spotlight-backend
```

## Monitoring

The application runs with PM2, which provides:

- Automatic restarts on crashes
- Log management
- Process monitoring
- Cluster mode support

View logs:
```bash
pm2 logs spotlight-backend
pm2 monit
```

## Troubleshooting

### Application won't start

1. Check logs: `pm2 logs spotlight-backend`
2. Verify environment variables: `cat .env`
3. Check database connection
4. Verify port availability: `lsof -i :8080`

### Database connection issues

1. Verify DATABASE_URL in .env
2. Check PostgreSQL is running: `systemctl status postgresql`
3. Test connection: `psql $DATABASE_URL`

### Port already in use

```bash
# Find process using port 8080
lsof -i :8080

# Kill process
kill -9 <PID>
```

## Security Notes

- Change default passwords
- Use strong JWT secrets
- Configure firewall rules
- Enable SSL/TLS (recommended)
- Keep dependencies updated
- Use environment variables for secrets (never commit .env)


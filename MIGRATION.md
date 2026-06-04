# Wanderlog — Migration & Deployment Guide

This guide covers moving Wanderlog from any machine to a new server, whether that is a VPS, home server, or cloud instance. It includes production (Docker) and development setups, plus maintenance procedures.

---

## Table of Contents

1. [What Gets Migrated](#1-what-gets-migrated)
2. [New Server Prerequisites](#2-new-server-prerequisites)
3. [Step 1 — Transfer the Code](#step-1--transfer-the-code)
4. [Step 2 — Configure Environment](#step-2--configure-environment)
5. [Step 3 — Production Launch (Docker)](#step-3--production-launch-docker)
6. [Step 4 — Run Database Migrations](#step-4--run-database-migrations)
7. [Step 5 — Seed Demo Data (Optional)](#step-5--seed-demo-data-optional)
8. [Step 6 — Verify Everything Works](#step-6--verify-everything-works)
9. [Setting Up a Domain + HTTPS](#setting-up-a-domain--https)
10. [Running in Development Mode](#running-in-development-mode)
11. [Migrating Existing Data](#migrating-existing-data)
12. [Updating the Application](#updating-the-application)
13. [Backups](#backups)
14. [Troubleshooting](#troubleshooting)

---

## 1. What Gets Migrated

| Item | Location | Migrated? | Notes |
|---|---|---|---|
| Source code | Project folder | ✅ Yes | ~2 MB compressed |
| Database schema | `apps/api/prisma/` | ✅ Yes | Migrations recreate the schema |
| Dependencies | `node_modules/` | ❌ No | Reinstalled automatically |
| Build artifacts | `dist/` folders | ❌ No | Rebuilt by Docker |
| Environment secrets | `apps/api/.env` | ❌ No | Create fresh on new server |
| Database data | Docker volume | Optional | Export/import if you want to keep data |
| Uploaded files | `uploads/` folder | Optional | Copy if using local storage |

**Bottom line:** you only need to transfer the source code. Everything else is recreated on the new server.

---

## 2. New Server Prerequisites

### Production (Docker — recommended)

Only Docker and Docker Compose are required. No Node.js needed.

```bash
# Install Docker (Debian/Ubuntu)
curl -fsSL https://get.docker.com | bash
sudo usermod -aG docker $USER
newgrp docker

# Verify
docker --version
docker compose version
```

Minimum server specs:
- 1 vCPU, 1 GB RAM (functional)
- 2 vCPU, 2 GB RAM (recommended)
- 5 GB disk space

### Development mode (optional)

If you want to run the dev servers on the new machine as well:

```bash
# Install Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt-get install -y nodejs

# Install pnpm
curl -fsSL https://get.pnpm.io/install.sh | bash -
source ~/.bashrc
pnpm --version
```

---

## Step 1 — Transfer the Code

Choose one of the three methods below. **Method A (Git) is strongly recommended.**

---

### Method A — Git (Recommended)

This is the cleanest approach and makes future updates trivial.

**On the original machine — push to a remote:**

```bash
cd /home/debian/projects/wanderlog

# Add your remote (GitHub, Gitea, Forgejo, or any Git host)
git remote add origin git@github.com:yourusername/wanderlog.git

# Push
git push -u origin master
```

**On the new server — clone:**

```bash
# Clone the repository
git clone git@github.com:yourusername/wanderlog.git /opt/wanderlog

# Enter the project directory
cd /opt/wanderlog
```

> **Note:** If using a private repository, make sure the new server has an SSH key added to your Git host, or use HTTPS with a personal access token.

---

### Method B — rsync (Direct server-to-server)

Use this if both machines are on the same network or you have SSH access between them.

```bash
# Run this from the ORIGINAL machine
rsync -avz \
  --exclude='node_modules' \
  --exclude='dist' \
  --exclude='.env' \
  --exclude='.git' \
  --exclude='uploads' \
  /home/debian/projects/wanderlog/ \
  user@your-server-ip:/opt/wanderlog/
```

---

### Method C — Archive and copy

Use this if you have no direct connection between machines.

```bash
# On the ORIGINAL machine — create archive
cd /home/debian/projects
tar \
  --exclude='wanderlog/node_modules' \
  --exclude='wanderlog/dist' \
  --exclude='wanderlog/.env' \
  --exclude='wanderlog/uploads' \
  -czf wanderlog-backup.tar.gz \
  wanderlog/

# Transfer the archive (USB drive, cloud storage, SFTP, etc.)
# Then on the NEW server — extract
sudo mkdir -p /opt/wanderlog
sudo tar -xzf wanderlog-backup.tar.gz -C /opt/
```

---

## Step 2 — Configure Environment

On the new server, inside `/opt/wanderlog`:

```bash
cd /opt/wanderlog

# Copy the example environment file
cp apps/api/.env.example apps/api/.env
```

Now edit the file:

```bash
nano apps/api/.env
```

**Required changes — these MUST be set before starting:**

```bash
# Generate secure random secrets (run these commands, paste the output)
openssl rand -hex 32   # use for JWT_SECRET
openssl rand -hex 32   # use for JWT_REFRESH_SECRET
```

Fill in the `.env` with your values:

```env
NODE_ENV=production
PORT=3001

# Database — leave as-is if using the bundled Docker Postgres
DATABASE_URL=postgresql://wanderlog:wanderlog@postgres:5432/wanderlog

# REQUIRED: Replace with generated secrets
JWT_SECRET=paste_your_first_generated_secret_here
JWT_REFRESH_SECRET=paste_your_second_generated_secret_here
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=30d

# Set this to your server's IP or domain
CORS_ORIGIN=http://your-server-ip-or-domain:3000

# File storage — local disk by default
STORAGE_PROVIDER=local
STORAGE_LOCAL_PATH=/app/uploads

# AI features (optional — app works fully without this)
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...your-key-here...

# Email (optional — uses console logging if not set)
EMAIL_PROVIDER=console
```

> **Security note:** Never commit `.env` to Git. The `.gitignore` already excludes it.

---

## Step 3 — Production Launch (Docker)

This single command builds both services, starts PostgreSQL, the API, and the web frontend:

```bash
cd /opt/wanderlog
docker compose up -d --build
```

This will:
1. Pull the PostgreSQL 16 image
2. Build the API Docker image (compiles TypeScript)
3. Build the web Docker image (runs Vite build, serves via Nginx)
4. Start all three containers
5. Create persistent Docker volumes for the database and uploads

**Check that all containers started:**

```bash
docker compose ps
```

Expected output:
```
NAME                    STATUS          PORTS
wanderlog-postgres      running         5432/tcp
wanderlog-api           running         0.0.0.0:3001->3001/tcp
wanderlog-web           running         0.0.0.0:3000->80/tcp
```

**View logs if something seems wrong:**

```bash
docker compose logs -f           # all services
docker compose logs -f api       # API only
docker compose logs -f web       # web/nginx only
docker compose logs -f postgres  # database only
```

The web interface will be available at: `http://your-server-ip:3000`

---

## Step 4 — Run Database Migrations

This creates all database tables. Run this once after first launch (and again after any future schema updates):

```bash
docker compose exec api npx prisma migrate deploy
```

Expected output:
```
Applying migration `20260603214146_init`
Database is now in sync with your schema.
```

> **Why not automatic?** Migrations run explicitly so you have control before they touch your data. In a future update, if a migration is destructive, you want to run it consciously, not automatically on container start.

---

## Step 5 — Seed Demo Data (Optional)

This creates a demo account and a sample Japan trip. Skip this if you want a clean database.

```bash
docker compose exec api npx tsx prisma/seed.ts
```

Demo credentials created:
- **Email:** `demo@wanderlog.app`
- **Password:** `Demo1234!`

To create your own account instead, simply visit `http://your-server:3000/register`.

---

## Step 6 — Verify Everything Works

```bash
# Check the API health endpoint
curl http://localhost:3001/health
# Expected: {"status":"ok","timestamp":"...","version":"0.1.0"}

# Check the web frontend is serving HTML
curl -s http://localhost:3000 | grep -o '<title>.*</title>'
# Expected: <title>Wanderlog</title>
```

Then open a browser and go to `http://your-server-ip:3000`.

---

## Setting Up a Domain + HTTPS

For production use, you should put the app behind a reverse proxy with SSL. The recommended approach is Nginx on the host with Certbot.

### Install Nginx and Certbot

```bash
sudo apt-get install -y nginx certbot python3-certbot-nginx
```

### Create an Nginx site config

```bash
sudo nano /etc/nginx/sites-available/wanderlog
```

Paste this (replace `yourdomain.com`):

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Web frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # API
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # WebSocket for real-time collaboration
    location /ws {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }
}
```

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/wanderlog /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# Get a free SSL certificate
sudo certbot --nginx -d yourdomain.com
```

After SSL is set up, update `CORS_ORIGIN` in `.env` to `https://yourdomain.com` and rebuild:

```bash
docker compose up -d --build api
```

---

## Running in Development Mode

If you want to run the dev servers with hot reload on the new machine (instead of Docker):

```bash
cd /opt/wanderlog

# Install dependencies
pnpm install

# Start just the database
docker compose -f docker-compose.dev.yml up -d

# Copy and edit the env file
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env with your settings

# Generate the Prisma client
pnpm db:generate

# Run migrations
pnpm db:migrate

# Start both dev servers (API on :3001, web on :5173)
pnpm dev
```

The dev web server is available at `http://your-server-ip:5173`.

---

## Migrating Existing Data

If you want to carry your current data (trips, users, etc.) to the new server — not just the code — follow these steps.

### Export from the original machine

```bash
# On the ORIGINAL machine
docker exec wanderlog-dev-postgres pg_dump \
  -U wanderlog \
  -d wanderlog \
  -F c \
  -f /tmp/wanderlog-data.dump

# Copy the dump to your local machine
docker cp wanderlog-dev-postgres:/tmp/wanderlog-data.dump ./wanderlog-data.dump
```

### Import on the new server

```bash
# Copy the dump file to the new server first, then:

# Make sure the new database is running and migrations have been applied
docker compose up -d postgres
docker compose exec api npx prisma migrate deploy

# Import the data
cat wanderlog-data.dump | docker exec -i wanderlog-postgres pg_restore \
  -U wanderlog \
  -d wanderlog \
  --clean \
  --if-exists
```

### Migrate uploaded files (if any)

```bash
# On the original machine
docker cp wanderlog-api:/app/uploads ./uploads-backup/

# Transfer uploads-backup/ to the new server, then:
# On the new server
docker cp ./uploads-backup/. wanderlog-api:/app/uploads/
```

---

## Updating the Application

When you have made code changes and want to deploy them:

```bash
cd /opt/wanderlog

# If using Git — pull latest changes
git pull

# Rebuild and restart the changed services
docker compose up -d --build

# If there are database schema changes, run migrations
docker compose exec api npx prisma migrate deploy
```

To update only the API without rebuilding the frontend:

```bash
docker compose up -d --build api
```

To update only the frontend:

```bash
docker compose up -d --build web
```

---

## Backups

### Automated database backup script

Save this as `/opt/wanderlog/scripts/backup.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/opt/wanderlog/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p "$BACKUP_DIR"

# Database dump
docker exec wanderlog-postgres pg_dump \
  -U wanderlog \
  -d wanderlog \
  -F c \
  > "$BACKUP_DIR/db_$TIMESTAMP.dump"

# Keep only the last 14 daily backups
find "$BACKUP_DIR" -name "db_*.dump" -mtime +14 -delete

echo "Backup complete: $BACKUP_DIR/db_$TIMESTAMP.dump"
```

```bash
chmod +x /opt/wanderlog/scripts/backup.sh

# Run manually to test
/opt/wanderlog/scripts/backup.sh

# Schedule daily at 2am via cron
crontab -e
# Add this line:
# 0 2 * * * /opt/wanderlog/scripts/backup.sh >> /var/log/wanderlog-backup.log 2>&1
```

### Restore from backup

```bash
docker exec -i wanderlog-postgres pg_restore \
  -U wanderlog \
  -d wanderlog \
  --clean \
  --if-exists \
  < /opt/wanderlog/backups/db_TIMESTAMP.dump
```

---

## Troubleshooting

### Containers not starting

```bash
# Check which container failed and why
docker compose ps
docker compose logs api
docker compose logs postgres
```

### API cannot connect to database

The most common cause is the database not being ready when the API starts.

```bash
# Restart just the API after postgres is healthy
docker compose restart api
```

### `CORS` errors in the browser

Your `CORS_ORIGIN` in `.env` does not match the URL you're accessing the app from.

```bash
# Edit .env
nano apps/api/.env
# Set CORS_ORIGIN=http://your-actual-ip-or-domain:3000

# Rebuild the API
docker compose up -d --build api
```

### Port 3000 or 3001 already in use

```bash
# Find what is using the port
sudo ss -tlnp | grep ':3000'

# Change the exposed ports in docker-compose.yml if needed
# e.g. change "3000:80" to "8080:80" for the web service
```

### Prisma migration errors

```bash
# Check migration status
docker compose exec api npx prisma migrate status

# If the database is in a broken state (dev only — data will be lost)
docker compose exec api npx prisma migrate reset
```

### Out of disk space

```bash
# Check space
df -h

# Remove unused Docker images and volumes
docker system prune -a
docker volume prune
```

### Reset everything and start fresh

```bash
cd /opt/wanderlog

# Stop and remove all containers AND volumes (deletes all database data)
docker compose down -v

# Start clean
docker compose up -d --build
docker compose exec api npx prisma migrate deploy
```

---

## Quick Reference

```bash
# Start everything
docker compose up -d

# Stop everything
docker compose down

# View live logs
docker compose logs -f

# Open a shell inside the API container
docker compose exec api sh

# Open a psql session
docker compose exec postgres psql -U wanderlog

# Rebuild after code changes
docker compose up -d --build

# Run a database migration
docker compose exec api npx prisma migrate deploy

# Create a database backup
docker exec wanderlog-postgres pg_dump -U wanderlog wanderlog -F c > backup.dump

# Check API health
curl http://localhost:3001/health
```

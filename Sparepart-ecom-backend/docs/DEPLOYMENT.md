# Deployment Runbook

## Prerequisites

### Required Software
- Node.js 18+ LTS
- MongoDB 6.0+
- Redis 7.0+
- PM2 (process manager)
- Nginx (reverse proxy)

### Required Accounts/Services
- Cloud provider account (AWS/GCP/Azure)
- Domain name
- SSL certificate (Let's Encrypt or purchased)
- Stripe account (production keys)
- Razorpay account (production keys)
- SMTP service (SendGrid, AWS SES, or similar)
- Sentry account (error tracking)

---

## Environment Setup

### 1. Server Provisioning

**Option A: AWS EC2**
```bash
# Launch t3.medium instance (2 vCPU, 4GB RAM minimum)
# Ubuntu 22.04 LTS
# Security group: 22 (SSH), 80 (HTTP), 443 (HTTPS), 8081 (API - internal only)
```

**Option B: Google Cloud Compute Engine**
```bash
# e2-medium instance (2 vCPU, 4GB RAM)
# Ubuntu 22.04 LTS
# Firewall: Allow 80, 443
```

**Option C: Azure VM**
```bash
# B2s instance (2 vCPU, 4GB RAM)
# Ubuntu 22.04 LTS
```

### 2. Initial Server Setup

```bash
# SSH into server
ssh ubuntu@your-server-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install build tools
sudo apt install -y build-essential

# Install PM2
sudo npm install -g pm2

# Install Nginx
sudo apt install -y nginx

# Install MongoDB
# Follow: https://www.mongodb.com/docs/manual/tutorial/install-mongodb-on-ubuntu/

# Install Redis
sudo apt install -y redis-server
sudo systemctl enable redis-server
```

---

## Database Setup

### MongoDB Configuration

```bash
# Edit MongoDB config
sudo nano /etc/mongod.conf

# Set bind IP (for production, use private network IP)
net:
  bindIp: 127.0.0.1
  port: 27017

# Enable authentication
security:
  authorization: enabled

# Restart MongoDB
sudo systemctl restart mongod

# Create database user
mongosh
use admin
db.createUser({
  user: "ecomm_admin",
  pwd: "STRONG_PASSWORD_HERE",
  roles: [ { role: "readWrite", db: "ecommerce" } ]
})
exit
```

### MongoDB Indexes

```bash
# Indexes are auto-created by Mongoose on first connection
# Verify after deployment:
mongosh -u ecomm_admin -p
use ecommerce
db.payments.getIndexes()  # Should show unique index on orderId+gateway
db.orders.getIndexes()
db.users.getIndexes()
```

### Redis Configuration

```bash
# Edit Redis config
sudo nano /etc/redis/redis.conf

# Set password
requirepass YOUR_REDIS_PASSWORD

# Set maxmemory policy
maxmemory 512mb
maxmemory-policy allkeys-lru

# Restart Redis
sudo systemctl restart redis-server
```

---

## Application Deployment

### 1. Clone Repository

```bash
# Create app directory
sudo mkdir -p /var/www/ecommerce-backend
sudo chown -R $USER:$USER /var/www/ecommerce-backend
cd /var/www/ecommerce-backend

# Clone code (use your Git repository)
git clone https://github.com/your-org/ecommerce-backend.git .

# Or upload via SCP
scp -r ./backend-v4/backend ubuntu@server:/var/www/ecommerce-backend/
```

### 2. Install Dependencies

```bash
cd /var/www/ecommerce-backend
npm ci --production
```

### 3. Environment Configuration

```bash
# Create production .env
nano .env
```

**Production .env Template:**
```env
NODE_ENV=production
PORT=8081

# Database
MONGO_URI=mongodb://ecomm_admin:PASSWORD@localhost:27017/ecommerce?authSource=admin
REDIS_URL=redis://:YOUR_REDIS_PASSWORD@localhost:6379

# JWT Secrets (generate with: openssl rand -base64 32)
JWT_SECRET=your_jwt_secret_min_32_chars
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your_refresh_secret_min_32_chars
JWT_REFRESH_EXPIRES_IN=7d

# Payment Gateways
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
RAZORPAY_KEY_ID=rzp_live_xxxxx
RAZORPAY_KEY_SECRET=xxxxx
RAZORPAY_WEBHOOK_SECRET=xxxxx

# SMTP (SendGrid example)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=SG.xxxxx

# Frontend URLs
FRONTEND_ORIGIN=https://yourdomain.com
ADMIN_ORIGIN=https://admin.yourdomain.com

# Tax & Shipping
GST_DEFAULT_RATE=0.18
GST_ORIGIN_STATE=KA
SHIPPING_FLAT_RATE=50

# Observability
SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
METRICS_TOKEN=secure_random_token_here
LOG_LEVEL=info

# Google OAuth (optional)
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
```

### 4. Test Configuration

```bash
# Test environment
node -e "require('dotenv').config(); console.log('Config loaded:', !!process.env.MONGO_URI)"

# Test database connection
node -e "const mongoose = require('mongoose'); require('dotenv').config(); mongoose.connect(process.env.MONGO_URI).then(() => console.log('DB OK')).catch(console.error)"
```

---

## PM2 Configuration

### 1. Create PM2 Ecosystem File

```bash
nano ecosystem.config.js
```

```javascript
module.exports = {
  apps: [{
    name: 'ecommerce-api',
    script: './server.js',
    instances: 2,  // Use CPU cores - 1
    exec_mode: 'cluster',
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 8081
    },
    error_file: '/var/log/pm2/ecommerce-error.log',
    out_file: '/var/log/pm2/ecommerce-out.log',
    time: true,
    autorestart: true,
    watch: false,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
```

### 2. Start Application

```bash
# Create log directory
sudo mkdir -p /var/log/pm2
sudo chown -R $USER:$USER /var/log/pm2

# Start app
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Run the command PM2 outputs

# Check status
pm2 status
pm2 logs ecommerce-api
```

---

## Nginx Configuration

### 1. Create Nginx Config

```bash
sudo nano /etc/nginx/sites-available/ecommerce-api
```

```nginx
upstream api_backend {
    least_conn;
    server 127.0.0.1:8081;
}

# Rate limiting
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/s;

server {
    listen 80;
    server_name api.yourdomain.com;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    # SSL certificates (after Let's Encrypt setup)
    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;
    
    # Strong SSL settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    
    # Request limits
    client_max_body_size 10M;
    
    # Proxy to Node.js
    location /api {
        limit_req zone=api_limit burst=20 nodelay;
        
        proxy_pass http://api_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Health check (no rate limit)
    location /health {
        proxy_pass http://api_backend/health;
        access_log off;
    }
}
```

### 2. Enable Site

```bash
# Test configuration
sudo nginx -t

# Enable site
sudo ln -s /etc/nginx/sites-available/ecommerce-api /etc/nginx/sites-enabled/

# Restart Nginx
sudo systemctl restart nginx
```

---

## SSL Certificate Setup

### Using Let's Encrypt (Free)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d api.yourdomain.com

# Test auto-renewal
sudo certbot renew --dry-run

# Certbot will auto-renew via cron
```

---

## Database Backup

### Automated Daily Backups

```bash
# Create backup script
sudo mkdir -p /opt/backups/mongodb
sudo nano /opt/backups/mongodb/backup.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/opt/backups/mongodb"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mongodump --uri="mongodb://ecomm_admin:PASSWORD@localhost:27017/ecommerce" \
  --out="$BACKUP_DIR/backup_$TIMESTAMP"
  
# Keep only last 7 days
find $BACKUP_DIR -type d -mtime +7 -name "backup_*" -exec rm -rf {} \;
```

```bash
# Make executable
sudo chmod +x /opt/backups/mongodb/backup.sh

# Add to crontab (daily at 2 AM)
sudo crontab -e
0 2 * * * /opt/backups/mongodb/backup.sh >> /var/log/mongodb-backup.log 2>&1
```

---

## Monitoring Setup

### PM2 Monitoring

```bash
# View real-time logs
pm2 logs

# Monitor resources
pm2 monit

# View metrics
curl http://localhost:8081/metrics \
  -H "Authorization: Bearer YOUR_METRICS_TOKEN"
```

### Health Checks

```bash
# Add to crontab for health monitoring
*/5 * * * * curl -f http://localhost:8081/health || echo "API DOWN" | mail -s "API Health Check Failed" admin@yourdomain.com
```

---

## Post-Deployment Checklist

- [ ] Application running on PM2
- [ ] MongoDB connected and indexes created
- [ ] Redis connected
- [ ] Nginx reverse proxy working
- [ ] SSL certificate installed
- [ ] Domain DNS configured
- [ ] Environment variables set correctly
- [ ] Payment webhooks configured in Stripe/Razorpay dashboard
- [ ] Backups running
- [ ] Monitoring alerts configured
- [ ] Error tracking (Sentry) active
- [ ] SMTP sending test emails
- [ ] Test order end-to-end
- [ ] Test payment flow
- [ ] Load test completed

---

## Rollback Procedure

```bash
# Stop current version
pm2 stop ecommerce-api

# Restore previous version
cd /var/www/ecommerce-backend
git checkout previous-stable-tag

# Reinstall dependencies
npm ci --production

# Restart
pm2 restart ecommerce-api

# Verify
pm2 logs --lines 100
```

---

## Troubleshooting

### App won't start
```bash
pm2 logs ecommerce-api --err
# Check for:
# - MongoDB connection errors
# - Redis connection errors
# - Missing environment variables
```

### 502 Bad Gateway
```bash
# Check if app is running
pm2 status

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Restart app
pm2 restart ecommerce-api
```

### High memory usage
```bash
pm2 restart ecommerce-api  # Restart to free memory
# Consider increasing max_memory_restart in ecosystem.config.js
```

---

## Support Contacts

- DevOps: devops@yourdomain.com
- Backend Lead: backend@yourdomain.com
- Emergency: emergency@yourdomain.com

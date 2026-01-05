# 🚀 Vercel Deployment - Complete Step-by-Step Guide

## ✅ What's Been Done

Your project has been updated to support both:
- **SQLite** (local development)
- **Postgres** (production on Vercel)

The system automatically detects the environment and uses the appropriate database.

---

## 📋 Deployment Checklist

### Step 1: Push Changes to GitHub ✓

Your code is ready to deploy. Commit and push these changes:

```bash
git add .
git commit -m "Add Postgres support for Vercel deployment"
git push origin main
```

---

### Step 2: Create Vercel Postgres Database (2 minutes)

Since you've already imported your project to Vercel:

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Click the **Storage** tab
4. Click **Create Database**
5. Select **Postgres**
6. Choose **Free Plan** (256 MB storage)
7. Click **Create**

**✅ Done!** Vercel automatically sets these environment variables:
- `POSTGRES_URL`
- `POSTGRES_PRISMA_URL`
- `POSTGRES_URL_NON_POOLING`
- `POSTGRES_USER`
- `POSTGRES_HOST`
- `POSTGRES_PASSWORD`
- `POSTGRES_DATABASE`

---

### Step 3: Set Environment Variables (2 minutes)

Go to your project → **Settings** → **Environment Variables**

Add these two variables:

#### 1. DUNE_API_KEY
- **Value**: Your Dune Analytics API key
- **Get it**: https://dune.com/settings/api
- **Set for**: Production, Preview, Development

#### 2. CRON_SECRET
- **Value**: Random secret string
- **Generate it** (PowerShell):
  ```powershell
  [Convert]::ToBase64String((1..32|%{Get-Random -Max 256}))
  ```
- **Set for**: Production, Preview, Development

**Screenshot of what it should look like:**
```
Name              Value                    Environments
DUNE_API_KEY      your_api_key_here       Production, Preview, Development
CRON_SECRET       random_secret_string    Production, Preview, Development
POSTGRES_URL      (auto-set by Vercel)    Production
```

---

### Step 4: Deploy (1 minute)

Vercel will automatically deploy when you push to GitHub. Or you can:

1. Go to **Deployments** tab
2. Click **Redeploy** on the latest deployment
3. Wait for deployment to complete (~2 minutes)

---

### Step 5: Initialize Database (30 seconds)

After deployment is complete, initialize the database tables and sync data:

**Option A: Using cURL**
```bash
curl -X POST https://your-app.vercel.app/api/admin/init
```

**Option B: Using PowerShell**
```powershell
Invoke-RestMethod -Uri "https://your-app.vercel.app/api/admin/init" -Method POST
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Database initialized successfully",
  "newRecords": 400,
  "updatedRecords": 0,
  "startDate": "2024-12-27",
  "endDate": "2026-01-05"
}
```

---

### Step 6: Verify Deployment (1 minute)

Test these endpoints:

#### 1. Check Homepage
```
https://your-app.vercel.app
```
Should display the dashboard with charts.

#### 2. Check Database Status
```bash
curl https://your-app.vercel.app/api/admin/init
```

**Expected Response:**
```json
{
  "initialized": true,
  "databaseType": "postgres",
  "message": "Database is initialized (postgres)"
}
```

#### 3. Check Metrics API
```bash
curl "https://your-app.vercel.app/api/metrics?start=2024-12-28&end=2024-12-31"
```

Should return daily metrics data.

---

## 🔄 How Auto-Updates Work

### Daily Sync (Automatic)
- **Schedule**: Every day at 2:00 AM UTC
- **Configured in**: `vercel.json`
- **What it does**: Fetches new LayerZero messages and updates database
- **Check logs**: Vercel Dashboard → Deployments → Functions → `daily-sync`

### Real-Time Price Updates
- **Schedule**: Every 60 seconds
- **Source**: CoinGecko API
- **No setup needed**: Works automatically

---

## 🧪 Testing the Deployment

### Test 1: Manual Cron Trigger
```bash
curl https://your-app.vercel.app/api/cron/daily-sync \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Replace `YOUR_CRON_SECRET` with the value you set in Step 3.

### Test 2: Check Sync Status
```bash
curl https://your-app.vercel.app/api/admin/sync
```

**Expected Response:**
```json
{
  "lastSync": {
    "id": 1,
    "last_sync_date": "2026-01-05",
    "status": "success",
    "messages_synced": 150
  },
  "currentTime": "2026-01-05T10:30:00.000Z"
}
```

---

## 📊 Database Schema

The following tables are automatically created:

### 1. daily_metrics
- Stores aggregated daily data
- Fields: date, message_count, avg_gas_paid, total_fee_usd, zro_price

### 2. layerzero_messages
- Stores individual message records
- Fields: guid, tx_hash, block_timestamp, date, fee_usd, etc.

### 3. sync_status
- Tracks sync operations
- Fields: last_sync_date, status, messages_synced, error_message

---

## 🔐 Security Notes

### Cron Job Protection
The cron endpoint verifies `CRON_SECRET`:
```typescript
Authorization: Bearer YOUR_CRON_SECRET
```

### Admin Endpoints
Consider adding authentication to `/api/admin/*` endpoints for production.

---

## 🐛 Troubleshooting

### Issue: "Database already has data"
**Solution**: This is expected if you run init twice. Use `/api/admin/sync` to update data instead.

### Issue: "POSTGRES_URL not set"
**Solution**:
1. Ensure Postgres database is created in Storage tab
2. Redeploy the project
3. Environment variables are auto-set on deployment

### Issue: "Cron job not running"
**Solution**:
1. Check `vercel.json` exists in project root
2. Verify cron configuration:
   ```json
   {
     "crons": [{
       "path": "/api/cron/daily-sync",
       "schedule": "0 2 * * *"
     }]
   }
   ```
3. Redeploy and check logs after 2 AM UTC

### Issue: "No data showing"
**Solution**:
1. Check if init completed: `curl https://your-app.vercel.app/api/admin/init`
2. Check browser console for API errors
3. Verify DUNE_API_KEY is correct

---

## 📈 Monitoring

### View Function Logs
1. Vercel Dashboard → Your Project
2. **Deployments** → Select latest
3. **Functions** → Select function
4. View real-time logs

### Check Database Usage
1. Vercel Dashboard → Storage
2. Select your Postgres database
3. View **Usage** tab

---

## 🎯 Success Checklist

✅ Postgres database created in Vercel
✅ Environment variables set (DUNE_API_KEY, CRON_SECRET)
✅ Code deployed to Vercel
✅ Database initialized with `POST /api/admin/init`
✅ Dashboard shows data at homepage
✅ Cron job scheduled (check after 2 AM UTC)
✅ Metrics API returning data

---

## 🔗 Quick Links

- **Your Vercel Dashboard**: https://vercel.com/dashboard
- **Dune Analytics**: https://dune.com/settings/api
- **Vercel Postgres Docs**: https://vercel.com/docs/storage/vercel-postgres
- **Project README**: [README.md](README.md)

---

## 🚨 Need Help?

If you encounter issues:

1. **Check logs**: Vercel Dashboard → Functions → View Logs
2. **Test API**: `curl https://your-app.vercel.app/api/admin/init`
3. **Verify env vars**: Settings → Environment Variables
4. **Check database**: Storage → Postgres → Query tab

---

**Your dashboard is ready to go live! 🎉**

Once deployed, it will automatically update daily with new LayerZero data and show live ZRO prices.

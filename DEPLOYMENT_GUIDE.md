# 🚀 Deployment Guide - LayerZero Fee Switch Tracker

## 📊 How Auto-Updates Work

### **Real-Time Price Updates** (Every Page Load)
The dashboard fetches the current ZRO price from CoinGecko API on every page load:
- **Location**: `lib/coingecko-api.ts` → `getCurrentZROPrice()`
- **Cache**: 60 seconds (Next.js revalidation)
- **API**: Free CoinGecko API (no key required)
- **Fallback**: Returns $3.50 if API fails

**User sees**: Live ZRO price updated in real-time when they visit the dashboard.

### **Automated Daily Sync** (2 AM UTC)
The system automatically fetches new LayerZero message data and updates historical prices:
- **Trigger**: Vercel Cron Job (configured in `vercel.json`)
- **Endpoint**: `/api/cron/daily-sync`
- **Schedule**: Daily at 2 AM UTC
- **Data Sources**:
  - **Dune Analytics**: LayerZero message counts and fees
  - **CoinGecko/CryptoCompare**: Historical ZRO prices

**Process:**
1. Check last sync date from database
2. Fetch new data from Dune Analytics (messages + fees)
3. Fetch corresponding ZRO prices
4. Calculate `totalFeeUSD = messageCount × avgFee`
5. Insert/update records in database
6. Log sync status

---

## 🔧 Environment Variables Setup

### Required Environment Variables:

Create a `.env.local` file in your project root:

```bash
# Dune Analytics API Key (REQUIRED for data sync)
# Get yours at: https://dune.com/settings/api
DUNE_API_KEY=your_dune_api_key_here

# Vercel Postgres Database (REQUIRED for production)
# These are automatically set by Vercel when you create a Postgres database
POSTGRES_URL=
POSTGRES_PRISMA_URL=
POSTGRES_URL_NON_POOLING=
POSTGRES_USER=
POSTGRES_HOST=
POSTGRES_PASSWORD=
POSTGRES_DATABASE=

# Cron Job Security (RECOMMENDED for production)
# Generate a random string: openssl rand -base64 32
CRON_SECRET=your_random_secret_string_here

# Optional: Node Environment
NODE_ENV=production
```

---

## 🗄️ Database Setup

### Option A: Vercel Postgres (Recommended for Vercel deployment)

1. **Create Postgres Database:**
   ```bash
   # In your Vercel project dashboard:
   # Storage → Create Database → Postgres → Create
   ```

2. **Environment Variables:**
   - Vercel automatically sets `POSTGRES_*` variables
   - No manual configuration needed!

3. **Run Migration:**
   ```bash
   # Update database connection code to use Postgres
   # (We'll provide migration script below)
   ```

### Option B: Keep SQLite (Local development only)

SQLite works fine for local development:
```bash
# Data is stored in: data/shadow-burn.db
# Automatically created on first run
npm run dev
```

---

## 📦 Deploying to Vercel

### Step 1: Install Vercel CLI (Optional)
```bash
npm install -g vercel
```

### Step 2: Connect Your GitHub Repository

1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Vercel will auto-detect Next.js settings

### Step 3: Set Environment Variables

In Vercel Dashboard → Settings → Environment Variables, add:

| Variable | Value | Source |
|----------|-------|--------|
| `DUNE_API_KEY` | Your Dune API key | [dune.com/settings/api](https://dune.com/settings/api) |
| `CRON_SECRET` | Random secret string | `openssl rand -base64 32` |

Postgres variables are auto-set when you create a database.

### Step 4: Create Vercel Postgres Database

1. In Vercel Dashboard → Storage → Create Database
2. Choose **Postgres**
3. Select **Free Plan** (sufficient for most use cases)
4. Click **Create**
5. Environment variables are automatically added

### Step 5: Run Initial Data Sync

After deployment, trigger the first sync manually:

**Option A: Via Vercel Dashboard**
```
Deployments → [Your Deployment] → Functions → daily-sync → Invoke
```

**Option B: Via cURL**
```bash
curl -X GET https://your-app.vercel.app/api/cron/daily-sync \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

**Option C: Via Admin Endpoint**
```bash
curl -X POST https://your-app.vercel.app/api/admin/sync \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2024-12-27",
    "endDate": "2026-01-05",
    "force": true
  }'
```

### Step 6: Verify Deployment

1. **Check Homepage**: `https://your-app.vercel.app`
2. **Check API**: `https://your-app.vercel.app/api/metrics?start=2025-12-28&end=2025-12-31`
3. **Check Sync Status**: `https://your-app.vercel.app/api/admin/sync`

---

## 🔄 Manual Data Sync

You can manually trigger data synchronization anytime:

### Via API Endpoint:
```bash
# Sync all new data since last sync
curl -X POST https://your-app.vercel.app/api/admin/sync

# Sync specific date range
curl -X POST https://your-app.vercel.app/api/admin/sync \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2025-01-01",
    "endDate": "2025-01-05"
  }'

# Force full resync
curl -X POST https://your-app.vercel.app/api/admin/sync \
  -H "Content-Type: application/json" \
  -d '{ "force": true }'
```

### Via Python Script (Local):
```bash
# Update prices
python fetch_zro_cryptocompare.py
python import_zro_prices.py

# Verify database
python verify_db.py
```

---

## 🕐 Cron Job Configuration

The cron job is configured in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/daily-sync",
      "schedule": "0 2 * * *"
    }
  ]
}
```

**Schedule Format** (Cron expression):
- `0 2 * * *` = Daily at 2:00 AM UTC
- Change to your preferred time:
  - `0 0 * * *` = Midnight UTC
  - `0 12 * * *` = Noon UTC
  - `0 */6 * * *` = Every 6 hours

**Cron Expression Guide:**
```
* * * * *
│ │ │ │ │
│ │ │ │ └─── Day of week (0-7, 0 & 7 = Sunday)
│ │ │ └───── Month (1-12)
│ │ └─────── Day of month (1-31)
│ └───────── Hour (0-23)
└─────────── Minute (0-59)
```

---

## 🔐 Security Best Practices

### 1. Secure Your Cron Endpoint

The cron endpoint verifies the `CRON_SECRET`:

```typescript
const authHeader = request.headers.get('authorization');
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

Generate a strong secret:
```bash
openssl rand -base64 32
```

### 2. Protect Admin Endpoints

Consider adding authentication to `/api/admin/*` endpoints:
- Use Vercel's password protection
- Add custom middleware
- Use authentication service (Auth0, Clerk, etc.)

### 3. Rate Limiting

For production, add rate limiting to public endpoints:
```bash
npm install @upstash/ratelimit @upstash/redis
```

---

## 📊 Monitoring & Debugging

### View Cron Job Logs:
1. Vercel Dashboard → Your Project
2. **Deployments** → Select deployment
3. **Functions** → Find `daily-sync`
4. View execution logs

### Check Sync Status:
```bash
curl https://your-app.vercel.app/api/admin/sync
```

Response:
```json
{
  "lastSync": {
    "id": 123,
    "last_sync_date": "2026-01-05",
    "status": "success",
    "messages_synced": 15
  },
  "currentTime": "2026-01-05T16:30:00.000Z"
}
```

### Common Issues:

**Issue**: Cron job not running
- **Solution**: Verify `vercel.json` is in project root
- **Solution**: Redeploy after adding `vercel.json`

**Issue**: "DUNE_API_KEY not set"
- **Solution**: Add environment variable in Vercel Dashboard
- **Solution**: Redeploy after adding variables

**Issue**: Database connection errors
- **Solution**: Ensure Postgres database is created
- **Solution**: Check `POSTGRES_*` variables are set

---

## 🧪 Testing Locally

### 1. Start Development Server:
```bash
npm run dev
```

### 2. Test Cron Endpoint:
```bash
curl http://localhost:3000/api/cron/daily-sync
```

### 3. Test Admin Sync:
```bash
curl -X POST http://localhost:3000/api/admin/sync \
  -H "Content-Type: application/json" \
  -d '{"startDate": "2025-12-28", "endDate": "2025-12-31"}'
```

### 4. Run Test Suite:
```bash
python test_dashboard.py
```

---

## 📈 Scaling Considerations

### Free Tier Limits:
- **Vercel Postgres**: 256 MB storage, 60 hours compute
- **Vercel Functions**: 100 GB-hours
- **Vercel Cron**: Unlimited executions

### Upgrade When:
- Database > 256 MB → Upgrade Postgres plan
- High traffic → Add rate limiting
- Need faster syncs → Increase function timeout

---

## 🎯 Summary

**How Data Stays Updated:**

1. **Price Updates**: Real-time via API on every page load (60s cache)
2. **Message Data**: Automated daily sync at 2 AM UTC via Vercel Cron
3. **Manual Trigger**: Anytime via `/api/admin/sync` endpoint

**Deployment Checklist:**

- ✅ Set `DUNE_API_KEY` environment variable
- ✅ Set `CRON_SECRET` environment variable
- ✅ Create Vercel Postgres database
- ✅ Deploy to Vercel
- ✅ Run initial sync via admin endpoint
- ✅ Verify cron job runs (check logs after 2 AM UTC)

**Your dashboard is now fully automated! 🎉**

---

## 🔗 Useful Links

- **Vercel Cron Jobs**: https://vercel.com/docs/cron-jobs
- **Vercel Postgres**: https://vercel.com/docs/storage/vercel-postgres
- **Dune API Docs**: https://docs.dune.com/api-reference/
- **CoinGecko API**: https://www.coingecko.com/en/api/documentation

---

**Questions? Issues?**
- Check logs in Vercel Dashboard
- Run `python verify_db.py` locally
- Test endpoints with `python test_dashboard.py`

# 🔄 Auto-Update System Summary

## ✨ How Your Dashboard Stays Updated

Your LayerZero Fee Switch Tracker has **two automatic update mechanisms**:

---

## 1. 💰 **Real-Time ZRO Price Updates**

### How It Works:
- **Trigger**: Every time someone visits the dashboard
- **API**: CoinGecko free API (no key needed)
- **Cache**: 60 seconds
- **Location**: Happens in `/api/metrics` endpoint

### What Happens:
```
User visits dashboard
    ↓
Frontend calls /api/metrics
    ↓
API calls getCurrentZROPrice()
    ↓
Fetches live price from CoinGecko
    ↓
Returns data with current price
    ↓
Dashboard displays $X.XX (live price!)
```

### Code:
```typescript
// lib/coingecko-api.ts
export async function getCurrentZROPrice(): Promise<number> {
  const response = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=layerzero&vs_currencies=usd`,
    { next: { revalidate: 60 } } // 60 second cache
  );
  const data = await response.json();
  return data.layerzero?.usd || 3.50;
}
```

**Result**: Users always see the latest ZRO price (updated every 60 seconds max).

---

## 2. 📊 **Automated Daily Fee Data Sync**

### How It Works:
- **Trigger**: Vercel Cron Job (automatically runs daily)
- **Schedule**: 2:00 AM UTC every day
- **Data Source**: Dune Analytics API (LayerZero messages + fees)
- **Location**: `/api/cron/daily-sync` endpoint

### What Happens:
```
2:00 AM UTC Daily
    ↓
Vercel Cron triggers /api/cron/daily-sync
    ↓
System checks last sync date
    ↓
Fetches new data from Dune Analytics
    │  - Message counts
    │  - Total fees (executor + DVN)
    │  - Median fees
    ↓
Fetches historical ZRO prices from CoinGecko
    ↓
Calculates: totalFeeUSD = messageCount × avgFee
    ↓
Inserts/updates database records
    ↓
Logs sync status (success/error)
    ↓
Done! ✅
```

### Configuration:
**File**: `vercel.json`
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

**Endpoint**: `app/api/cron/daily-sync/route.ts`
- Fetches data since last sync
- Updates database
- Logs results
- Handles errors gracefully

---

## 🔐 **Required Setup**

### Environment Variables:

Add these to Vercel (or `.env.local` for local dev):

```bash
# REQUIRED: Dune Analytics API Key
DUNE_API_KEY=your_dune_api_key_here
# Get yours at: https://dune.com/settings/api

# RECOMMENDED: Cron job security
CRON_SECRET=random_secret_string_here
# Generate with: openssl rand -base64 32

# AUTO-SET by Vercel when you create Postgres database:
POSTGRES_URL=...
POSTGRES_PRISMA_URL=...
# (and other Postgres variables)
```

---

## 📦 **Deployment Steps**

### 1. Get Dune API Key
1. Visit https://dune.com/settings/api
2. Create a new API key (free tier available)
3. Copy the key

### 2. Deploy to Vercel
```bash
# Option A: GitHub Integration (Recommended)
1. Push code to GitHub
2. Import project in Vercel Dashboard
3. Vercel auto-deploys on push

# Option B: Vercel CLI
vercel --prod
```

### 3. Add Environment Variables
In Vercel Dashboard → Settings → Environment Variables:
- Add `DUNE_API_KEY`
- Add `CRON_SECRET` (generate with `openssl rand -base64 32`)

### 4. Create Vercel Postgres Database
1. Vercel Dashboard → Storage → Create Database
2. Choose **Postgres**
3. Select **Free Plan**
4. Environment variables auto-added!

### 5. Run Initial Sync
Trigger the first data sync:

**Option A**: Visit in browser
```
https://your-app.vercel.app/api/admin/sync
```

**Option B**: Use cURL
```bash
curl -X POST https://your-app.vercel.app/api/admin/sync \
  -H "Content-Type: application/json" \
  -d '{"startDate": "2024-12-27", "endDate": "2026-01-05", "force": true}'
```

### 6. Verify
- **Check Dashboard**: https://your-app.vercel.app
- **Check Sync Status**: https://your-app.vercel.app/api/admin/sync (GET request)
- **Check Cron Logs**: Vercel Dashboard → Functions → daily-sync

---

## 🎯 **What Gets Updated Automatically**

| Data Type | Update Frequency | Source | Method |
|-----------|------------------|--------|--------|
| **Current ZRO Price** | Every 60 seconds | CoinGecko API | Real-time on page load |
| **Message Counts** | Daily at 2 AM UTC | Dune Analytics | Automated cron job |
| **Total Fees** | Daily at 2 AM UTC | Dune Analytics | Automated cron job |
| **Historical Prices** | Daily at 2 AM UTC | CoinGecko API | Automated cron job |

---

## 🔧 **Manual Sync Options**

You can always trigger a manual sync if needed:

### Via Admin API:
```bash
# Sync today's data
curl -X POST https://your-app.vercel.app/api/admin/sync

# Sync specific range
curl -X POST https://your-app.vercel.app/api/admin/sync \
  -H "Content-Type: application/json" \
  -d '{"startDate": "2025-12-20", "endDate": "2026-01-05"}'
```

### Via Local Python Scripts:
```bash
# Update prices from CryptoCompare
python fetch_zro_cryptocompare.py
python import_zro_prices.py

# Verify database
python verify_db.py
```

---

## 📊 **Monitoring**

### Check Sync Status:
```bash
curl https://your-app.vercel.app/api/admin/sync
```

Response:
```json
{
  "lastSync": {
    "last_sync_date": "2026-01-05",
    "status": "success",
    "messages_synced": 15
  },
  "currentTime": "2026-01-05T16:30:00.000Z"
}
```

### View Cron Logs:
1. Vercel Dashboard → Deployments
2. Select latest deployment
3. Functions → `daily-sync`
4. View execution logs

---

## 🎉 **Result**

Once deployed, your dashboard:

✅ **Shows live ZRO price** - Updated every 60 seconds
✅ **Auto-syncs daily** - New message data fetched at 2 AM UTC
✅ **Calculates burns** - Using latest fees and prices
✅ **No manual work** - Runs completely automatically
✅ **Logs everything** - Track sync status and errors
✅ **Always current** - Users see up-to-date data

---

## 🔍 **Data Flow Diagram**

```
┌─────────────────────────────────────────────────────┐
│                   USER VISITS DASHBOARD             │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
         ┌────────────────────────┐
         │  Frontend (Next.js)    │
         └──────────┬─────────────┘
                    │
                    ▼
         ┌────────────────────────┐
         │ API: /api/metrics      │
         │ (Fetch data + price)   │
         └──────────┬─────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
        ▼                       ▼
┌───────────────┐      ┌─────────────────┐
│ Database      │      │ CoinGecko API   │
│ (Postgres)    │      │ getCurrentPrice │
│ Get metrics   │      │ (60s cache)     │
└───────────────┘      └─────────────────┘
        │                       │
        └───────────┬───────────┘
                    │
                    ▼
         ┌────────────────────────┐
         │  Return JSON to User   │
         │  - Historical data     │
         │  - Current price       │
         └────────────────────────┘


┌─────────────────────────────────────────────────────┐
│              DAILY AT 2 AM UTC                      │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
         ┌────────────────────────┐
         │  Vercel Cron Trigger   │
         │  /api/cron/daily-sync  │
         └──────────┬─────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
        ▼                       ▼
┌───────────────┐      ┌─────────────────┐
│ Dune API      │      │ CoinGecko API   │
│ Get messages  │      │ Get historical  │
│ Get fees      │      │ prices          │
└───────┬───────┘      └────────┬────────┘
        │                       │
        └───────────┬───────────┘
                    │
                    ▼
         ┌────────────────────────┐
         │  Process & Calculate   │
         │  totalFeeUSD = msg×fee │
         └──────────┬─────────────┘
                    │
                    ▼
         ┌────────────────────────┐
         │  Update Database       │
         │  Insert/Update Records │
         └──────────┬─────────────┘
                    │
                    ▼
         ┌────────────────────────┐
         │  Log Sync Status       │
         │  (success/error)       │
         └────────────────────────┘
```

---

## 💡 **Key Points**

1. **Zero Manual Work**: Once deployed, everything runs automatically
2. **Real-Time Prices**: Users always see current ZRO price
3. **Daily Updates**: New message/fee data synced overnight
4. **Reliable**: Error handling + logging for debugging
5. **Secure**: Cron secret prevents unauthorized access
6. **Scalable**: Runs on Vercel's serverless infrastructure

---

## 🚀 **Next Steps**

1. **Get Dune API Key**: https://dune.com/settings/api
2. **Deploy to Vercel**: Push to GitHub, import in Vercel
3. **Set Environment Variables**: Add `DUNE_API_KEY` and `CRON_SECRET`
4. **Create Postgres DB**: In Vercel Storage tab
5. **Run Initial Sync**: Call `/api/admin/sync` once
6. **Monitor**: Check logs after 2 AM UTC tomorrow

**That's it! Your dashboard will now stay updated automatically! 🎉**

---

For detailed deployment instructions, see: `DEPLOYMENT_GUIDE.md`

#  Quick Start - Auto-Updating Dashboard

##  How Updates Work (TL;DR)

**Your dashboard automatically stays updated in two ways:**

1. ** Real-Time Price**: ZRO price fetched from CoinGecko on every page load (60s cache)
2. ** Daily Data Sync**: New messages + fees synced from Dune Analytics at 2 AM UTC daily

**You don't need to do anything after deployment! **

---

## 🚀 5-Minute Deployment

### 1. Get Dune API Key (2 min)
```
1. Visit https://dune.com/settings/api
2. Click "Create API Key"
3. Copy the key
```

### 2. Deploy to Vercel (1 min)
```
1. Push code to GitHub
2. Import in Vercel Dashboard
3. Auto-deploys!
```

### 3. Set Environment Variables (1 min)
In Vercel Dashboard → Settings → Environment Variables:
```bash
DUNE_API_KEY=your_key_here
CRON_SECRET=$(openssl rand -base64 32)
```

### 4. Create Database (30 sec)
```
Vercel Dashboard → Storage → Create → Postgres → Free Plan
```

### 5. Run Initial Sync (30 sec)
```bash
curl -X POST https://your-app.vercel.app/api/admin/sync \
  -H "Content-Type: application/json" \
  -d '{"startDate": "2024-12-27", "endDate": "2026-01-05", "force": true}'
```

**Done! 🎉 Your dashboard now auto-updates!**

---

## 📋 Environment Variables

| Variable | Purpose | Get From |
|----------|---------|----------|
| `DUNE_API_KEY` | Fetch LayerZero data | https://dune.com/settings/api |
| `CRON_SECRET` | Secure cron endpoint | `openssl rand -base64 32` |
| `POSTGRES_*` | Database connection | Auto-set by Vercel |

---

## 🔄 Update Schedule

| What | When | How |
|------|------|-----|
| **ZRO Price** | Every 60s | Real-time API call |
| **Message Data** | Daily 2 AM UTC | Automated cron job |
| **Manual Sync** | Anytime | Call `/api/admin/sync` |

---

## 🧪 Test It Works

### Check Dashboard:
```
https://your-app.vercel.app
```

### Check API:
```bash
curl "https://your-app.vercel.app/api/metrics?start=2025-12-28&end=2025-12-31"
```

### Check Sync Status:
```bash
curl https://your-app.vercel.app/api/admin/sync
```

---

## 🎯 Manual Sync (If Needed)

```bash
# Sync latest data
curl -X POST https://your-app.vercel.app/api/admin/sync

# Sync specific dates
curl -X POST https://your-app.vercel.app/api/admin/sync \
  -H "Content-Type: application/json" \
  -d '{"startDate": "2025-12-20", "endDate": "2026-01-05"}'
```

---

## 📊 What You'll See

**After successful deployment:**
- ✅ Live ZRO price on every page load
- ✅ New data synced every morning at 2 AM UTC
- ✅ Burn calculations updated automatically
- ✅ Charts showing latest trends
- ✅ Predictive analysis with current data

---

## 🔍 Monitoring

**View Cron Logs:**
```
Vercel Dashboard → Deployments → Functions → daily-sync
```

**Check Last Sync:**
```bash
curl https://your-app.vercel.app/api/admin/sync
```

---

## 📚 Full Documentation

- **Complete Deployment Guide**: `DEPLOYMENT_GUIDE.md`
- **Auto-Update Details**: `AUTO_UPDATE_SUMMARY.md`
- **Integration Summary**: `INTEGRATION_SUMMARY.md`

---

## 🎉 You're Done!

Your dashboard is now:
- ✅ **Fully automated**
- ✅ **Real-time price updates**
- ✅ **Daily data sync**
- ✅ **Zero maintenance**

**Just deploy and forget! 🚀**

# LayerZero Shadow Burn Dashboard 🔥

A Next.js dashboard that tracks missed ZRO token revenue since LayerZero's Fee Switch votes failed. The dashboard analyzes protocol fees that could have been captured if the fee switch had been activated.

[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

## Overview

LayerZero conducts Fee Switch votes every 6 months (starting December 2024). When these votes pass, protocol fees would be captured and used for ZRO token burns. This dashboard tracks the **opportunity cost** of failed votes by calculating how much revenue has been missed.

### Vote History

- **Vote 1** - December 20-27, 2024: ❌ Failed
- **Vote 2** - June 20-27, 2025: ❌ Failed
- **Vote 3** - December 20-27, 2025: ❌ Failed

**Current Missed Burn**: Over **3.4 million ZRO tokens** ($8M+ in fees)

---

## ✨ Features

### Data & Analytics
- **Real-Time Price Updates**: Live ZRO price from CoinGecko (60s cache)
- **Automated Daily Sync**: Fetches new data from Dune Analytics at 2 AM UTC daily
- **Historical Accuracy**: Uses actual ZRO price at time of transaction for burn calculations
- **Vote Period Selector**: Switch between all 3 vote periods to compare metrics
- **Total Fee Tracking**: Direct calculation from cumulative daily fees

### Visualizations
- Cumulative missed burn over time (area chart)
- Daily message volume and burn amounts (dual-axis line chart)
- Historical ZRO price movement
- Predictive modeling with linear regression (1-90 days forecast)

### Auto-Update System
- **Real-Time**: ZRO price refreshes every 60 seconds
- **Daily Sync**: Automated cron job syncs new LayerZero data
- **Zero Maintenance**: Fully automated after deployment
- **Error Handling**: Comprehensive logging and fallback mechanisms

---

## 🚀 Quick Start

### 5-Minute Deployment to Vercel

1. **Get Dune API Key** (2 min)
   - Visit https://dune.com/settings/api
   - Create a free API key
   - Copy the key

2. **Deploy** (1 min)
   - Push code to GitHub
   - Import to Vercel Dashboard
   - Auto-deploys!

3. **Set Environment Variables** (1 min)
   ```bash
   DUNE_API_KEY=your_key_here
   CRON_SECRET=$(openssl rand -base64 32)
   ```

4. **Create Database** (30 sec)
   - Vercel Dashboard → Storage → Postgres → Free Plan

5. **Run Initial Sync** (30 sec)
   ```bash
   curl -X POST https://your-app.vercel.app/api/admin/sync \
     -H "Content-Type: application/json" \
     -d '{"startDate": "2024-12-27", "endDate": "2026-01-05", "force": true}'
   ```

**Done!** Your dashboard now auto-updates daily! 🎉

📚 **Detailed Instructions**: See [QUICK_START.md](QUICK_START.md)

---

## 🏗️ Tech Stack

- **Framework**: Next.js 14 (App Router) + TypeScript
- **Database**: Vercel Postgres (production) / SQLite (local dev)
- **Data Source**: Dune Analytics API (layerzero.messages dataset)
- **Price Data**: CoinGecko API + CryptoCompare API
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn/UI + Radix UI
- **Charts**: Recharts
- **Analytics**: simple-statistics (linear regression)
- **Automation**: Vercel Cron Jobs

---

## 🔄 How Auto-Updates Work

### Real-Time Price Updates (Every 60s)
```
User visits dashboard → API calls CoinGecko → Returns live price → Display
```
- **Source**: CoinGecko API (free, no key needed)
- **Cache**: 60 seconds
- **Fallback**: $3.50 if API fails

### Automated Daily Sync (2 AM UTC)
```
Vercel Cron → Check last sync → Fetch from Dune → Get prices → Update DB
```
- **Schedule**: Daily at 2:00 AM UTC (configurable)
- **Data**: LayerZero messages + fees from Dune Analytics
- **Prices**: Historical ZRO prices from CoinGecko
- **Duration**: ~30-60 seconds per sync

📚 **Detailed Explanation**: See [AUTO_UPDATE_SUMMARY.md](AUTO_UPDATE_SUMMARY.md)

---

## 📁 Project Structure

```
├── app/
│   ├── page.tsx                          # Main dashboard UI
│   ├── layout.tsx                        # Root layout
│   └── api/
│       ├── metrics/route.ts              # Public metrics API
│       ├── cron/
│       │   └── daily-sync/route.ts       # Automated daily sync (NEW!)
│       └── admin/
│           ├── init/route.ts             # Database initialization
│           └── sync/route.ts             # Manual sync endpoint
│
├── lib/
│   ├── dune-api.ts                      # Dune Analytics integration
│   ├── coingecko-api.ts                 # ZRO price fetching
│   ├── vote-config.ts                   # Vote period configuration
│   ├── shadow-burn-calc.ts              # Burn calculation (simplified!)
│   ├── prediction.ts                    # ML prediction functions
│   ├── api-client.ts                    # Frontend API client
│   ├── mock-api.ts                      # Type definitions
│   └── db/
│       ├── index.ts                     # Database initialization
│       └── queries.ts                   # Database queries
│
├── components/ui/                        # Shadcn/UI components
│
├── data/
│   └── shadow-burn.db                   # SQLite database (local dev)
│
├── Python Scripts (Data Management)
│   ├── fetch_zro_cryptocompare.py       # Fetch ZRO prices (WORKING!)
│   ├── fetch_zro_multi_source.py        # Multi-source price fetcher
│   ├── import_zro_prices.py             # Import prices to DB
│   ├── verify_db.py                     # Database verification
│   └── test_dashboard.py                # API test suite
│
├── Documentation
│   ├── README.md                         # This file
│   ├── QUICK_START.md                    # 5-minute deployment guide
│   ├── DEPLOYMENT_GUIDE.md               # Complete deployment instructions
│   ├── AUTO_UPDATE_SUMMARY.md            # Auto-update system details
│   └── INTEGRATION_SUMMARY.md            # Technical integration docs
│
├── vercel.json                          # Vercel cron configuration (NEW!)
└── .env.local                           # Environment variables
```

---

## 📊 How It Works

### Fee Calculation (Simplified!)

**Previous**: Per-message fee × message count
**Now**: Direct total fee calculation

```typescript
// Total daily fees from Dune Analytics
totalFeeUSD = sum(usd_executor_fee + usd_dvn_fee) for all messages on date

// Burn calculation
burnAmount = totalFeeUSD / zroPrice
```

**Benefits:**
- More accurate (uses actual cumulative fees)
- Simpler codebase (no median/average toggle)
- Faster calculations

### Data Pipeline

```
┌─────────────────────────────────────────────────────────┐
│              AUTOMATED DAILY (2 AM UTC)                 │
└─────────────────────┬───────────────────────────────────┘
                      │
        ┌─────────────┴─────────────┐
        │                           │
        ▼                           ▼
┌───────────────────┐      ┌────────────────────┐
│  Dune Analytics   │      │  CoinGecko API     │
│  - Message counts │      │  - Historical      │
│  - Protocol fees  │      │    ZRO prices      │
└─────────┬─────────┘      └──────────┬─────────┘
          │                           │
          └──────────┬────────────────┘
                     │
                     ▼
          ┌─────────────────────┐
          │  Vercel Postgres    │
          │  - daily_metrics    │
          │  - sync_status      │
          └──────────┬──────────┘
                     │
                     ▼
          ┌─────────────────────┐
          │  Dashboard API      │
          │  /api/metrics       │
          └──────────┬──────────┘
                     │
                     ▼
          ┌─────────────────────┐
          │  Frontend Charts    │
          │  Real-time display  │
          └─────────────────────┘
```

---

## 🔧 Environment Variables

### Required for Production:

```bash
# Dune Analytics API Key (REQUIRED)
# Get from: https://dune.com/settings/api
DUNE_API_KEY=your_dune_api_key_here

# Cron Job Security (RECOMMENDED)
# Generate with: openssl rand -base64 32
CRON_SECRET=your_random_secret_string

# Vercel Postgres (AUTO-SET by Vercel)
POSTGRES_URL=...
POSTGRES_PRISMA_URL=...
POSTGRES_URL_NON_POOLING=...
POSTGRES_USER=...
POSTGRES_HOST=...
POSTGRES_PASSWORD=...
POSTGRES_DATABASE=...
```

### Local Development:

```bash
# Create .env.local in project root
DUNE_API_KEY=your_dune_api_key_here
```

---

## 🛠️ Local Development

### Prerequisites
- Node.js 18+
- Python 3.10+ (for data scripts)

### Setup

1. **Install Dependencies**
   ```bash
   npm install
   pip install requests pandas yfinance  # For Python scripts
   ```

2. **Configure Environment**
   ```bash
   # Create .env.local
   echo "DUNE_API_KEY=your_key_here" > .env.local
   ```

3. **Fetch Initial Data**
   ```bash
   # Option A: Python script (fetch prices)
   python fetch_zro_cryptocompare.py
   python import_zro_prices.py

   # Option B: API endpoint (fetch everything)
   npm run dev  # Start server first
   curl -X POST http://localhost:3000/api/admin/sync \
     -H "Content-Type: application/json" \
     -d '{"startDate": "2024-12-27", "endDate": "2026-01-05", "force": true}'
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

   Open http://localhost:3000

5. **Verify Setup**
   ```bash
   python verify_db.py      # Check database
   python test_dashboard.py  # Test API endpoints
   ```

---

## 📝 Available Scripts

### Development
```bash
npm run dev              # Start dev server
npm run build            # Build for production
npm start                # Start production server
npm run lint             # Run ESLint
```

### Data Management (Python)
```bash
# Fetch latest ZRO prices
python fetch_zro_cryptocompare.py

# Import prices to database
python import_zro_prices.py

# Verify database integrity
python verify_db.py

# Test API endpoints
python test_dashboard.py
```

### API Endpoints
```bash
# Get metrics (date range required)
curl "http://localhost:3000/api/metrics?start=2025-12-28&end=2025-12-31"

# Manual sync (POST)
curl -X POST http://localhost:3000/api/admin/sync

# Sync specific dates
curl -X POST http://localhost:3000/api/admin/sync \
  -H "Content-Type: application/json" \
  -d '{"startDate": "2025-01-01", "endDate": "2025-01-05"}'

# Check sync status (GET)
curl http://localhost:3000/api/admin/sync

# Trigger cron job manually (for testing)
curl http://localhost:3000/api/cron/daily-sync
```

---

## 🚀 Deployment

### Vercel (Recommended)

**Why Vercel?**
- Native cron job support
- Free Postgres database
- Automatic HTTPS
- Global CDN
- Zero-config deployment

**Steps:**
1. Push to GitHub
2. Import to Vercel
3. Add environment variables (`DUNE_API_KEY`, `CRON_SECRET`)
4. Create Postgres database (Storage tab)
5. Run initial sync
6. Done! Cron job runs automatically

📚 **Complete Guide**: [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)

### Self-Hosted

**Requirements:**
- Node.js server
- PostgreSQL database
- Cron daemon (for scheduled syncs)

**Setup:**
```bash
# Build
npm run build

# Set environment variables
export DUNE_API_KEY=your_key
export POSTGRES_URL=postgresql://...

# Run migrations (if needed)
# Setup database schema

# Start server
npm start

# Add to crontab (sync daily at 2 AM)
0 2 * * * cd /path/to/app && curl http://localhost:3000/api/cron/daily-sync
```

---

## 🎯 Key Metrics Tracked

| Metric | Description | Source |
|--------|-------------|--------|
| **Total Messages** | LayerZero cross-chain messages | Dune Analytics |
| **Total Cumulative Fees** | Sum of all protocol fees (USD) | Dune Analytics |
| **Current ZRO Price** | Real-time token price | CoinGecko API |
| **Potential Burn** | totalFeeUSD / zroPrice | Calculated |
| **Hypothetical Cost per ZRO** | Average revenue per token | Calculated |

### Current Stats (as of Jan 2026):
- **16.7M+ messages** processed
- **$8M+ in fees** collected
- **3.4M ZRO** potential burn
- **Average price**: $2.35 per ZRO

---

## 🧪 Testing

### Run Test Suite
```bash
# Start dev server
npm run dev

# In another terminal
python test_dashboard.py
```

**Tests Include:**
- ✅ Homepage load
- ✅ Metrics API with date range
- ✅ Vote period data
- ✅ Error handling
- ✅ Data completeness

### Manual Testing
```bash
# Test metrics API
curl "http://localhost:3000/api/metrics?start=2025-12-28&end=2025-12-31"

# Test sync endpoint
curl -X POST http://localhost:3000/api/admin/sync

# Check database
python verify_db.py
```

---

## 🐛 Troubleshooting

### Common Issues

**"DUNE_API_KEY not set"**
- Create `.env.local` with your Dune API key
- Restart dev server

**"Database connection failed"**
- For local dev: SQLite auto-creates `data/shadow-burn.db`
- For production: Ensure Postgres database is created in Vercel

**"No data showing on dashboard"**
- Run initial sync: `curl -X POST http://localhost:3000/api/admin/sync`
- Check browser console for errors
- Verify API key is correct

**"Cron job not running"**
- Ensure `vercel.json` is in project root
- Redeploy after adding cron config
- Check logs in Vercel Dashboard → Functions

**"401 Unauthorized from Dune"**
- API key invalid or expired
- Get new key from https://dune.com/settings/api

---

## 📚 Documentation

- **[QUICK_START.md](QUICK_START.md)** - 5-minute deployment guide
- **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** - Complete deployment instructions
- **[AUTO_UPDATE_SUMMARY.md](AUTO_UPDATE_SUMMARY.md)** - How auto-updates work
- **[INTEGRATION_SUMMARY.md](INTEGRATION_SUMMARY.md)** - Technical integration details

---

## 🎨 Dashboard Features

### Vote Period Selector
- Dropdown to select which failed vote to analyze
- All metrics and charts update automatically
- Date ranges adjust to show data from vote end date to today

### Key Metric Cards
- **Total Messages**: Count of cross-chain messages
- **Total Cumulative Fees**: Sum of all fees collected
- **Current ZRO Price**: Live price from CoinGecko
- **Avg Cost per ZRO**: Revenue per token burned

### Interactive Charts
- **Cumulative Burn**: Area chart showing total missed burn over time
- **Daily Metrics**: Dual-axis line chart (messages + daily burn)
- **Price History**: Historical ZRO price movement

### Predictive Analysis
- **Volume Trend**: Increasing/decreasing/stable analysis
- **Future Projection**: 1-90 day burn forecast
- **Combined Totals**: Retrospective + predictive burn amounts

---

## 🔐 Security

### Cron Job Protection
The cron endpoint verifies the `CRON_SECRET` in production:

```typescript
const authHeader = request.headers.get('authorization');
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

### API Security
- Public endpoints: Read-only metrics
- Admin endpoints: Should add authentication (Auth0, Clerk, etc.)
- Rate limiting: Consider adding for production

---

## 📈 Monitoring

### View Cron Logs
1. Vercel Dashboard → Your Project
2. Deployments → Select deployment
3. Functions → `daily-sync`
4. View execution logs

### Check Sync Status
```bash
curl https://your-app.vercel.app/api/admin/sync
```

### Monitor Database
```bash
# Local
python verify_db.py

# Production
# Use Vercel Postgres dashboard
```

---

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details

---

## 🙏 Acknowledgments

- **Dune Analytics** - For providing the layerzero.messages dataset
- **CoinGecko & CryptoCompare** - For historical ZRO price data
- **LayerZero** - For building awesome cross-chain infrastructure
- **Vercel** - For seamless deployment and cron job support

---

## 🔗 Useful Links

- **Dune Analytics**: https://dune.com
- **LayerZero Docs**: https://docs.layerzero.network
- **CoinGecko API**: https://www.coingecko.com/en/api
- **Vercel Cron**: https://vercel.com/docs/cron-jobs
- **Next.js Docs**: https://nextjs.org/docs

---

**Built with ❤️ for the LayerZero community**

**Questions?** Check the documentation files or open an issue!

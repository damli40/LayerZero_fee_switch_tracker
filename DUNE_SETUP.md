# Dune Analytics Setup Guide

The dashboard now uses **Dune Analytics** instead of LayerZero Scan API to fetch fee data. This provides:
- ✅ Pre-aggregated data (faster)
- ✅ No rate limits on data fetching
- ✅ Accurate USD-denominated fees
- ✅ Both executor and DVN fees included

## Getting Your Dune API Key

1. **Create a Dune account** (if you don't have one):
   - Go to https://dune.com/
   - Sign up for a free account

2. **Get your API key**:
   - Go to https://dune.com/settings/api
   - Create a new API key
   - Copy the key (starts with something like `dune_...`)

3. **Add the key to your project**:
   - Create a file called `.env.local` in the project root
   - Add this line:
     ```
     DUNE_API_KEY=your_dune_api_key_here
     ```
   - Replace `your_dune_api_key_here` with your actual key

## How It Works

### Data Source
The integration queries the `layerzero.messages` dataset on Dune, which includes:
- `ts_source`: Timestamp of the message
- `usd_executor_fee`: Executor fee in USD
- `usd_dvn_fee`: DVN (Data Verification Network) fee in USD

### Fee Calculation
```
Protocol Fee = usd_executor_fee + usd_dvn_fee
```

Simple! No division needed - these are the actual protocol fees.

### SQL Query
The code executes this SQL on Dune:
```sql
SELECT
  DATE_TRUNC('day', ts_source) as date,
  COUNT(*) as message_count,
  SUM(usd_executor_fee) as total_executor_fees,
  SUM(usd_dvn_fee) as total_dvn_fees
FROM layerzero.messages
WHERE ts_source >= TIMESTAMP '2025-12-27'
  AND ts_source < TIMESTAMP '2026-01-04' + INTERVAL '1' DAY
GROUP BY DATE_TRUNC('day', ts_source)
ORDER BY date ASC
```

### Process Flow
1. **Execute Query**: Submits SQL to Dune API
2. **Get Execution ID**: Dune returns an execution ID
3. **Poll for Results**: Polls every 2 seconds until query completes
4. **Parse Data**: Extracts daily metrics and calculates per-message averages
5. **Store in Database**: Saves to SQLite for fast dashboard access

## Usage

Once you have your `.env.local` file set up:

```bash
# Initialize database with Dune data
npm run db:init

# Daily sync
npm run db:sync
```

The sync will:
- Query Dune for data from Dec 27, 2025 onwards
- Calculate protocol fees (executor + DVN)
- Fetch ZRO prices from CoinGecko
- Store everything in the local database

## Advantages Over LayerZero Scan

| Feature | LayerZero Scan | Dune Analytics |
|---------|---------------|----------------|
| Data Format | Raw messages | Pre-aggregated |
| Fees | Need to calculate | Already in USD |
| Rate Limits | Strict (caused errors) | Generous |
| Query Speed | Slow (pagination) | Fast (SQL) |
| Data Quality | Raw blockchain | Cleaned & verified |

## Troubleshooting

**Error: "DUNE_API_KEY environment variable is not set"**
- Make sure you created `.env.local` file
- Check that the file is in the project root (same folder as `package.json`)
- Restart the dev server after creating the file

**Error: "Dune API execution failed: 401"**
- Your API key is invalid or expired
- Get a new key from https://dune.com/settings/api

**Error: "Dune query timeout"**
- The query is taking too long (>2 minutes)
- Try a smaller date range
- Check Dune's status page

## API Limits

Dune's free tier includes:
- ✅ Unlimited API calls
- ✅ Medium-sized queries
- ✅ All public datasets

For larger queries or faster performance, consider Dune's paid plans.

## Code Files

- **`lib/dune-api.ts`** - Dune API client with query execution and polling
- **`app/api/admin/sync/route.ts`** - Updated to use Dune instead of LayerZero Scan
- **`.env.local`** - Your API key (create this file, not in git)

Enjoy your faster, more reliable data fetching! 🚀

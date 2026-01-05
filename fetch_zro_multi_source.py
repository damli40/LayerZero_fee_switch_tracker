"""
Enhanced ZRO Price Data Fetcher
Tries multiple sources: Yahoo Finance, CryptoCompare, CoinGecko
Falls back to available sources if primary fails
"""

import requests
import pandas as pd
import time
from datetime import datetime, timedelta
import sys

# Configuration
TARGET_DATES = {
    "start": datetime(2024, 12, 27),
    "end": datetime(2026, 1, 5)
}

DELAY_SECONDS = 1.5  # Delay between API requests


def try_yahoo_finance():
    """
    Try to fetch ZRO data from Yahoo Finance
    """
    print("\n" + "="*70)
    print("[Source 1] Trying Yahoo Finance...")
    print("="*70)

    try:
        import yfinance as yf

        # Try different ticker symbols for LayerZero
        tickers = ["ZRO-USD", "ZROUSD", "ZRO"]

        for ticker in tickers:
            print(f"Trying ticker: {ticker}")

            try:
                zro = yf.Ticker(ticker)

                # Fetch historical data
                hist = zro.history(
                    start=TARGET_DATES["start"].strftime("%Y-%m-%d"),
                    end=TARGET_DATES["end"].strftime("%Y-%m-%d"),
                    interval="1d"
                )

                if not hist.empty:
                    print(f"  [SUCCESS] Found data for {ticker}")
                    print(f"  Retrieved {len(hist)} days")

                    # Format data
                    df = hist.reset_index()
                    df["date"] = pd.to_datetime(df["Date"]).dt.date
                    df = df.rename(columns={
                        "Open": "open",
                        "High": "high",
                        "Low": "low",
                        "Close": "close"
                    })

                    # Calculate average and daily_avg
                    df["average"] = (df["open"] + df["close"]) / 2
                    df["daily_avg"] = (df["high"] + df["low"]) / 2

                    # Select relevant columns
                    result = df[["date", "low", "high", "average", "open", "close", "daily_avg"]]

                    return result, "Yahoo Finance"

            except Exception as e:
                print(f"  [SKIP] {ticker} failed: {e}")
                continue

        print("  [FAILED] No valid ticker found on Yahoo Finance")
        return None, None

    except ImportError:
        print("  [SKIP] yfinance library not installed")
        print("  Install with: pip install yfinance")
        return None, None
    except Exception as e:
        print(f"  [FAILED] Error: {e}")
        return None, None


def try_cryptocompare():
    """
    Try to fetch ZRO data from CryptoCompare
    """
    print("\n" + "="*70)
    print("[Source 2] Trying CryptoCompare API...")
    print("="*70)

    try:
        base_url = "https://min-api.cryptocompare.com/data/v2/histoday"

        # CryptoCompare returns max 2000 days at a time
        all_data = []
        current_date = TARGET_DATES["start"]

        while current_date < TARGET_DATES["end"]:
            timestamp = int(current_date.timestamp())

            params = {
                "fsym": "ZRO",
                "tsym": "USD",
                "limit": 2000,
                "toTs": timestamp
            }

            print(f"Fetching data up to {current_date.date()}...")
            response = requests.get(base_url, params=params, timeout=30)

            if response.status_code == 200:
                data = response.json()

                if data.get("Response") == "Success":
                    historical_data = data.get("Data", {}).get("Data", [])

                    if historical_data:
                        all_data.extend(historical_data)
                        print(f"  [OK] Retrieved {len(historical_data)} days")

                        # Move to next chunk
                        current_date += timedelta(days=2000)

                        if current_date < TARGET_DATES["end"]:
                            time.sleep(DELAY_SECONDS)
                    else:
                        print("  [FAILED] No data in response")
                        return None, None
                else:
                    error_msg = data.get("Message", "Unknown error")
                    print(f"  [FAILED] API error: {error_msg}")
                    return None, None
            else:
                print(f"  [FAILED] HTTP {response.status_code}")
                return None, None

        if all_data:
            # Convert to DataFrame
            df = pd.DataFrame(all_data)
            df["date"] = pd.to_datetime(df["time"], unit="s").dt.date

            # Filter to target date range
            df = df[
                (pd.to_datetime(df["date"]) >= TARGET_DATES["start"]) &
                (pd.to_datetime(df["date"]) <= TARGET_DATES["end"])
            ]

            # Rename columns
            df = df.rename(columns={
                "open": "open",
                "high": "high",
                "low": "low",
                "close": "close"
            })

            # Calculate averages
            df["average"] = (df["open"] + df["close"]) / 2
            df["daily_avg"] = (df["high"] + df["low"]) / 2

            # Select relevant columns
            result = df[["date", "low", "high", "average", "open", "close", "daily_avg"]]
            result = result.drop_duplicates(subset=["date"]).sort_values("date")

            print(f"  [SUCCESS] Processed {len(result)} days")
            return result, "CryptoCompare"

        return None, None

    except Exception as e:
        print(f"  [FAILED] Error: {e}")
        return None, None


def try_coingecko_with_demo():
    """
    Try CoinGecko with demo API (no auth required but limited)
    """
    print("\n" + "="*70)
    print("[Source 3] Trying CoinGecko (Demo API)...")
    print("="*70)

    try:
        # Use pro API endpoint which might have better data availability
        base_url = "https://api.coingecko.com/api/v3/coins/layerzero/market_chart/range"

        from_ts = int(TARGET_DATES["start"].timestamp())
        to_ts = int(TARGET_DATES["end"].timestamp())

        params = {
            "vs_currency": "usd",
            "from": from_ts,
            "to": to_ts
        }

        print(f"Fetching full range: {TARGET_DATES['start'].date()} to {TARGET_DATES['end'].date()}")
        response = requests.get(base_url, params=params, timeout=30)

        if response.status_code == 200:
            data = response.json()
            prices = data.get("prices", [])

            if prices:
                print(f"  [SUCCESS] Retrieved {len(prices)} price points")

                # Convert to DataFrame
                df = pd.DataFrame(prices, columns=["timestamp", "price"])
                df["datetime"] = pd.to_datetime(df["timestamp"], unit="ms")
                df["date"] = df["datetime"].dt.date

                # Group by date
                daily_df = df.groupby("date").agg({
                    "price": ["min", "max", "mean", "first", "last"]
                }).reset_index()

                daily_df.columns = ["date", "low", "high", "average", "open", "close"]
                daily_df["daily_avg"] = (daily_df["high"] + daily_df["low"]) / 2

                return daily_df, "CoinGecko"
            else:
                print("  [FAILED] No price data returned")
                return None, None
        else:
            print(f"  [FAILED] HTTP {response.status_code} - {response.text[:100]}")
            return None, None

    except Exception as e:
        print(f"  [FAILED] Error: {e}")
        return None, None


def try_binance_api():
    """
    Try to fetch ZRO data from Binance
    """
    print("\n" + "="*70)
    print("[Source 4] Trying Binance API...")
    print("="*70)

    try:
        base_url = "https://api.binance.com/api/v3/klines"

        # Try different trading pairs
        symbols = ["ZROUSDT", "ZROBUSD", "ZROUSD"]

        for symbol in symbols:
            print(f"Trying symbol: {symbol}")

            try:
                all_data = []
                current_time = int(TARGET_DATES["start"].timestamp() * 1000)
                end_time = int(TARGET_DATES["end"].timestamp() * 1000)

                while current_time < end_time:
                    params = {
                        "symbol": symbol,
                        "interval": "1d",
                        "startTime": current_time,
                        "limit": 1000  # Max 1000 candles per request
                    }

                    response = requests.get(base_url, params=params, timeout=30)

                    if response.status_code == 200:
                        klines = response.json()

                        if not klines:
                            break

                        all_data.extend(klines)

                        # Move to next batch
                        current_time = klines[-1][0] + 86400000  # +1 day in ms

                        if current_time < end_time:
                            time.sleep(0.5)  # Short delay
                    else:
                        break

                if all_data:
                    # Convert to DataFrame
                    df = pd.DataFrame(all_data, columns=[
                        "timestamp", "open", "high", "low", "close", "volume",
                        "close_time", "quote_volume", "trades", "taker_buy_base",
                        "taker_buy_quote", "ignore"
                    ])

                    df["date"] = pd.to_datetime(df["timestamp"], unit="ms").dt.date
                    df["open"] = df["open"].astype(float)
                    df["high"] = df["high"].astype(float)
                    df["low"] = df["low"].astype(float)
                    df["close"] = df["close"].astype(float)

                    # Calculate averages
                    df["average"] = (df["open"] + df["close"]) / 2
                    df["daily_avg"] = (df["high"] + df["low"]) / 2

                    # Filter and select columns
                    result = df[["date", "low", "high", "average", "open", "close", "daily_avg"]]
                    result = result[
                        (pd.to_datetime(result["date"]) >= TARGET_DATES["start"]) &
                        (pd.to_datetime(result["date"]) <= TARGET_DATES["end"])
                    ]

                    print(f"  [SUCCESS] Retrieved {len(result)} days for {symbol}")
                    return result, f"Binance ({symbol})"

            except Exception as e:
                print(f"  [SKIP] {symbol} failed: {e}")
                continue

        print("  [FAILED] No valid symbol found on Binance")
        return None, None

    except Exception as e:
        print(f"  [FAILED] Error: {e}")
        return None, None


def main():
    print("="*70)
    print("Enhanced ZRO Price Data Fetcher")
    print("="*70)
    print(f"Target Date Range: {TARGET_DATES['start'].date()} to {TARGET_DATES['end'].date()}")
    print(f"Total Days Needed: {(TARGET_DATES['end'] - TARGET_DATES['start']).days + 1}")
    print("="*70)

    # Try each source in order
    sources = [
        try_yahoo_finance,
        try_cryptocompare,
        try_binance_api,
        try_coingecko_with_demo
    ]

    for source_func in sources:
        df, source_name = source_func()

        if df is not None and not df.empty:
            print("\n" + "="*70)
            print(f"SUCCESS! Data retrieved from: {source_name}")
            print("="*70)

            # Save to CSV
            output_file = "zro_shadow_burn_data.csv"
            print(f"\nSaving to {output_file}...")
            df.to_csv(output_file, index=False)
            print("Data saved successfully!")

            # Display summary
            print("\n" + "="*70)
            print("DATA SUMMARY")
            print("="*70)
            print(f"Source: {source_name}")
            print(f"Total Days: {len(df)}")
            print(f"Date Range: {df['date'].min()} to {df['date'].max()}")
            print(f"Price Range: ${df['low'].min():.2f} - ${df['high'].max():.2f}")
            print(f"Average Price: ${df['average'].mean():.2f}")
            print(f"Latest Price: ${df['close'].iloc[-1]:.2f} (as of {df['date'].iloc[-1]})")
            print("="*70)

            # Display first 5 rows
            print("\nFirst 5 rows of data:")
            print(df.head().to_string(index=False))

            print("\nDone! Data saved to zro_shadow_burn_data.csv")
            return

    # If all sources failed
    print("\n" + "="*70)
    print("ERROR: All data sources failed")
    print("="*70)
    print("\nTroubleshooting:")
    print("1. ZRO might not be listed on these exchanges yet")
    print("2. Check if LayerZero token symbol is correct")
    print("3. Try installing missing libraries:")
    print("   pip install yfinance requests pandas")
    print("4. Consider using an API key for premium access")
    sys.exit(1)


if __name__ == "__main__":
    main()

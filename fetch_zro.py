"""
Fetch historical ZRO price data from CoinGecko API
Bypasses free tier limits by chunking requests into 180-day periods
"""

import requests
import pandas as pd
import time
from datetime import datetime, timedelta
import sys

# Configuration
COIN_ID = "layerzero"
API_BASE_URL = "https://api.coingecko.com/api/v3"
CHUNK_DAYS = 180
DELAY_SECONDS = 1.5  # Delay between API requests to avoid rate limiting

# Date range
START_DATE = datetime(2024, 12, 27)
END_DATE = datetime(2026, 1, 5)  # Today


def date_to_unix_timestamp(dt):
    """Convert datetime to Unix timestamp"""
    return int(dt.timestamp())


def fetch_price_chunk(coin_id, from_timestamp, to_timestamp):
    """
    Fetch price data for a specific time range from CoinGecko
    Returns: List of [timestamp, price] pairs
    """
    url = f"{API_BASE_URL}/coins/{coin_id}/market_chart/range"
    params = {
        "vs_currency": "usd",
        "from": from_timestamp,
        "to": to_timestamp
    }

    try:
        print(f"Fetching data from {datetime.fromtimestamp(from_timestamp)} to {datetime.fromtimestamp(to_timestamp)}...")
        response = requests.get(url, params=params, timeout=30)
        response.raise_for_status()

        data = response.json()
        prices = data.get("prices", [])

        print(f"  [OK] Retrieved {len(prices)} price points")
        return prices

    except requests.exceptions.RequestException as e:
        print(f"  [ERROR] Error fetching data: {e}")
        return []


def fetch_all_prices(coin_id, start_date, end_date, chunk_days=180):
    """
    Fetch all price data in chunks to bypass API limits
    """
    all_prices = []
    current_date = start_date
    chunk_number = 1

    while current_date < end_date:
        # Calculate chunk end date (either chunk_days ahead or end_date, whichever is earlier)
        next_date = min(current_date + timedelta(days=chunk_days), end_date)

        from_ts = date_to_unix_timestamp(current_date)
        to_ts = date_to_unix_timestamp(next_date)

        print(f"\n[Chunk {chunk_number}]")
        chunk_prices = fetch_price_chunk(coin_id, from_ts, to_ts)

        if chunk_prices:
            all_prices.extend(chunk_prices)

        # Move to next chunk
        current_date = next_date
        chunk_number += 1

        # Delay to avoid rate limiting (except for last request)
        if current_date < end_date:
            print(f"   [WAIT] Waiting {DELAY_SECONDS}s to avoid rate limiting...")
            time.sleep(DELAY_SECONDS)

    return all_prices


def process_prices_to_dataframe(prices):
    """
    Convert price data to DataFrame with daily aggregation
    """
    if not prices:
        print("[ERROR] No price data to process!")
        return pd.DataFrame()

    # Convert to DataFrame
    df = pd.DataFrame(prices, columns=["timestamp", "price"])

    # Convert timestamp from milliseconds to datetime
    df["datetime"] = pd.to_datetime(df["timestamp"], unit="ms")
    df["date"] = df["datetime"].dt.date

    # Group by date and calculate daily average
    daily_df = df.groupby("date").agg({
        "price": ["min", "max", "mean", "first", "last"]
    }).reset_index()

    # Flatten column names
    daily_df.columns = ["date", "low", "high", "average", "open", "close"]

    # Calculate daily_avg as (high + low) / 2
    daily_df["daily_avg"] = (daily_df["high"] + daily_df["low"]) / 2

    # Sort by date
    daily_df = daily_df.sort_values("date").reset_index(drop=True)

    # Remove duplicates based on date (shouldn't be any, but just in case)
    daily_df = daily_df.drop_duplicates(subset=["date"], keep="first")

    return daily_df


def main():
    print("=" * 70)
    print("LayerZero (ZRO) Historical Price Fetcher")
    print("=" * 70)
    print(f"Coin: {COIN_ID}")
    print(f"Date Range: {START_DATE.date()} to {END_DATE.date()}")
    print(f"Chunk Size: {CHUNK_DAYS} days")
    print(f"API Delay: {DELAY_SECONDS}s between requests")
    print("=" * 70)

    # Fetch all price data
    print("\nStarting data fetch...\n")
    all_prices = fetch_all_prices(COIN_ID, START_DATE, END_DATE, CHUNK_DAYS)

    if not all_prices:
        print("\nFailed to fetch any data. Exiting.")
        sys.exit(1)

    print(f"\nTotal price points fetched: {len(all_prices)}")

    # Process into DataFrame
    print("\nProcessing data into daily format...")
    df = process_prices_to_dataframe(all_prices)

    if df.empty:
        print("Failed to process data. Exiting.")
        sys.exit(1)

    print(f"Processed {len(df)} days of data")

    # Save to CSV
    output_file = "zro_shadow_burn_data.csv"
    print(f"\nSaving to {output_file}...")
    df.to_csv(output_file, index=False)
    print(f"Data saved successfully!")

    # Display summary
    print("\n" + "=" * 70)
    print("DATA SUMMARY")
    print("=" * 70)
    print(f"Total Days: {len(df)}")
    print(f"Date Range: {df['date'].min()} to {df['date'].max()}")
    print(f"Price Range: ${df['low'].min():.2f} - ${df['high'].max():.2f}")
    print(f"Average Price: ${df['average'].mean():.2f}")
    print(f"Latest Price: ${df['close'].iloc[-1]:.2f} (as of {df['date'].iloc[-1]})")
    print("=" * 70)

    # Display first 5 rows
    print("\nFirst 5 rows of data:")
    print(df.head().to_string(index=False))

    print("\nDone! Data saved to zro_shadow_burn_data.csv")


if __name__ == "__main__":
    main()

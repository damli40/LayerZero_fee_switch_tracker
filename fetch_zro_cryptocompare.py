"""
Dedicated CryptoCompare fetcher for ZRO with better error handling
"""

import requests
import pandas as pd
import time
from datetime import datetime, timedelta
import sys

# Configuration
START_DATE = datetime(2024, 12, 27)
END_DATE = datetime(2026, 1, 5)
DELAY_SECONDS = 1.0


def fetch_cryptocompare_data():
    """
    Fetch ZRO historical data from CryptoCompare
    """
    print("="*70)
    print("CryptoCompare ZRO Price Fetcher")
    print("="*70)
    print(f"Target Range: {START_DATE.date()} to {END_DATE.date()}")
    print("="*70)

    base_url = "https://min-api.cryptocompare.com/data/v2/histoday"

    # Fetch data in chunks
    all_data = []
    days_needed = (END_DATE - START_DATE).days + 1
    limit = min(2000, days_needed)  # CryptoCompare max is 2000

    # Start from end date and work backwards
    to_timestamp = int(END_DATE.timestamp())

    params = {
        "fsym": "ZRO",
        "tsym": "USD",
        "limit": limit,
        "toTs": to_timestamp
    }

    print(f"\nFetching {limit} days of data...")
    print(f"Request URL: {base_url}")
    print(f"Parameters: {params}\n")

    try:
        response = requests.get(base_url, params=params, timeout=30)
        print(f"HTTP Status: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            print(f"Response type: {data.get('Response')}")

            if data.get("Response") == "Success":
                historical_data = data.get("Data", {}).get("Data", [])
                print(f"Data points received: {len(historical_data)}")

                if historical_data:
                    # Show first and last data points
                    first_point = historical_data[0]
                    last_point = historical_data[-1]

                    print(f"\nFirst data point:")
                    print(f"  Date: {datetime.fromtimestamp(first_point['time']).date()}")
                    print(f"  Price: ${first_point.get('close', 0):.4f}")

                    print(f"\nLast data point:")
                    print(f"  Date: {datetime.fromtimestamp(last_point['time']).date()}")
                    print(f"  Price: ${last_point.get('close', 0):.4f}")

                    # Convert to DataFrame
                    df = pd.DataFrame(historical_data)

                    # Add date column
                    df["date"] = pd.to_datetime(df["time"], unit="s").dt.date

                    print(f"\nDate range in data: {df['date'].min()} to {df['date'].max()}")

                    # Filter to target range
                    df["datetime"] = pd.to_datetime(df["date"])
                    mask = (df["datetime"] >= START_DATE) & (df["datetime"] <= END_DATE)
                    df_filtered = df[mask].copy()

                    print(f"After filtering: {len(df_filtered)} days")

                    if df_filtered.empty:
                        print("\n[WARNING] No data in target date range!")
                        print("This might mean ZRO token wasn't trading yet in Dec 2024")
                        print("\nUsing all available data instead...")
                        df_filtered = df.copy()

                    # Rename and calculate columns
                    df_filtered = df_filtered.rename(columns={
                        "open": "open",
                        "high": "high",
                        "low": "low",
                        "close": "close"
                    })

                    df_filtered["average"] = (df_filtered["open"] + df_filtered["close"]) / 2
                    df_filtered["daily_avg"] = (df_filtered["high"] + df_filtered["low"]) / 2

                    # Select columns
                    result = df_filtered[["date", "low", "high", "average", "open", "close", "daily_avg"]]
                    result = result.drop_duplicates(subset=["date"]).sort_values("date").reset_index(drop=True)

                    return result

                else:
                    print("\n[ERROR] No data in response")
                    return None
            else:
                error_msg = data.get("Message", "Unknown error")
                print(f"\n[ERROR] API returned: {error_msg}")
                print(f"Full response: {data}")
                return None
        else:
            print(f"\n[ERROR] HTTP {response.status_code}")
            print(f"Response: {response.text[:500]}")
            return None

    except Exception as e:
        print(f"\n[ERROR] Exception: {e}")
        import traceback
        traceback.print_exc()
        return None


def main():
    df = fetch_cryptocompare_data()

    if df is not None and not df.empty:
        # Save to CSV
        output_file = "zro_shadow_burn_data.csv"
        print(f"\n{'='*70}")
        print(f"Saving to {output_file}...")
        df.to_csv(output_file, index=False)
        print("Data saved successfully!")

        # Display summary
        print("\n" + "="*70)
        print("DATA SUMMARY")
        print("="*70)
        print(f"Total Days: {len(df)}")
        print(f"Date Range: {df['date'].min()} to {df['date'].max()}")
        print(f"Price Range: ${df['low'].min():.2f} - ${df['high'].max():.2f}")
        print(f"Average Price: ${df['average'].mean():.2f}")

        if len(df) > 0:
            print(f"First Price: ${df['open'].iloc[0]:.2f} (on {df['date'].iloc[0]})")
            print(f"Latest Price: ${df['close'].iloc[-1]:.2f} (as of {df['date'].iloc[-1]})")

        print("="*70)

        # Display first 5 rows
        print("\nFirst 5 rows of data:")
        print(df.head().to_string(index=False))

        if len(df) > 5:
            print("\nLast 5 rows of data:")
            print(df.tail().to_string(index=False))

        print("\nDone! Data saved to zro_shadow_burn_data.csv")
        sys.exit(0)
    else:
        print("\n[FAILED] Could not retrieve any data")
        sys.exit(1)


if __name__ == "__main__":
    main()

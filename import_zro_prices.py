"""
Import ZRO price data from CSV into the SQLite database
Updates the zro_price field in daily_metrics table
"""

import sqlite3
import pandas as pd
import sys
from pathlib import Path

# Configuration
DB_PATH = Path("data/shadow-burn.db")
CSV_PATH = Path("zro_shadow_burn_data.csv")


def import_prices():
    """
    Import ZRO prices from CSV into database
    """
    print("="*70)
    print("ZRO Price Data Importer")
    print("="*70)

    # Check if CSV exists
    if not CSV_PATH.exists():
        print(f"[ERROR] CSV file not found: {CSV_PATH}")
        print("Please run fetch_zro_cryptocompare.py first")
        sys.exit(1)

    # Check if database exists
    if not DB_PATH.parent.exists():
        print(f"Creating data directory: {DB_PATH.parent}")
        DB_PATH.parent.mkdir(parents=True, exist_ok=True)

    # Load CSV
    print(f"\nLoading CSV: {CSV_PATH}")
    df = pd.read_csv(CSV_PATH)
    print(f"Loaded {len(df)} price records")
    print(f"Date range: {df['date'].min()} to {df['date'].max()}")
    print(f"Price range: ${df['close'].min():.2f} to ${df['close'].max():.2f}")

    # Connect to database
    print(f"\nConnecting to database: {DB_PATH}")
    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()

    # Check if daily_metrics table exists
    cursor.execute("""
        SELECT name FROM sqlite_master
        WHERE type='table' AND name='daily_metrics'
    """)

    if not cursor.fetchone():
        print("\n[INFO] daily_metrics table doesn't exist yet, creating it...")

        # Create the table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS daily_metrics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT NOT NULL UNIQUE,
                message_count INTEGER NOT NULL DEFAULT 0,
                avg_gas_paid REAL NOT NULL DEFAULT 0,
                median_gas_paid REAL NOT NULL DEFAULT 0,
                total_fee_usd REAL NOT NULL DEFAULT 0,
                zro_price REAL NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_daily_metrics_date
            ON daily_metrics(date DESC)
        """)

        conn.commit()
        print("  [OK] Table created")

    # Import prices
    print("\nImporting prices into database...")

    inserted = 0
    updated = 0
    errors = 0

    for idx, row in df.iterrows():
        date_str = str(row['date'])
        zro_price = float(row['close'])  # Use closing price

        try:
            # Check if record exists
            cursor.execute(
                "SELECT id, zro_price FROM daily_metrics WHERE date = ?",
                (date_str,)
            )
            existing = cursor.fetchone()

            if existing:
                # Update existing record
                cursor.execute("""
                    UPDATE daily_metrics
                    SET zro_price = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE date = ?
                """, (zro_price, date_str))
                updated += 1
            else:
                # Insert new record with just the price
                cursor.execute("""
                    INSERT INTO daily_metrics
                    (date, message_count, avg_gas_paid, median_gas_paid, total_fee_usd, zro_price)
                    VALUES (?, 0, 0, 0, 0, ?)
                """, (date_str, zro_price))
                inserted += 1

        except Exception as e:
            print(f"  [ERROR] Failed to process {date_str}: {e}")
            errors += 1

        # Commit every 100 records
        if (idx + 1) % 100 == 0:
            conn.commit()
            print(f"  Processed {idx + 1}/{len(df)} records...")

    # Final commit
    conn.commit()

    print("\n" + "="*70)
    print("IMPORT SUMMARY")
    print("="*70)
    print(f"Records inserted: {inserted}")
    print(f"Records updated: {updated}")
    print(f"Errors: {errors}")
    print(f"Total processed: {inserted + updated}")
    print("="*70)

    # Verify import
    print("\nVerifying import...")
    cursor.execute("""
        SELECT
            COUNT(*) as total_records,
            MIN(date) as earliest_date,
            MAX(date) as latest_date,
            MIN(zro_price) as min_price,
            MAX(zro_price) as max_price,
            AVG(zro_price) as avg_price
        FROM daily_metrics
        WHERE zro_price > 0
    """)

    result = cursor.fetchone()

    print(f"Total records with prices: {result[0]}")
    print(f"Date range: {result[1]} to {result[2]}")
    print(f"Price range: ${result[3]:.2f} to ${result[4]:.2f}")
    print(f"Average price: ${result[5]:.2f}")

    # Show sample records
    print("\nSample records from database:")
    cursor.execute("""
        SELECT date, message_count, total_fee_usd, zro_price
        FROM daily_metrics
        WHERE zro_price > 0
        ORDER BY date DESC
        LIMIT 5
    """)

    print("\n{:<12} {:<15} {:<15} {:<12}".format("Date", "Messages", "Total Fee USD", "ZRO Price"))
    print("-" * 70)
    for row in cursor.fetchall():
        print("{:<12} {:<15} ${:<14.2f} ${:<11.2f}".format(
            row[0], row[1], row[2], row[3]
        ))

    conn.close()
    print("\n[SUCCESS] Import completed!")


if __name__ == "__main__":
    import_prices()

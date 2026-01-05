"""
Verify database integrity and data completeness
"""

import sqlite3
from pathlib import Path

DB_PATH = Path("data/shadow-burn.db")

conn = sqlite3.connect(str(DB_PATH))
cursor = conn.cursor()

print("="*70)
print("Database Verification")
print("="*70)

# Check table schema
print("\nTable Schema:")
cursor.execute("PRAGMA table_info(daily_metrics)")
columns = cursor.fetchall()
for col in columns:
    print(f"  {col[1]:<20} {col[2]:<15} {'NOT NULL' if col[3] else ''}")

# Check data completeness
print("\n" + "="*70)
print("Data Completeness")
print("="*70)

cursor.execute("""
    SELECT
        COUNT(*) as total_records,
        COUNT(CASE WHEN message_count > 0 THEN 1 END) as records_with_messages,
        COUNT(CASE WHEN total_fee_usd > 0 THEN 1 END) as records_with_fees,
        COUNT(CASE WHEN zro_price > 0 THEN 1 END) as records_with_prices,
        MIN(date) as earliest_date,
        MAX(date) as latest_date
    FROM daily_metrics
""")

stats = cursor.fetchone()
print(f"Total records: {stats[0]}")
print(f"Records with messages: {stats[1]}")
print(f"Records with fees: {stats[2]}")
print(f"Records with ZRO prices: {stats[3]}")
print(f"Date range: {stats[4]} to {stats[5]}")

# Check for records with all data
cursor.execute("""
    SELECT COUNT(*)
    FROM daily_metrics
    WHERE message_count > 0
      AND total_fee_usd > 0
      AND zro_price > 0
""")
complete_records = cursor.fetchone()[0]
print(f"Complete records (all fields): {complete_records}")

# Show stats by date range
print("\n" + "="*70)
print("Recent Data Summary (Last 10 days)")
print("="*70)

cursor.execute("""
    SELECT
        date,
        message_count,
        total_fee_usd,
        zro_price,
        CASE
            WHEN message_count > 0 AND total_fee_usd > 0 THEN total_fee_usd / zro_price
            ELSE 0
        END as potential_burn
    FROM daily_metrics
    WHERE zro_price > 0
    ORDER BY date DESC
    LIMIT 10
""")

print("{:<12} {:<12} {:<15} {:<12} {:<15}".format(
    "Date", "Messages", "Total Fee", "ZRO Price", "Potential Burn"
))
print("-" * 70)

for row in cursor.fetchall():
    print("{:<12} {:<12} ${:<14.2f} ${:<11.2f} {:<15.2f}".format(
        row[0], row[1], row[2], row[3], row[4]
    ))

# Check vote period data
print("\n" + "="*70)
print("Vote Period Analysis")
print("="*70)

vote_start = "2024-12-20"  # Example vote start date
cursor.execute("""
    SELECT
        COUNT(*) as days,
        SUM(message_count) as total_messages,
        SUM(total_fee_usd) as total_fees,
        AVG(zro_price) as avg_price
    FROM daily_metrics
    WHERE date >= ?
      AND message_count > 0
      AND total_fee_usd > 0
      AND zro_price > 0
""", (vote_start,))

vote_stats = cursor.fetchone()
if vote_stats and vote_stats[0] > 0:
    total_burn = vote_stats[2] / vote_stats[3] if vote_stats[3] > 0 else 0
    print(f"Days with data since {vote_start}: {vote_stats[0]}")
    print(f"Total messages: {vote_stats[1]:,}")
    print(f"Total fees collected: ${vote_stats[2]:,.2f}")
    print(f"Average ZRO price: ${vote_stats[3]:.2f}")
    print(f"Potential total burn: {total_burn:,.2f} ZRO")
else:
    print("No complete data found for vote period analysis")

conn.close()

print("\n" + "="*70)
print("[SUCCESS] Verification complete!")
print("="*70)

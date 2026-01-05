#!/usr/bin/env python3
"""
Direct price update script for Vercel Postgres
Reads CSV and updates prices directly in the database
"""

import csv
import requests
import json

# Read CSV file
prices = {}
with open('zro_shadow_burn_data.csv', 'r') as f:
    reader = csv.DictReader(f)
    for row in reader:
        date = row['date']
        price = float(row['daily_avg'])
        prices[date] = price

print(f"Loaded {len(prices)} price records from CSV")

# Update via API in batches of 30 days
dates_list = sorted(prices.keys())
batch_size = 30

for i in range(0, len(dates_list), batch_size):
    batch = dates_list[i:i+batch_size]
    batch_data = {date: prices[date] for date in batch}

    print(f"\nUpdating batch {i//batch_size + 1}: {batch[0]} to {batch[-1]}")

    try:
        response = requests.post(
            'https://layer-zero-fee-switch-tracker.vercel.app/api/admin/update-prices-batch',
            json={'prices': batch_data},
            timeout=60
        )

        if response.status_code == 200:
            result = response.json()
            print(f"[OK] Updated {result.get('recordsUpdated', 0)} records")
        else:
            print(f"[ERROR] Status {response.status_code} - {response.text}")
    except Exception as e:
        print(f"[ERROR] Request failed: {e}")

print("\n[OK] Price update complete!")

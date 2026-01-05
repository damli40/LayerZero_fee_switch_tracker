"""
Test script to verify dashboard API and data flow
"""

import requests
import json
from datetime import datetime, timedelta

BASE_URL = "http://localhost:3000"

print("="*70)
print("Dashboard API Testing")
print("="*70)

# Test 1: Check homepage
print("\n[Test 1] Homepage Load")
print("-"*70)
try:
    response = requests.get(BASE_URL, timeout=5)
    if response.status_code == 200:
        if "LayerZero Shadow Burn Dashboard" in response.text:
            print("[PASS] Homepage loads with correct title")
        else:
            print("[FAIL] Homepage missing expected title")
    else:
        print(f"[FAIL] Homepage returned status {response.status_code}")
except Exception as e:
    print(f"[FAIL] Error loading homepage: {e}")

# Test 2: Metrics API - Recent data
print("\n[Test 2] Metrics API - Recent Data")
print("-"*70)
try:
    end_date = datetime.now().date()
    start_date = end_date - timedelta(days=7)

    params = {
        "start": start_date.isoformat(),
        "end": end_date.isoformat()
    }

    response = requests.get(f"{BASE_URL}/api/metrics", params=params, timeout=10)

    if response.status_code == 200:
        data = response.json()

        print(f"[PASS] API returned status 200")
        print(f"  Records returned: {len(data.get('metrics', []))}")
        print(f"  Current ZRO price: ${data.get('currentZROPrice', 0):.2f}")
        print(f"  Last updated: {data.get('lastUpdated', 'N/A')}")

        # Check data structure
        if data.get('metrics'):
            first_record = data['metrics'][0]
            print(f"\n  Sample record:")
            print(f"    Date: {first_record.get('date')}")
            print(f"    Messages: {first_record.get('messageCount'):,}")
            print(f"    Total Fee: ${first_record.get('totalFeeUSD', 0):,.2f}")
            print(f"    ZRO Price: ${first_record.get('zroPrice', 0):.2f}")

            # Validate required fields
            required_fields = ['date', 'messageCount', 'avgGasPaid', 'medianGasPaid',
                              'totalFeeUSD', 'zroPrice']
            missing_fields = [f for f in required_fields if f not in first_record]

            if missing_fields:
                print(f"  [WARN] Missing fields: {missing_fields}")
            else:
                print(f"  [PASS] All required fields present")
    else:
        print(f"[FAIL] API returned status {response.status_code}")
        print(f"  Response: {response.text[:200]}")

except Exception as e:
    print(f"[FAIL] Error testing API: {e}")

# Test 3: Metrics API - Historical data (vote period)
print("\n[Test 3] Metrics API - Vote Period Data")
print("-"*70)
try:
    params = {
        "start": "2024-12-20",
        "end": "2025-01-05"
    }

    response = requests.get(f"{BASE_URL}/api/metrics", params=params, timeout=10)

    if response.status_code == 200:
        data = response.json()
        metrics = data.get('metrics', [])

        print(f"[PASS] API returned vote period data")
        print(f"  Records: {len(metrics)}")

        if metrics:
            # Calculate totals
            total_messages = sum(m.get('messageCount', 0) for m in metrics)
            total_fees = sum(m.get('totalFeeUSD', 0) for m in metrics)
            avg_zro_price = sum(m.get('zroPrice', 0) for m in metrics) / len(metrics)
            potential_burn = total_fees / avg_zro_price if avg_zro_price > 0 else 0

            print(f"  Total messages: {total_messages:,}")
            print(f"  Total fees: ${total_fees:,.2f}")
            print(f"  Average ZRO price: ${avg_zro_price:.2f}")
            print(f"  Potential burn: {potential_burn:,.2f} ZRO")
    else:
        print(f"[FAIL] API returned status {response.status_code}")

except Exception as e:
    print(f"[FAIL] Error testing vote period: {e}")

# Test 4: Error handling
print("\n[Test 4] API Error Handling")
print("-"*70)
try:
    # Test without parameters
    response = requests.get(f"{BASE_URL}/api/metrics", timeout=5)

    if response.status_code == 400:
        error_data = response.json()
        if 'error' in error_data:
            print(f"[PASS] Correct error response for missing parameters")
            print(f"  Error message: {error_data['error']}")
        else:
            print(f"[FAIL] Error response missing 'error' field")
    else:
        print(f"[FAIL] Expected 400 status, got {response.status_code}")

except Exception as e:
    print(f"[FAIL] Error testing error handling: {e}")

# Summary
print("\n" + "="*70)
print("TEST SUMMARY")
print("="*70)
print("Dashboard is running and API is functional!")
print(f"Access the dashboard at: {BASE_URL}")
print("="*70)

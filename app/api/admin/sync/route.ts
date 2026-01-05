/**
 * Admin API Route: Sync new LayerZero data
 * POST /api/admin/sync
 * Body (optional): { "startDate": "YYYY-MM-DD", "endDate": "YYYY-MM-DD" }
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchLayerZeroDailyMetricsFromDune } from '@/lib/dune-api';
import { getHistoricalZROPrices, fillMissingPrices, getCurrentZROPrice } from '@/lib/coingecko-api';
import { upsertDailyMetric, insertSyncStatus, getLastSyncStatus } from '@/lib/db/queries';

export async function POST(request: NextRequest) {
  try {

    // Parse request body
    const body = await request.json().catch(() => ({}));
    const { startDate, endDate, force } = body;

    // Determine date range
    let fromDate: Date;
    let toDate: Date = new Date();

    if (startDate && endDate) {
      // Manual date range
      fromDate = new Date(startDate);
      toDate = new Date(endDate);
    } else {
      // Auto: sync from last sync date or Dec 27, 2024
      const lastSync = await getLastSyncStatus();
      if (lastSync && !force) {
        fromDate = new Date(lastSync.last_sync_date);
        fromDate.setDate(fromDate.getDate() + 1); // Start from next day
      } else {
        fromDate = new Date('2024-12-27'); // Fee switch vote date (Dec 27, 2024)
      }
    }

    console.log(`Syncing data from ${fromDate.toISOString()} to ${toDate.toISOString()}`);

    // Fetch LayerZero metrics from Dune Analytics
    const lzMetrics = await fetchLayerZeroDailyMetricsFromDune(fromDate, toDate);

    // Fetch ZRO prices
    const [currentPrice, historicalPrices] = await Promise.all([
      getCurrentZROPrice(),
      getHistoricalZROPrices(fromDate, toDate),
    ]);

    // Generate date array
    const dates: string[] = [];
    const currentDate = new Date(fromDate);
    while (currentDate <= toDate) {
      dates.push(currentDate.toISOString().split('T')[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Fill missing prices
    const filledPrices = fillMissingPrices(dates, historicalPrices, currentPrice);

    // Process and insert data
    let recordsInserted = 0;
    for (const date of dates) {
      const lzData = lzMetrics.get(date);
      const zroPrice = filledPrices.get(date) || currentPrice;

      const metric = {
        date,
        messageCount: lzData?.messageCount || 0,
        avgGasPaid: lzData?.avgFee || 0,
        medianGasPaid: lzData?.medianFee || 0,
        totalFeeUSD: (lzData?.messageCount || 0) * (lzData?.avgFee || 0),
        zroPrice,
      };

      await upsertDailyMetric(metric);
      recordsInserted++;
    }

    // Update sync status
    await insertSyncStatus({
      lastSyncDate: toDate.toISOString().split('T')[0],
      status: 'success',
      messagesSynced: recordsInserted,
    });

    return NextResponse.json({
      success: true,
      message: 'Data synced successfully',
      recordsInserted,
      dateRange: {
        start: fromDate.toISOString().split('T')[0],
        end: toDate.toISOString().split('T')[0],
      },
    });
  } catch (error) {
    console.error('Error syncing data:', error);

    // Log error to sync status
    try {
      await insertSyncStatus({
        lastSyncDate: new Date().toISOString().split('T')[0],
        status: 'error',
        messagesSynced: 0,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
    } catch (logError) {
      console.error('Failed to log sync error:', logError);
    }

    return NextResponse.json(
      {
        error: 'Failed to sync data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check sync status
export async function GET(request: NextRequest) {
  try {
    const lastSync = await getLastSyncStatus();

    return NextResponse.json({
      lastSync,
      currentTime: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error checking sync status:', error);
    return NextResponse.json(
      { error: 'Failed to check sync status' },
      { status: 500 }
    );
  }
}

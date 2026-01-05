/**
 * Vercel Cron Job: Daily Data Sync
 * Automatically syncs new LayerZero data and ZRO prices daily
 * Triggered by Vercel Cron at 2 AM UTC (configured in vercel.json)
 *
 * @see https://vercel.com/docs/cron-jobs
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchLayerZeroDailyMetricsFromDune } from '@/lib/dune-api';
import { getHistoricalZROPrices, fillMissingPrices, getCurrentZROPrice } from '@/lib/coingecko-api';
import { upsertDailyMetric, insertSyncStatus, getLastSyncStatus } from '@/lib/db/queries';

export const maxDuration = 60; // Allow up to 60 seconds for the cron job

export async function GET(request: NextRequest) {
  try {
    // Verify this is a Vercel Cron request
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // In production, verify the cron secret
    if (process.env.NODE_ENV === 'production' && cronSecret) {
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }

    console.log('[CRON] Starting daily sync job...');

    // Determine date range: sync from last sync date or default start
    let fromDate: Date;
    const toDate: Date = new Date();

    const lastSync = await getLastSyncStatus();
    if (lastSync) {
      fromDate = new Date(lastSync.last_sync_date);
      fromDate.setDate(fromDate.getDate() + 1); // Start from next day
      console.log(`[CRON] Syncing from last sync date: ${lastSync.last_sync_date}`);
    } else {
      fromDate = new Date('2024-12-27'); // Fee switch vote date
      console.log(`[CRON] No previous sync found, starting from: ${fromDate.toISOString()}`);
    }

    // Don't sync if we're already up to date
    if (fromDate > toDate) {
      console.log('[CRON] Already up to date, no sync needed');
      return NextResponse.json({
        success: true,
        message: 'Already up to date',
        skipped: true,
      });
    }

    console.log(`[CRON] Fetching data from ${fromDate.toISOString()} to ${toDate.toISOString()}`);

    // Fetch LayerZero metrics from Dune Analytics
    const lzMetrics = await fetchLayerZeroDailyMetricsFromDune(fromDate, toDate);
    console.log(`[CRON] Fetched ${lzMetrics.size} days from Dune Analytics`);

    // Fetch ZRO prices
    const [currentPrice, historicalPrices] = await Promise.all([
      getCurrentZROPrice(),
      getHistoricalZROPrices(fromDate, toDate),
    ]);
    console.log(`[CRON] Fetched ZRO prices, current: $${currentPrice}`);

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

    console.log(`[CRON] Inserted/updated ${recordsInserted} records`);

    // Update sync status
    await insertSyncStatus({
      lastSyncDate: toDate.toISOString().split('T')[0],
      status: 'success',
      messagesSynced: recordsInserted,
    });

    console.log('[CRON] Daily sync completed successfully');

    return NextResponse.json({
      success: true,
      message: 'Daily sync completed successfully',
      recordsInserted,
      dateRange: {
        start: fromDate.toISOString().split('T')[0],
        end: toDate.toISOString().split('T')[0],
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[CRON] Error during daily sync:', error);

    // Log error to sync status
    try {
      await insertSyncStatus({
        lastSyncDate: new Date().toISOString().split('T')[0],
        status: 'error',
        messagesSynced: 0,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
    } catch (logError) {
      console.error('[CRON] Failed to log sync error:', logError);
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Daily sync failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

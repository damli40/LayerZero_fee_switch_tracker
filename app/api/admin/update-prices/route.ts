/**
 * Admin API Route: Update ZRO prices from CSV
 * POST /api/admin/update-prices
 *
 * This updates the database with correct historical ZRO prices from CSV file
 * when CoinGecko API fails to return historical data.
 */

import { NextRequest, NextResponse } from 'next/server';
import { isUsingPostgres } from '@/lib/db/index';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    console.log('[UpdatePrices] Starting price update from CSV...');

    // Read CSV file
    const csvPath = path.join(process.cwd(), 'zro_shadow_burn_data.csv');

    if (!fs.existsSync(csvPath)) {
      return NextResponse.json(
        { error: 'CSV file not found: zro_shadow_burn_data.csv' },
        { status: 404 }
      );
    }

    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.split('\n');

    // Skip header
    const dataLines = lines.slice(1).filter(line => line.trim());

    console.log(`[UpdatePrices] Found ${dataLines.length} price records in CSV`);

    let recordsUpdated = 0;

    if (isUsingPostgres()) {
      // Postgres implementation
      const { sql } = await import('@vercel/postgres');

      for (const line of dataLines) {
        const [date, low, high, average, open, close, daily_avg] = line.split(',');

        if (!date || !daily_avg) continue;

        const price = parseFloat(daily_avg);
        if (isNaN(price)) continue;

        try {
          // Update only records that exist
          const result = await sql`
            UPDATE daily_metrics
            SET zro_price = ${price}
            WHERE date = ${date}::date
          `;

          if (result.rowCount && result.rowCount > 0) {
            recordsUpdated++;
            console.log(`[UpdatePrices] Updated ${date}: $${price.toFixed(2)}`);
          }
        } catch (error) {
          console.error(`[UpdatePrices] Error updating ${date}:`, error);
        }
      }
    } else {
      // SQLite implementation
      const { promisify } = require('util');
      const db = await (await import('@/lib/db/index')).getDatabase();
      const run = promisify(db.run.bind(db));

      for (const line of dataLines) {
        const [date, low, high, average, open, close, daily_avg] = line.split(',');

        if (!date || !daily_avg) continue;

        const price = parseFloat(daily_avg);
        if (isNaN(price)) continue;

        try {
          const result = await run(
            'UPDATE daily_metrics SET zro_price = ? WHERE date = ?',
            [price, date]
          );

          if (result.changes > 0) {
            recordsUpdated++;
            console.log(`[UpdatePrices] Updated ${date}: $${price.toFixed(2)}`);
          }
        } catch (error) {
          console.error(`[UpdatePrices] Error updating ${date}:`, error);
        }
      }
    }

    console.log(`[UpdatePrices] Successfully updated ${recordsUpdated} records`);

    return NextResponse.json({
      success: true,
      message: 'Prices updated successfully from CSV',
      recordsUpdated,
      source: 'zro_shadow_burn_data.csv',
    });
  } catch (error) {
    console.error('[UpdatePrices] Error updating prices:', error);
    return NextResponse.json(
      {
        error: 'Failed to update prices',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check status
export async function GET(request: NextRequest) {
  return NextResponse.json({
    info: 'This endpoint updates ZRO prices from zro_shadow_burn_data.csv',
    usage: 'POST /api/admin/update-prices',
    note: 'Use this when CoinGecko historical API fails',
  });
}

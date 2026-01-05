/**
 * Admin API Route: Update ZRO prices in batch
 * POST /api/admin/update-prices-batch
 *
 * Accepts a batch of date-price pairs and updates the database
 */

import { NextRequest, NextResponse } from 'next/server';
import { isUsingPostgres } from '@/lib/db/index';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const prices = body.prices as Record<string, number>;

    if (!prices || Object.keys(prices).length === 0) {
      return NextResponse.json(
        { error: 'No prices provided' },
        { status: 400 }
      );
    }

    console.log(`[UpdatePricesBatch] Updating ${Object.keys(prices).length} prices...`);

    let recordsUpdated = 0;

    if (isUsingPostgres()) {
      // Postgres implementation
      const { sql } = await import('@vercel/postgres');

      for (const [date, price] of Object.entries(prices)) {
        try {
          const result = await sql`
            UPDATE daily_metrics
            SET zro_price = ${price}
            WHERE date = ${date}::date
          `;

          if (result.rowCount && result.rowCount > 0) {
            recordsUpdated++;
          }
        } catch (error) {
          console.error(`[UpdatePricesBatch] Error updating ${date}:`, error);
        }
      }
    } else {
      // SQLite implementation
      const { promisify } = require('util');
      const db = await (await import('@/lib/db/index')).getDatabase();
      const run = promisify(db.run.bind(db));

      for (const [date, price] of Object.entries(prices)) {
        try {
          const result = await run(
            'UPDATE daily_metrics SET zro_price = ? WHERE date = ?',
            [price, date]
          );

          if (result.changes > 0) {
            recordsUpdated++;
          }
        } catch (error) {
          console.error(`[UpdatePricesBatch] Error updating ${date}:`, error);
        }
      }
    }

    return NextResponse.json({
      success: true,
      recordsUpdated,
    });
  } catch (error) {
    console.error('[UpdatePricesBatch] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to update prices',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

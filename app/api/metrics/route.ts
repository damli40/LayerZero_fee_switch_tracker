/**
 * Public API Route: Fetch daily metrics from database
 * GET /api/metrics?start=YYYY-MM-DD&end=YYYY-MM-DD
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDailyMetrics, hasData } from '@/lib/db/queries';
import { getCurrentZROPrice } from '@/lib/coingecko-api';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    if (!start || !end) {
      return NextResponse.json(
        { error: 'Missing start or end date parameters' },
        { status: 400 }
      );
    }

    // Check if database has data
    if (!(await hasData())) {
      return NextResponse.json(
        {
          error: 'No data available. Database needs to be initialized.',
          needsSync: true,
        },
        { status: 404 }
      );
    }

    // Fetch metrics from database
    const metrics = await getDailyMetrics(start, end);

    // Get current ZRO price
    const currentZROPrice = await getCurrentZROPrice();

    return NextResponse.json({
      metrics,
      currentZROPrice,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
}

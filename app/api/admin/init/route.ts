/**
 * Admin API Route: Initialize database with historical data
 * POST /api/admin/init
 *
 * This route performs the initial data population from Dec 20, 2024 to present
 * For Postgres (production): Creates schema first, then syncs data
 * For SQLite (local): Schema auto-created, just syncs data
 */

import { NextRequest, NextResponse } from 'next/server';
import { hasData } from '@/lib/db/queries';
import { isUsingPostgres, initializePostgresSchema } from '@/lib/db/index';

export async function POST(request: NextRequest) {
  try {
    // Step 1: Initialize schema for Postgres (if needed)
    if (isUsingPostgres()) {
      console.log('[Init] Initializing Postgres schema...');
      try {
        await initializePostgresSchema();
        console.log('[Init] Postgres schema initialized successfully');
      } catch (error) {
        console.error('[Init] Error initializing Postgres schema:', error);
        // Continue anyway - tables might already exist
      }
    }

    // Step 2: Check if already has data
    if (await hasData()) {
      return NextResponse.json(
        {
          error: 'Database already has data. Use /api/admin/sync to update.',
          initialized: true,
        },
        { status: 400 }
      );
    }

    // Call sync endpoint internally to populate data
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ||
                    (request.headers.get('host')
                      ? `${request.headers.get('x-forwarded-proto') || 'http'}://${request.headers.get('host')}`
                      : 'http://localhost:3000');

    const syncUrl = `${baseUrl}/api/admin/sync`;
    const response = await fetch(syncUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        startDate: '2025-12-27',
        endDate: new Date().toISOString().split('T')[0],
        force: true,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to initialize database');
    }

    return NextResponse.json({
      success: true,
      message: 'Database initialized successfully',
      ...data,
    });
  } catch (error) {
    console.error('Error initializing database:', error);
    return NextResponse.json(
      {
        error: 'Failed to initialize database',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check initialization status
export async function GET(request: NextRequest) {
  try {
    const initialized = await hasData();
    const dbType = isUsingPostgres() ? 'postgres' : 'sqlite';

    return NextResponse.json({
      initialized,
      databaseType: dbType,
      message: initialized
        ? `Database is initialized (${dbType})`
        : `Database needs initialization (${dbType})`,
    });
  } catch (error) {
    console.error('Error checking initialization:', error);
    return NextResponse.json(
      { error: 'Failed to check initialization status' },
      { status: 500 }
    );
  }
}

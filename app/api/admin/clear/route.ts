/**
 * Admin API Route: Clear all database data
 * POST /api/admin/clear
 *
 * This route deletes all data from the database tables.
 * Use this to clear wrong data before resyncing.
 */

import { NextRequest, NextResponse } from 'next/server';
import { isUsingPostgres } from '@/lib/db/index';

export async function POST(request: NextRequest) {
  try {
    console.log('[Clear] Starting database clear operation...');

    if (isUsingPostgres()) {
      // Postgres implementation
      const { sql } = await import('@vercel/postgres');

      // Delete data from all tables
      await sql`DELETE FROM daily_metrics`;
      await sql`DELETE FROM layerzero_messages`;
      await sql`DELETE FROM sync_status`;

      console.log('[Clear] Postgres database cleared successfully');

      return NextResponse.json({
        success: true,
        message: 'Database cleared successfully (Postgres)',
        databaseType: 'postgres'
      });
    } else {
      // SQLite implementation
      const { promisify } = require('util');
      const db = await (await import('@/lib/db/index')).getDatabase();
      const run = promisify(db.run.bind(db));

      await run('DELETE FROM daily_metrics');
      await run('DELETE FROM layerzero_messages');
      await run('DELETE FROM sync_status');

      console.log('[Clear] SQLite database cleared successfully');

      return NextResponse.json({
        success: true,
        message: 'Database cleared successfully (SQLite)',
        databaseType: 'sqlite'
      });
    }
  } catch (error) {
    console.error('[Clear] Error clearing database:', error);
    return NextResponse.json(
      {
        error: 'Failed to clear database',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// GET endpoint to confirm clear operation (safety check)
export async function GET(request: NextRequest) {
  return NextResponse.json({
    warning: 'This endpoint will delete ALL data from the database.',
    method: 'POST /api/admin/clear',
    recommendation: 'Make sure to backup data before clearing.',
    nextStep: 'After clearing, run POST /api/admin/sync to resync data with correct dates.'
  });
}

/**
 * Database utilities for LayerZero Shadow Burn Dashboard
 *
 * This module supports both SQLite (local development) and Postgres (production).
 * It automatically detects the environment and uses the appropriate database.
 */

import path from 'path';
import fs from 'fs';

// Type definitions
export interface DailyMetricRow {
  id: number;
  date: string;
  message_count: number;
  avg_gas_paid: number;
  median_gas_paid: number;
  total_fee_usd: number;
  zro_price: number;
  created_at: string;
  updated_at: string;
}

export interface MessageRow {
  id: number;
  guid: string;
  tx_hash: string;
  block_timestamp: number;
  date: string;
  from_address: string | null;
  src_chain_id: number | null;
  dst_chain_id: number | null;
  fee_usd: number | null;
  status: string | null;
  created_at: string;
}

export interface SyncStatusRow {
  id: number;
  last_sync_date: string;
  last_sync_timestamp: string;
  status: string;
  messages_synced: number;
  error_message: string | null;
  created_at: string;
}

// Determine database type based on environment
const isProduction = process.env.POSTGRES_URL !== undefined;
const dbType = isProduction ? 'postgres' : 'sqlite';

console.log(`[DB] Using ${dbType} database (production: ${isProduction})`);

// SQLite setup (local development)
let sqliteDb: any = null;

if (!isProduction) {
  const sqlite3 = require('sqlite3');
  const { promisify } = require('util');

  const DB_PATH = path.join(process.cwd(), 'data', 'shadow-burn.db');

  // Ensure data directory exists
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  sqliteDb = new sqlite3.Database(DB_PATH, async (err: Error | null) => {
    if (err) {
      console.error('[DB] SQLite connection error:', err);
    } else {
      console.log('[DB] SQLite database connected');
      await initializeSQLiteSchema();
    }
  });
}

/**
 * Initialize SQLite schema
 */
async function initializeSQLiteSchema() {
  if (!sqliteDb) return;

  const { promisify } = require('util');
  const run = promisify(sqliteDb.run.bind(sqliteDb));

  try {
    // Create daily_metrics table
    await run(`
      CREATE TABLE IF NOT EXISTS daily_metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL UNIQUE,
        message_count INTEGER NOT NULL DEFAULT 0,
        avg_gas_paid REAL NOT NULL DEFAULT 0,
        median_gas_paid REAL NOT NULL DEFAULT 0,
        total_fee_usd REAL NOT NULL DEFAULT 0,
        zro_price REAL NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await run(`CREATE INDEX IF NOT EXISTS idx_daily_metrics_date ON daily_metrics(date DESC);`);

    // Create layerzero_messages table
    await run(`
      CREATE TABLE IF NOT EXISTS layerzero_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guid TEXT NOT NULL UNIQUE,
        tx_hash TEXT NOT NULL,
        block_timestamp INTEGER NOT NULL,
        date TEXT NOT NULL,
        from_address TEXT,
        src_chain_id INTEGER,
        dst_chain_id INTEGER,
        fee_usd REAL,
        status TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await run(`CREATE INDEX IF NOT EXISTS idx_messages_date ON layerzero_messages(date DESC);`);
    await run(`CREATE INDEX IF NOT EXISTS idx_messages_guid ON layerzero_messages(guid);`);

    // Create sync_status table
    await run(`
      CREATE TABLE IF NOT EXISTS sync_status (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        last_sync_date TEXT NOT NULL,
        last_sync_timestamp TEXT NOT NULL,
        status TEXT DEFAULT 'success',
        messages_synced INTEGER DEFAULT 0,
        error_message TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await run(`CREATE INDEX IF NOT EXISTS idx_sync_status_date ON sync_status(last_sync_date DESC);`);

    console.log('[DB] SQLite schema initialized');
  } catch (error) {
    console.error('[DB] Error initializing SQLite schema:', error);
  }
}

/**
 * Initialize Postgres schema
 */
export async function initializePostgresSchema() {
  if (!isProduction) {
    throw new Error('Cannot initialize Postgres schema in non-production environment');
  }

  const { sql } = await import('@vercel/postgres');

  try {
    // Create daily_metrics table
    await sql`
      CREATE TABLE IF NOT EXISTS daily_metrics (
        id SERIAL PRIMARY KEY,
        date DATE NOT NULL UNIQUE,
        message_count INTEGER NOT NULL DEFAULT 0,
        avg_gas_paid REAL NOT NULL DEFAULT 0,
        median_gas_paid REAL NOT NULL DEFAULT 0,
        total_fee_usd REAL NOT NULL DEFAULT 0,
        zro_price REAL NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `;

    await sql`CREATE INDEX IF NOT EXISTS idx_daily_metrics_date ON daily_metrics(date DESC);`;

    // Create layerzero_messages table
    await sql`
      CREATE TABLE IF NOT EXISTS layerzero_messages (
        id SERIAL PRIMARY KEY,
        guid TEXT NOT NULL UNIQUE,
        tx_hash TEXT NOT NULL,
        block_timestamp BIGINT NOT NULL,
        date DATE NOT NULL,
        from_address TEXT,
        src_chain_id INTEGER,
        dst_chain_id INTEGER,
        fee_usd REAL,
        status TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `;

    await sql`CREATE INDEX IF NOT EXISTS idx_messages_date ON layerzero_messages(date DESC);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_messages_guid ON layerzero_messages(guid);`;

    // Create sync_status table
    await sql`
      CREATE TABLE IF NOT EXISTS sync_status (
        id SERIAL PRIMARY KEY,
        last_sync_date DATE NOT NULL,
        last_sync_timestamp TIMESTAMP NOT NULL,
        status TEXT DEFAULT 'success',
        messages_synced INTEGER DEFAULT 0,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `;

    await sql`CREATE INDEX IF NOT EXISTS idx_sync_status_date ON sync_status(last_sync_date DESC);`;

    console.log('[DB] Postgres schema initialized');
    return { success: true, message: 'Postgres schema initialized successfully' };
  } catch (error) {
    console.error('[DB] Error initializing Postgres schema:', error);
    throw error;
  }
}

/**
 * Get database instance
 * For SQLite: returns the sqlite3.Database object
 * For Postgres: returns a flag indicating to use @vercel/postgres
 */
export async function getDatabase() {
  if (isProduction) {
    return { type: 'postgres' as const };
  } else {
    if (!sqliteDb) {
      throw new Error('SQLite database not initialized');
    }
    return sqliteDb;
  }
}

/**
 * Check if we're using Postgres
 */
export function isUsingPostgres(): boolean {
  return isProduction;
}

/**
 * Close database connection (SQLite only)
 */
export function closeDatabase() {
  if (sqliteDb) {
    sqliteDb.close();
    sqliteDb = null;
    console.log('[DB] SQLite database connection closed');
  }
}

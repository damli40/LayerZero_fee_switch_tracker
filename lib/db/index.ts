/**
 * Database utilities for LayerZero Shadow Burn Dashboard
 *
 * This uses sqlite3 which has prebuilt binaries for most platforms.
 * For production, consider PostgreSQL, MySQL, or your preferred database.
 */

import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';

const DB_PATH = path.join(process.cwd(), 'data', 'shadow-burn.db');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize database
let db: sqlite3.Database | null = null;

export function getDatabase(): Promise<sqlite3.Database> {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        reject(err);
        return;
      }

      initializeSchema()
        .then(() => resolve(db!))
        .catch(reject);
    });
  });
}

async function initializeSchema() {
  if (!db) return;

  const run = promisify(db.run.bind(db));

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

  console.log('Database schema initialized');
}

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

// Close database connection
export function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}

/**
 * Database queries for Shadow Burn Dashboard
 * Updated to work with @vscode/sqlite3
 */

import { getDatabase, DailyMetricRow, MessageRow, SyncStatusRow } from './index';
import { DailyMetrics } from '../mock-api';
import { promisify } from 'util';

/**
 * Get daily metrics for a date range
 */
export async function getDailyMetrics(startDate: string, endDate: string): Promise<DailyMetrics[]> {
  const db = await getDatabase();
  const all = promisify(db.all.bind(db)) as (sql: string, params: any[]) => Promise<any[]>;

  const rows = await all(
    `SELECT * FROM daily_metrics
     WHERE date >= ? AND date <= ?
     ORDER BY date ASC`,
    [startDate, endDate]
  ) as DailyMetricRow[];

  return rows.map(row => ({
    date: row.date,
    messageCount: row.message_count,
    avgGasPaid: row.avg_gas_paid,
    medianGasPaid: row.median_gas_paid,
    totalFeeUSD: row.total_fee_usd,
    zroPrice: row.zro_price,
  }));
}

/**
 * Insert or update daily metrics
 */
export async function upsertDailyMetric(metric: {
  date: string;
  messageCount: number;
  avgGasPaid: number;
  medianGasPaid: number;
  totalFeeUSD: number;
  zroPrice: number;
}): Promise<void> {
  const db = await getDatabase();
  const run = promisify(db.run.bind(db)) as (sql: string, params: any[]) => Promise<any>;

  await run(
    `INSERT INTO daily_metrics (date, message_count, avg_gas_paid, median_gas_paid, total_fee_usd, zro_price, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(date) DO UPDATE SET
       message_count = excluded.message_count,
       avg_gas_paid = excluded.avg_gas_paid,
       median_gas_paid = excluded.median_gas_paid,
       total_fee_usd = excluded.total_fee_usd,
       zro_price = excluded.zro_price,
       updated_at = CURRENT_TIMESTAMP`,
    [
      metric.date,
      metric.messageCount,
      metric.avgGasPaid,
      metric.medianGasPaid,
      metric.totalFeeUSD,
      metric.zroPrice
    ]
  );
}

/**
 * Insert a message (ignore if already exists)
 */
export async function insertMessage(message: {
  guid: string;
  txHash: string;
  blockTimestamp: number;
  date: string;
  fromAddress?: string;
  srcChainId?: number;
  dstChainId?: number;
  feeUSD?: number;
  status?: string;
}): Promise<void> {
  const db = await getDatabase();
  const run = promisify(db.run.bind(db)) as (sql: string, params: any[]) => Promise<any>;

  try {
    await run(
      `INSERT OR IGNORE INTO layerzero_messages
       (guid, tx_hash, block_timestamp, date, from_address, src_chain_id, dst_chain_id, fee_usd, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        message.guid,
        message.txHash,
        message.blockTimestamp,
        message.date,
        message.fromAddress || null,
        message.srcChainId || null,
        message.dstChainId || null,
        message.feeUSD || null,
        message.status || null
      ]
    );
  } catch (error) {
    // Ignore duplicate key errors
    if (!(error instanceof Error) || !error.message.includes('UNIQUE constraint')) {
      throw error;
    }
  }
}

/**
 * Get the last sync status
 */
export async function getLastSyncStatus(): Promise<SyncStatusRow | null> {
  const db = await getDatabase();
  const get = promisify(db.get.bind(db));

  const row = await get(
    'SELECT * FROM sync_status ORDER BY id DESC LIMIT 1'
  ) as SyncStatusRow | undefined;

  return row || null;
}

/**
 * Insert a new sync status entry
 */
export async function insertSyncStatus(status: {
  lastSyncDate: string;
  status: 'success' | 'error' | 'pending';
  messagesSynced: number;
  errorMessage?: string;
}): Promise<void> {
  const db = await getDatabase();
  const run = promisify(db.run.bind(db)) as (sql: string, params: any[]) => Promise<any>;

  await run(
    `INSERT INTO sync_status (last_sync_date, last_sync_timestamp, status, messages_synced, error_message)
     VALUES (?, CURRENT_TIMESTAMP, ?, ?, ?)`,
    [
      status.lastSyncDate,
      status.status,
      status.messagesSynced,
      status.errorMessage || null
    ]
  );
}

/**
 * Get message count for a date
 */
export async function getMessageCountForDate(date: string): Promise<number> {
  const db = await getDatabase();
  const get = promisify(db.get.bind(db)) as (sql: string, params: any[]) => Promise<any>;

  const result = await get(
    'SELECT COUNT(*) as count FROM layerzero_messages WHERE date = ?',
    [date]
  ) as { count: number } | undefined;

  return result?.count || 0;
}

/**
 * Check if database has any data
 */
export async function hasData(): Promise<boolean> {
  const db = await getDatabase();
  const get = promisify(db.get.bind(db));

  const result = await get(
    'SELECT COUNT(*) as count FROM daily_metrics'
  ) as { count: number };

  return result.count > 0;
}

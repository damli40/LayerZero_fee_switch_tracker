-- LayerZero Shadow Burn Database Schema
-- This schema stores historical message data and pre-calculated daily metrics

-- Table: daily_metrics
-- Stores aggregated metrics for each day
CREATE TABLE IF NOT EXISTS daily_metrics (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  message_count INTEGER NOT NULL DEFAULT 0,
  avg_gas_paid DECIMAL(18, 8) NOT NULL DEFAULT 0,
  median_gas_paid DECIMAL(18, 8) NOT NULL DEFAULT 0,
  total_fee_usd DECIMAL(18, 8) NOT NULL DEFAULT 0,
  zro_price DECIMAL(18, 8) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: layerzero_messages (optional - for full message storage)
-- Stores individual messages for detailed analysis
CREATE TABLE IF NOT EXISTS layerzero_messages (
  id SERIAL PRIMARY KEY,
  guid VARCHAR(66) NOT NULL UNIQUE,
  tx_hash VARCHAR(66) NOT NULL,
  block_timestamp BIGINT NOT NULL,
  date DATE NOT NULL,
  from_address VARCHAR(42),
  src_chain_id INTEGER,
  dst_chain_id INTEGER,
  fee_usd DECIMAL(18, 8),
  status VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: sync_status
-- Tracks the last sync time and status
CREATE TABLE IF NOT EXISTS sync_status (
  id SERIAL PRIMARY KEY,
  last_sync_date DATE NOT NULL,
  last_sync_timestamp TIMESTAMP NOT NULL,
  status VARCHAR(20) DEFAULT 'success',
  messages_synced INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_daily_metrics_date ON daily_metrics(date DESC);
CREATE INDEX IF NOT EXISTS idx_messages_date ON layerzero_messages(date DESC);
CREATE INDEX IF NOT EXISTS idx_messages_guid ON layerzero_messages(guid);
CREATE INDEX IF NOT EXISTS idx_sync_status_date ON sync_status(last_sync_date DESC);

-- Initial sync status entry
INSERT INTO sync_status (last_sync_date, last_sync_timestamp, status, messages_synced)
VALUES ('2024-12-19', '2024-12-19 00:00:00', 'pending', 0)
ON CONFLICT DO NOTHING;

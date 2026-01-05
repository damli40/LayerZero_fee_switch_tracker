/**
 * Dune Analytics API Integration
 * Fetches LayerZero fee data from Dune's layerzero.messages dataset
 */

const DUNE_API_BASE = 'https://api.dune.com/api/v1';

interface DuneExecutionResponse {
  execution_id: string;
  state: string;
}

interface DuneResultRow {
  date: string;
  total_executor_fees: number;
  total_dvn_fees: number;
  message_count: number;
  median_protocol_fee: number;
}

interface DuneResultsResponse {
  execution_id: string;
  query_id: number;
  state: string;
  result?: {
    rows: DuneResultRow[];
    metadata: {
      column_names: string[];
      column_types: string[];
      row_count: number;
      result_set_bytes: number;
      total_row_count: number;
      total_result_set_bytes: number;
      datapoint_count: number;
      pending_time_millis: number;
      execution_time_millis: number;
    };
  };
}

export interface DuneDailyMetrics {
  date: string;
  messageCount: number;
  totalExecutorFees: number;
  totalDvnFees: number;
  totalProtocolFee: number; // executor + dvn fees
  medianProtocolFee: number; // median fee calculated from individual messages
}

/**
 * Execute a SQL query on Dune Analytics
 */
async function executeDuneQuery(sql: string): Promise<string> {
  const apiKey = process.env.DUNE_API_KEY;

  if (!apiKey) {
    throw new Error('DUNE_API_KEY environment variable is not set');
  }

  const response = await fetch(`${DUNE_API_BASE}/sql/execute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-DUNE-API-KEY': apiKey,
    },
    body: JSON.stringify({
      sql: sql,
      performance: 'medium', // Can be 'medium' or 'large'
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Dune API execution failed: ${response.status} - ${error}`);
  }

  const data: DuneExecutionResponse = await response.json();
  return data.execution_id;
}

/**
 * Poll Dune API for query results
 */
async function pollDuneResults(executionId: string, maxAttempts = 60): Promise<DuneResultsResponse> {
  const apiKey = process.env.DUNE_API_KEY;

  if (!apiKey) {
    throw new Error('DUNE_API_KEY environment variable is not set');
  }

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await fetch(`${DUNE_API_BASE}/execution/${executionId}/results`, {
      headers: {
        'X-DUNE-API-KEY': apiKey,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Dune API results failed: ${response.status} - ${error}`);
    }

    const data: DuneResultsResponse = await response.json();

    if (data.state === 'QUERY_STATE_COMPLETED') {
      return data;
    }

    if (data.state === 'QUERY_STATE_FAILED') {
      throw new Error('Dune query execution failed');
    }

    // Wait 2 seconds before next poll
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  throw new Error('Dune query timeout - exceeded maximum polling attempts');
}

/**
 * Fetch LayerZero daily fee metrics from Dune
 */
export async function fetchDuneDailyMetrics(
  startDate: Date,
  endDate: Date = new Date()
): Promise<Map<string, DuneDailyMetrics>> {
  console.log('Fetching LayerZero metrics from Dune Analytics...');

  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];

  // SQL query to get daily fee summaries from Dune with median calculation
  // Using approx_percentile for true median calculation from individual message fees
  const sql = `
    SELECT
      DATE_TRUNC('day', ts_source) as date,
      COUNT(*) as message_count,
      SUM(usd_executor_fee) as total_executor_fees,
      SUM(usd_dvn_fee) as total_dvn_fees,
      approx_percentile(usd_executor_fee + usd_dvn_fee, 0.5) as median_protocol_fee
    FROM layerzero.messages
    WHERE ts_source >= TIMESTAMP '${startDateStr}'
      AND ts_source < TIMESTAMP '${endDateStr}' + INTERVAL '1' DAY
    GROUP BY DATE_TRUNC('day', ts_source)
    ORDER BY date ASC
  `;

  console.log('Executing Dune query...');
  const executionId = await executeDuneQuery(sql);

  console.log(`Query submitted, execution ID: ${executionId}`);
  console.log('Waiting for query results...');

  const results = await pollDuneResults(executionId);

  if (!results.result || !results.result.rows) {
    throw new Error('No results returned from Dune query');
  }

  console.log(`Received ${results.result.rows.length} days of data from Dune`);

  // Debug: Log first row to see what Dune returned
  if (results.result.rows.length > 0) {
    console.log('Sample row from Dune:', JSON.stringify(results.result.rows[0], null, 2));
  }

  // Convert to Map
  const metricsMap = new Map<string, DuneDailyMetrics>();

  results.result.rows.forEach((row) => {
    // Extract date from timestamp
    // Dune returns dates like "2024-12-27 00:00:00.000 UTC"
    const date = row.date.split(' ')[0]; // Extract '2024-12-27' from date string

    const totalProtocolFee = row.total_executor_fees + row.total_dvn_fees;

    metricsMap.set(date, {
      date,
      messageCount: row.message_count,
      totalExecutorFees: row.total_executor_fees,
      totalDvnFees: row.total_dvn_fees,
      totalProtocolFee,
      medianProtocolFee: row.median_protocol_fee,
    });
  });

  return metricsMap;
}

/**
 * Calculate average and median fees from Dune data
 */
export function calculateDuneStats(metrics: DuneDailyMetrics): {
  avgFee: number;
  medianFee: number;
} {
  // Calculate average from total fees / message count
  const avgFee = metrics.messageCount > 0
    ? metrics.totalProtocolFee / metrics.messageCount
    : 0;

  // Use the median calculated by Dune's approx_percentile function
  // This is the true median from individual message fees
  const medianFee = metrics.medianProtocolFee || 0;

  return { avgFee, medianFee };
}

/**
 * Main function to fetch and process Dune data for the dashboard
 */
export async function fetchLayerZeroDailyMetricsFromDune(
  startDate: Date,
  endDate: Date = new Date()
): Promise<Map<string, { messageCount: number; avgFee: number; medianFee: number }>> {
  const duneMetrics = await fetchDuneDailyMetrics(startDate, endDate);

  const result = new Map<string, { messageCount: number; avgFee: number; medianFee: number }>();

  duneMetrics.forEach((metrics, date) => {
    const { avgFee, medianFee } = calculateDuneStats(metrics);
    result.set(date, {
      messageCount: metrics.messageCount,
      avgFee,
      medianFee,
    });
  });

  return result;
}

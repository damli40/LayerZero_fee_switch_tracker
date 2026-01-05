/**
 * Mock API service for LayerZero data
 * This will be replaced with real LayerZero Scan API calls later
 */

export interface DailyMetrics {
  date: string;
  messageCount: number;
  avgGasPaid: number;  // in USD
  medianGasPaid: number;  // in USD
  totalFeeUSD: number;  // total cumulative fees for the day in USD
  zroPrice: number;  // ZRO price at this date in USD
}

export interface MarketData {
  zroPrice: number;
  lastUpdated?: Date;
}

/**
 * Generates mock daily metrics for the last N days
 * Accepts optional historical prices map from CoinGecko
 */
export function generateMockDailyMetrics(
  days: number = 60,
  historicalPrices?: Map<string, number>
): DailyMetrics[] {
  const metrics: DailyMetrics[] = [];
  const baseDate = new Date();

  // Base values with some trend
  const baseMessageCount = 150000;
  const baseAvgGas = 0.12;
  const baseMedianGas = 0.08;
  const fallbackPrice = 3.50;

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    // Add growth trend + daily variation
    const growthFactor = 1 + (days - i) * 0.003; // 0.3% daily growth
    const dailyVariation = 0.85 + Math.random() * 0.3; // 85-115% variation

    // Get historical price for this date, or use fallback
    const zroPrice = historicalPrices?.get(dateStr) || fallbackPrice;

    const messageCount = Math.floor(baseMessageCount * growthFactor * dailyVariation);
    const avgGasPaid = Number((baseAvgGas * (0.95 + Math.random() * 0.1)).toFixed(4));

    metrics.push({
      date: dateStr,
      messageCount,
      avgGasPaid,
      medianGasPaid: Number((baseMedianGas * (0.95 + Math.random() * 0.1)).toFixed(4)),
      totalFeeUSD: Number((messageCount * avgGasPaid).toFixed(2)),
      zroPrice: Number(zroPrice.toFixed(4)),
    });
  }

  return metrics;
}

/**
 * Returns mock market data (use getCurrentZROPrice from coingecko-api for live data)
 */
export function getMockMarketData(): MarketData {
  return {
    zroPrice: 3.50,
    lastUpdated: new Date()
  };
}

/**
 * Filters metrics from a specific date onwards
 */
export function getMetricsSinceDate(
  metrics: DailyMetrics[],
  sinceDate: Date
): DailyMetrics[] {
  const sinceDateStr = sinceDate.toISOString().split('T')[0];
  return metrics.filter(m => m.date >= sinceDateStr);
}

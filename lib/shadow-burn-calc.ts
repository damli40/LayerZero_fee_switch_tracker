/**
 * Shadow Burn Calculation Utilities
 * Formula: Protocol Fee = 100% of gas fee (matching the gas fee)
 * Burn Amount = Total_Fee_USD / ZRO_Price
 */

import { DailyMetrics } from './mock-api';

/**
 * Calculate daily shadow burn amount from total fees
 */
export function calculateDailyBurn(
  totalFeeUSD: number,
  zroPrice: number
): number {
  // Since protocol fee = 100% of gas fee, burn amount in ZRO tokens:
  const burnAmount = totalFeeUSD / zroPrice;
  return burnAmount;
}

/**
 * Calculate total shadow burn from historical data
 * Uses the ZRO price from each day's data (price at time of transaction)
 */
export function calculateTotalBurn(
  metrics: DailyMetrics[]
): number {
  return metrics.reduce((total, day) => {
    return total + calculateDailyBurn(day.totalFeeUSD, day.zroPrice);
  }, 0);
}

/**
 * Calculate total USD value of missed fees
 */
export function calculateTotalUSDValue(
  metrics: DailyMetrics[]
): number {
  return metrics.reduce((total, day) => {
    return total + day.totalFeeUSD;
  }, 0);
}

/**
 * Get daily burn breakdown for charting
 * Uses the ZRO price from each day's data
 */
export function getDailyBurnBreakdown(
  metrics: DailyMetrics[]
) {
  return metrics.map(day => ({
    date: day.date,
    messageCount: day.messageCount,
    totalFeeUSD: day.totalFeeUSD,
    zroPrice: day.zroPrice,
    burnAmount: calculateDailyBurn(day.totalFeeUSD, day.zroPrice),
  }));
}

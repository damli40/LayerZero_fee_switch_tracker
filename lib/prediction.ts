/**
 * Predictive Analytics for Shadow Burn
 * Uses simple-statistics for linear regression on message volume
 */

import { linearRegression, linearRegressionLine } from 'simple-statistics';
import { DailyMetrics } from './mock-api';
import { calculateDailyBurn } from './shadow-burn-calc';

/**
 * Prepare data for regression analysis
 * Returns [x, y] pairs where x is day index and y is message count
 */
function prepareRegressionData(metrics: DailyMetrics[]): [number, number][] {
  return metrics.map((day, index) => [index, day.messageCount]);
}

/**
 * Calculate linear regression from historical message volume
 */
export function calculateVolumeRegression(metrics: DailyMetrics[]) {
  const data = prepareRegressionData(metrics);
  const regression = linearRegression(data);
  const line = linearRegressionLine(regression);

  return {
    slope: regression.m,
    intercept: regression.b,
    predictFn: line,
  };
}

/**
 * Predict future message volume based on linear trend
 */
export function predictFutureVolume(
  historicalMetrics: DailyMetrics[],
  daysAhead: number
): number[] {
  const regression = calculateVolumeRegression(historicalMetrics);
  const predictions: number[] = [];

  const startIndex = historicalMetrics.length;

  for (let i = 0; i < daysAhead; i++) {
    const predictedVolume = regression.predictFn(startIndex + i);
    // Ensure non-negative predictions
    predictions.push(Math.max(0, Math.round(predictedVolume)));
  }

  return predictions;
}

/**
 * Calculate average daily total fee from historical data
 */
function calculateAverageDailyTotalFee(
  metrics: DailyMetrics[]
): number {
  const total = metrics.reduce((sum, day) => {
    return sum + day.totalFeeUSD;
  }, 0);
  return total / metrics.length;
}

/**
 * Calculate average ZRO price from recent historical data
 */
function calculateAverageZROPrice(metrics: DailyMetrics[]): number {
  const total = metrics.reduce((sum, day) => sum + day.zroPrice, 0);
  return total / metrics.length;
}

/**
 * Predict future burn based on average daily total fees
 * Uses average of recent ZRO prices for future projections
 */
export function predictFutureBurn(
  historicalMetrics: DailyMetrics[],
  daysAhead: number,
  currentZROPrice: number
): {
  dailyBurn: number[];
  totalBurn: number;
  totalUSDValue: number;
  avgZROPrice: number;
} {
  const avgDailyTotalFee = calculateAverageDailyTotalFee(historicalMetrics);

  // Use average of recent prices or current price for predictions
  const avgZROPrice = calculateAverageZROPrice(historicalMetrics);
  const predictivePrice = avgZROPrice || currentZROPrice;

  // Calculate daily burn for each future day using average daily total fee
  const dailyBurn: number[] = [];
  for (let i = 0; i < daysAhead; i++) {
    dailyBurn.push(calculateDailyBurn(avgDailyTotalFee, predictivePrice));
  }

  const totalBurn = dailyBurn.reduce((sum, burn) => sum + burn, 0);
  const totalUSDValue = avgDailyTotalFee * daysAhead;

  return {
    dailyBurn,
    totalBurn,
    totalUSDValue,
    avgZROPrice: predictivePrice,
  };
}

/**
 * Get regression trend info for display
 */
export function getRegressionTrendInfo(metrics: DailyMetrics[]) {
  const regression = calculateVolumeRegression(metrics);
  const currentAvg = metrics.reduce((sum, m) => sum + m.messageCount, 0) / metrics.length;
  const percentChangePerDay = (regression.slope / currentAvg) * 100;

  return {
    slope: regression.slope,
    percentChangePerDay,
    trend: regression.slope > 0 ? 'increasing' : regression.slope < 0 ? 'decreasing' : 'stable',
  };
}

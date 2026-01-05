/**
 * API Client for Shadow Burn Dashboard
 * Fetches data from local database API
 */

import { DailyMetrics } from './mock-api';

export interface MetricsResponse {
  metrics: DailyMetrics[];
  currentZROPrice: number;
  lastUpdated: string;
  error?: string;
  needsSync?: boolean;
}

/**
 * Fetch daily metrics from the database API
 */
export async function fetchMetricsFromAPI(
  startDate: string,
  endDate: string
): Promise<MetricsResponse> {
  try {
    const url = `/api/metrics?start=${startDate}&end=${endDate}`;
    const response = await fetch(url, {
      next: { revalidate: 60 }, // Cache for 1 minute
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch metrics');
    }

    const data: MetricsResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching metrics from API:', error);
    throw error;
  }
}

/**
 * Check if database is initialized
 */
export async function checkDatabaseStatus(): Promise<{
  initialized: boolean;
  needsSync: boolean;
}> {
  try {
    // Try fetching a small date range
    const today = new Date().toISOString().split('T')[0];
    const response = await fetch(`/api/metrics?start=${today}&end=${today}`);

    if (response.status === 404) {
      const data = await response.json();
      return {
        initialized: false,
        needsSync: data.needsSync || true,
      };
    }

    return {
      initialized: true,
      needsSync: false,
    };
  } catch (error) {
    console.error('Error checking database status:', error);
    return {
      initialized: false,
      needsSync: true,
    };
  }
}

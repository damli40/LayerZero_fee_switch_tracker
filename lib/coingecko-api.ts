/**
 * CoinGecko API Service for ZRO Token Price
 * Free API - no key required
 */

const COINGECKO_API_BASE = 'https://api.coingecko.com/api/v3';
const ZRO_COIN_ID = 'layerzero'; // CoinGecko ID for LayerZero token

export interface HistoricalPrice {
  date: string; // YYYY-MM-DD format
  price: number;
}

/**
 * Fetch current ZRO price in USD
 */
export async function getCurrentZROPrice(): Promise<number> {
  try {
    const response = await fetch(
      `${COINGECKO_API_BASE}/simple/price?ids=${ZRO_COIN_ID}&vs_currencies=usd`,
      {
        next: { revalidate: 60 } // Cache for 60 seconds
      }
    );

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();
    return data[ZRO_COIN_ID]?.usd || 3.50; // Fallback to mock price
  } catch (error) {
    console.error('Error fetching current ZRO price:', error);
    return 3.50; // Fallback to mock price
  }
}

/**
 * Fetch historical ZRO prices for a date range
 * CoinGecko free API returns daily prices
 */
export async function getHistoricalZROPrices(
  fromDate: Date,
  toDate: Date = new Date()
): Promise<Map<string, number>> {
  try {
    const fromTimestamp = Math.floor(fromDate.getTime() / 1000);
    const toTimestamp = Math.floor(toDate.getTime() / 1000);

    const response = await fetch(
      `${COINGECKO_API_BASE}/coins/${ZRO_COIN_ID}/market_chart/range?vs_currency=usd&from=${fromTimestamp}&to=${toTimestamp}`,
      {
        next: { revalidate: 3600 } // Cache for 1 hour
      }
    );

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();
    const priceMap = new Map<string, number>();

    // data.prices is an array of [timestamp_ms, price]
    if (data.prices && Array.isArray(data.prices)) {
      data.prices.forEach(([timestamp, price]: [number, number]) => {
        const date = new Date(timestamp);
        const dateStr = date.toISOString().split('T')[0];

        // If multiple prices for same day, keep the latest (most recent timestamp)
        if (!priceMap.has(dateStr) || timestamp > (priceMap.get(dateStr) || 0)) {
          priceMap.set(dateStr, price);
        }
      });
    }

    return priceMap;
  } catch (error) {
    console.error('Error fetching historical ZRO prices:', error);
    return new Map(); // Return empty map on error
  }
}

/**
 * Get price for a specific date, with fallback
 */
export function getPriceForDate(
  date: string,
  priceMap: Map<string, number>,
  fallbackPrice: number = 3.50
): number {
  return priceMap.get(date) || fallbackPrice;
}

/**
 * Fill missing dates with interpolation or nearest price
 * For dates before any known price data, use the first known price
 */
export function fillMissingPrices(
  dates: string[],
  priceMap: Map<string, number>,
  fallbackPrice: number = 3.50
): Map<string, number> {
  const filledMap = new Map<string, number>();

  // Find the first date with actual price data
  let firstKnownPrice: number | null = null;
  let firstKnownDate: string | null = null;

  for (const date of dates) {
    if (priceMap.has(date)) {
      firstKnownPrice = priceMap.get(date)!;
      firstKnownDate = date;
      break;
    }
  }

  // Start with first known price if available, otherwise fallback
  let lastKnownPrice = firstKnownPrice || fallbackPrice;

  dates.forEach(date => {
    if (priceMap.has(date)) {
      // Use actual price data
      lastKnownPrice = priceMap.get(date)!;
      filledMap.set(date, lastKnownPrice);
    } else if (firstKnownDate && date < firstKnownDate) {
      // For dates before first known price, use the first known price
      filledMap.set(date, firstKnownPrice!);
    } else {
      // For dates after we have data, forward-fill with last known price
      filledMap.set(date, lastKnownPrice);
    }
  });

  return filledMap;
}

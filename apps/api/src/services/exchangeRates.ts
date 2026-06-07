import { FALLBACK_RATES_USD } from '@wanderlog/shared';
import { logger } from '../shared/utils/logger.js';

interface RateCache {
  rates: Record<string, number>;
  fetchedAt: number;
}

// Cache live rates for 6 hours — exchange rates don't move fast enough to
// justify hitting the API on every budget calculation.
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
let cache: RateCache | null = null;

/**
 * Returns a table of exchange rates relative to USD (units per 1 USD).
 * Uses the free exchangerate-api.com endpoint when EXCHANGE_RATE_API_KEY is
 * configured; otherwise falls back to the static rate table. The result is
 * cached in memory so the budget endpoints stay fast.
 */
export async function getRates(): Promise<Record<string, number>> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.rates;
  }

  const apiKey = process.env.EXCHANGE_RATE_API_KEY;
  if (!apiKey) {
    return FALLBACK_RATES_USD;
  }

  try {
    const res = await fetch(
      `https://v6.exchangerate-api.com/v6/${apiKey}/latest/USD`,
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const body = (await res.json()) as {
      result: string;
      conversion_rates: Record<string, number>;
    };

    if (body.result !== 'success' || !body.conversion_rates) {
      throw new Error('Unexpected API response');
    }

    cache = { rates: body.conversion_rates, fetchedAt: Date.now() };
    logger.info('Refreshed live exchange rates');
    return cache.rates;
  } catch (err) {
    logger.warn('Exchange rate fetch failed, using fallback rates', {
      error: err instanceof Error ? err.message : String(err),
    });
    return FALLBACK_RATES_USD;
  }
}

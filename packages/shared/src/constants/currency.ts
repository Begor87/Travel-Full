export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
}

/** Common travel currencies. Extend freely — the converter falls back gracefully. */
export const CURRENCIES: CurrencyInfo[] = [
  { code: 'USD', symbol: '$',  name: 'US Dollar' },
  { code: 'EUR', symbol: '€',  name: 'Euro' },
  { code: 'GBP', symbol: '£',  name: 'British Pound' },
  { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone' },
  { code: 'SEK', symbol: 'kr', name: 'Swedish Krona' },
  { code: 'DKK', symbol: 'kr', name: 'Danish Krone' },
  { code: 'JPY', symbol: '¥',  name: 'Japanese Yen' },
  { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc' },
  { code: 'CAD', symbol: '$',  name: 'Canadian Dollar' },
  { code: 'AUD', symbol: '$',  name: 'Australian Dollar' },
  { code: 'NZD', symbol: '$',  name: 'New Zealand Dollar' },
  { code: 'THB', symbol: '฿',  name: 'Thai Baht' },
  { code: 'SGD', symbol: '$',  name: 'Singapore Dollar' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  { code: 'INR', symbol: '₹',  name: 'Indian Rupee' },
  { code: 'CNY', symbol: '¥',  name: 'Chinese Yuan' },
  { code: 'MXN', symbol: '$',  name: 'Mexican Peso' },
  { code: 'ZAR', symbol: 'R',  name: 'South African Rand' },
];

export const CURRENCY_CODES = CURRENCIES.map((c) => c.code);

export function getCurrencySymbol(code: string): string {
  return CURRENCIES.find((c) => c.code === code)?.symbol ?? code;
}

export function getCurrencyName(code: string): string {
  return CURRENCIES.find((c) => c.code === code)?.name ?? code;
}

/**
 * Static fallback exchange rates relative to USD (1 USD = X units).
 * Used when no live exchange-rate API key is configured. Approximate.
 */
export const FALLBACK_RATES_USD: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  NOK: 10.7,
  SEK: 10.5,
  DKK: 6.9,
  JPY: 150,
  CHF: 0.88,
  CAD: 1.36,
  AUD: 1.52,
  NZD: 1.65,
  THB: 35.5,
  SGD: 1.34,
  AED: 3.67,
  INR: 83,
  CNY: 7.2,
  MXN: 17.1,
  ZAR: 18.6,
};

/**
 * Convert an amount between two currencies using a USD-pivot rate table.
 * `rates` maps currency code → units per 1 USD.
 */
export function convertCurrency(
  amount: number,
  from: string,
  to: string,
  rates: Record<string, number> = FALLBACK_RATES_USD,
): number {
  if (from === to) return amount;
  const fromRate = rates[from] ?? FALLBACK_RATES_USD[from];
  const toRate = rates[to] ?? FALLBACK_RATES_USD[to];
  if (!fromRate || !toRate) return amount; // unknown currency — pass through
  const inUsd = amount / fromRate;
  return inUsd * toRate;
}

export function formatMoney(amount: number, currency: string): string {
  const symbol = getCurrencySymbol(currency);
  const formatted = amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  // Symbol-after currencies (kr) read better with a space
  return ['NOK', 'SEK', 'DKK'].includes(currency)
    ? `${formatted} ${symbol}`
    : `${symbol}${formatted}`;
}

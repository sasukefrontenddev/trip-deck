export const FX_CURRENCIES = ['AED', 'USD', 'MYR', 'SGD', 'IDR'] as const;
export type FxCurrency = (typeof FX_CURRENCIES)[number];
export type FxRates = {
  base: FxCurrency;
  rates: Record<string, number>;
  updatedAt: string;
  provider: string;
};

async function readJson(response: Response) {
  const text = await response.text();
  if (!response.ok) throw new Error(`Rate provider returned ${response.status}`);
  if (!text.trim().startsWith('{')) throw new Error('Rate provider returned non-JSON data');
  try { return JSON.parse(text); } catch { throw new Error('Rate provider returned malformed JSON'); }
}

function normalize(base: FxCurrency, source: Record<string, unknown>, provider: string, updatedAt?: string): FxRates {
  const rates: Record<string, number> = { [base]: 1 };
  for (const code of FX_CURRENCIES) {
    const value = code === base ? 1 : Number(source[code] ?? source[code.toLowerCase()]);
    if (!Number.isFinite(value) || value <= 0) throw new Error(`Missing ${code} rate`);
    rates[code] = value;
  }
  return { base, rates, provider, updatedAt: updatedAt || new Date().toISOString() };
}

export async function fetchLiveFx(base: FxCurrency = 'AED'): Promise<FxRates> {
  const key = base.toLowerCase();
  const providers = [
    async () => {
      const response = await fetch(`https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${key}.json?ts=${Date.now()}`, { cache: 'no-store', headers: { Accept: 'application/json' } });
      const data = await readJson(response);
      if (!data?.[key]) throw new Error('Currency CDN returned incomplete rates');
      return normalize(base, data[key], 'Currency API (jsDelivr)', data.date ? `${data.date}T00:00:00Z` : undefined);
    },
    async () => {
      const response = await fetch(`https://latest.currency-api.pages.dev/v1/currencies/${key}.json?ts=${Date.now()}`, { cache: 'no-store', headers: { Accept: 'application/json' } });
      const data = await readJson(response);
      if (!data?.[key]) throw new Error('Currency API returned incomplete rates');
      return normalize(base, data[key], 'Currency API', data.date ? `${data.date}T00:00:00Z` : undefined);
    },
    async () => {
      const response = await fetch(`https://open.er-api.com/v6/latest/${base}?ts=${Date.now()}`, { cache: 'no-store', headers: { Accept: 'application/json' } });
      const data = await readJson(response);
      if (data?.result !== 'success' || !data?.rates) throw new Error('ExchangeRate API returned incomplete rates');
      return normalize(base, data.rates, 'ExchangeRate-API', data.time_last_update_utc);
    },
  ];
  const errors: string[] = [];
  for (const provider of providers) {
    try { return await provider(); } catch (error) { errors.push(error instanceof Error ? error.message : 'Unknown provider error'); }
  }
  throw new Error(`Live currency providers are unavailable. ${errors.join(' · ')}`);
}

export function convertWithRates(amount: number, from: string, to: string, fx: FxRates | null) {
  if (!fx || from === to) return from === to ? amount : 0;
  const fromRate = fx.rates[from];
  const toRate = fx.rates[to];
  if (!Number.isFinite(fromRate) || !Number.isFinite(toRate) || fromRate <= 0) return 0;
  return amount * (toRate / fromRate);
}

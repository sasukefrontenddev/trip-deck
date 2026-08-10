const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
export const redisConfigured = Boolean(url && token);

export async function redisCommand<T = unknown>(command: (string | number)[]): Promise<T> {
  if (!url || !token) throw new Error('Redis is not configured');
  const response = await fetch(url, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command), cache: 'no-store',
  });
  if (!response.ok) throw new Error(`Redis request failed (${response.status})`);
  const payload = await response.json(); if (payload.error) throw new Error(payload.error); return payload.result as T;
}

import { NextRequest, NextResponse } from 'next/server';
import { redisCommand, redisConfigured } from '@/lib/redis';

const STORES = new Set(['bookings','documents','itinerary','checklist','expenses','hotels','attractions','vaults']);
export const dynamic = 'force-dynamic';
export async function GET(_request: NextRequest, context: { params: Promise<{ store: string }> }) {
  const { store } = await context.params;
  if (!STORES.has(store)) return NextResponse.json({ error: 'Invalid store.' }, { status: 400 });
  if (!redisConfigured) return NextResponse.json({ configured: false, values: [] });
  try {
    const result = await redisCommand<string[]>(['HVALS', `tripdeck:v1:${store}`]);
    const values = (result || []).map(raw => { try { return JSON.parse(raw); } catch { return null; } }).filter(Boolean);
    return NextResponse.json({ configured: true, values });
  } catch { return NextResponse.json({ error: 'Database is temporarily unavailable.' }, { status: 503 }); }
}

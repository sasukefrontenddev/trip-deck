import { NextRequest, NextResponse } from 'next/server';
import { redisCommand, redisConfigured } from '@/lib/redis';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest, context: { params: Promise<{ traveler: string }> }) {
  if (!redisConfigured) return NextResponse.json({ configured: false, values: [] });
  const { traveler: encodedTraveler } = await context.params;
  const traveler = decodeURIComponent(encodedTraveler);
  if (!['Usama','Gulraiz','Nabeel','Asad','Bakhtiar Taha','Waqar'].includes(traveler)) {
    return NextResponse.json({ error: 'Invalid traveler.' }, { status: 400 });
  }
  try {
    const result = await redisCommand<string[]>(['HVALS', 'tripdeck:v1:documents']);
    const values = (result || [])
      .map(raw => { try { return JSON.parse(raw); } catch { return null; } })
      .filter((value): value is Record<string, unknown> => Boolean(value && value.traveler === traveler));
    return NextResponse.json({ configured: true, values }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Documents are temporarily unavailable.' }, { status: 503 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { redisCommand, redisConfigured } from '@/lib/redis';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string; index: string }> }) {
  if (!redisConfigured) return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });
  const { id, index } = await context.params;
  if (!/^\d+$/.test(index)) return NextResponse.json({ error: 'Invalid chunk index.' }, { status: 400 });
  try {
    const chunk = await redisCommand<string | null>(['HGET', `tripdeck:v1:documentChunks:${id}`, index]);
    if (typeof chunk !== 'string') return NextResponse.json({ error: 'Document chunk not found.' }, { status: 404 });
    return NextResponse.json({ chunk });
  } catch {
    return NextResponse.json({ error: 'Document chunk download failed.' }, { status: 503 });
  }
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string; index: string }> }) {
  if (!redisConfigured) return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });
  const { id, index } = await context.params;
  if (!/^\d+$/.test(index)) return NextResponse.json({ error: 'Invalid chunk index.' }, { status: 400 });
  try {
    const { chunk } = await request.json();
    if (typeof chunk !== 'string') return NextResponse.json({ error: 'Invalid document chunk.' }, { status: 400 });
    await redisCommand(['HSET', `tripdeck:v1:documentChunks:${id}`, index, chunk]);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Document chunk upload failed.' }, { status: 503 });
  }
}

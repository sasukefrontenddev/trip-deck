import { NextRequest, NextResponse } from 'next/server';
import { redisCommand, redisConfigured } from '@/lib/redis';

const STORES = new Set(['bookings','documents','itinerary','checklist','expenses','hotels','attractions','vaults']);
export const dynamic = 'force-dynamic';
async function paramsOf(context: { params: Promise<{ store: string; id: string }> }) { return context.params; }
export async function PUT(request: NextRequest, context: { params: Promise<{ store: string; id: string }> }) {
  const { store, id } = await paramsOf(context);
  if (!STORES.has(store)) return NextResponse.json({ error: 'Invalid store.' }, { status: 400 });
  if (!redisConfigured) return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });
  try { const { value } = await request.json(); if (!value || value.id !== id) return NextResponse.json({ error: 'Invalid record.' }, { status: 400 }); await redisCommand(['HSET', `tripdeck:v1:${store}`, id, JSON.stringify(value)]); return NextResponse.json({ ok: true }); }
  catch { return NextResponse.json({ error: 'Database write failed.' }, { status: 503 }); }
}
export async function DELETE(_request: NextRequest, context: { params: Promise<{ store: string; id: string }> }) {
  const { store, id } = await paramsOf(context);
  if (!STORES.has(store)) return NextResponse.json({ error: 'Invalid store.' }, { status: 400 });
  if (!redisConfigured) return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });
  try {
    await redisCommand(['HDEL', `tripdeck:v1:${store}`, id]);
    if (store === 'documents') await redisCommand(['DEL', `tripdeck:v1:documentChunks:${id}`]);
    return new NextResponse(null, { status: 204 });
  }
  catch { return NextResponse.json({ error: 'Database delete failed.' }, { status: 503 }); }
}

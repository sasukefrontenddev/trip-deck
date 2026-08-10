import { NextRequest, NextResponse } from 'next/server';
import { redisCommand, redisConfigured } from '@/lib/redis';

const STORES = new Set(['bookings','documents','itinerary','checklist','expenses','hotels','attractions','vaults']);
const DOCUMENT_CHUNK_SIZE = 300_000;
export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest, context: { params: Promise<{ store: string }> }) {
  const { store } = await context.params;
  if (!STORES.has(store)) return NextResponse.json({ error: 'Invalid store.' }, { status: 400 });
  if (store === 'documents') return NextResponse.json({ error: 'Traveler-scoped document access is required.' }, { status: 403 });
  if (!redisConfigured) return NextResponse.json({ configured: false, values: [] });
  try {
    const result = await redisCommand<string[]>(['HVALS', `tripdeck:v1:${store}`]);
    let values = (result || []).map(raw => { try { return JSON.parse(raw); } catch { return null; } }).filter(Boolean) as any[];

    if (store === 'documents') {
      // Only return lightweight encrypted-document metadata here. File payloads are fetched
      // chunk-by-chunk by the browser, which avoids large Vercel/Redis responses on phones.
      values = await Promise.all(values.map(async value => {
        if (!value?.blobDataUrl) return value;
        const dataUrl = String(value.blobDataUrl);
        const chunks: string[] = [];
        for (let offset = 0; offset < dataUrl.length; offset += DOCUMENT_CHUNK_SIZE) chunks.push(dataUrl.slice(offset, offset + DOCUMENT_CHUNK_SIZE));
        await redisCommand(['DEL', `tripdeck:v1:documentChunks:${value.id}`]);
        for (let index = 0; index < chunks.length; index++) {
          await redisCommand(['HSET', `tripdeck:v1:documentChunks:${value.id}`, String(index), chunks[index]]);
        }
        const { blobDataUrl: _oldPayload, ...metadata } = value;
        const migrated = { ...metadata, blobChunkCount: chunks.length, blobEncoding: 'data-url-chunks-v1' };
        await redisCommand(['HSET', 'tripdeck:v1:documents', value.id, JSON.stringify(migrated)]);
        return migrated;
      }));
    }

    return NextResponse.json({ configured: true, values });
  } catch {
    return NextResponse.json({ error: 'Database is temporarily unavailable.' }, { status: 503 });
  }
}

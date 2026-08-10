import { openDB, type DBSchema } from 'idb';

export const TRAVELERS = ['Usama', 'Gulraiz', 'Nabeel', 'Asad', 'Bakhtiar Taha', 'Waqar'] as const;
export type TravelerName = (typeof TRAVELERS)[number];
export type CountryName = 'Malaysia' | 'Singapore' | 'Indonesia';
export type DayPeriod = 'Morning' | 'Afternoon' | 'Evening';

export type Booking = {
  id: string;
  type: 'flight' | 'hotel' | 'activity' | 'transfer';
  title: string;
  subtitle: string;
  date: string;
  travelDate?: string;
  confirmation?: string;
  country: CountryName;
  airline?: string;
  flightNumber?: string;
  departureAirport?: string;
  departureAirportCode?: string;
  arrivalAirport?: string;
  arrivalAirportCode?: string;
  arrivalTime?: string;
  revisedDepartureTime?: string;
  revisedArrivalTime?: string;
  terminal?: string;
  gate?: string;
  arrivalTerminal?: string;
  arrivalGate?: string;
  checkInDesk?: string;
  aircraft?: string;
  aircraftRegistration?: string;
  aircraftModeS?: string;
  providerStatus?: string;
  status?: string;
  providerLastChecked?: string;
  reminderEnabled?: boolean;
};

export type DocumentVault = { id: string; traveler: TravelerName; salt: string; verifier: string; iterations: number; createdAt: string };

export type TripDocument = {
  id: string;
  traveler: TravelerName;
  category: 'Passport' | 'Visa' | 'Ticket' | 'Insurance' | 'Hotel' | 'Itinerary' | 'Other';
  name: string;
  type: string;
  size: number;
  createdAt: string;
  blob: Blob;
  encrypted?: boolean;
  encryptionIv?: string;
  originalType?: string;
};

export type ItineraryItem = { id: string; title: string; location: string; date: string; time: string; country: CountryName; notes?: string; attractionId?: string; period?: DayPeriod; source?: 'manual' | 'pdf'; sourceDocumentId?: string; commuteFrom?: string; distanceKm?: number; commuteMinutes?: number; commuteMode?: string; commuteCost?: number; commuteCurrency?: string; commuteNote?: string; activityCost?: number; activityCurrency?: string };
export type ChecklistItem = { id: string; title: string; category: string; done: boolean };
export type Expense = {
  id: string; title: string; amount: number; currency: string; country: CountryName;
  category: 'Food' | 'Transport' | 'Hotel' | 'Attraction' | 'Shopping' | 'Flights' | 'Other';
  paidBy: TravelerName; date: string; notes?: string; merchant?: string;
  paymentMethod?: 'Cash' | 'Card' | 'Bank transfer' | 'E-wallet'; splitCount?: number;
  splitWith?: TravelerName[]; splitShares?: Partial<Record<TravelerName, number>>;
  localAmount?: number; aedAmount?: number; fxRateToAED?: number; fxProvider?: string; fxUpdatedAt?: string;
};
export type HotelStay = {
  id: string; country: CountryName; city: string; name: string; address: string; airport: string;
  distanceKm: number; transferMinutes: number; checkIn: string; checkOut: string; confirmation?: string;
  phone?: string; notes?: string; reminderEnabled?: boolean; bookingProvider?: string;
};
export type Attraction = {
  id: string; country: CountryName; city: string; name: string; category: string; description?: string;
  adultPrice?: number; childPrice?: number; currency?: string; aedAdult?: number; aedChild?: number; freeEntry?: boolean;
  lastChecked?: string; pricingNote?: string; latitude?: number; longitude?: number; indoor?: boolean; outdoor?: boolean;
  familyFriendly?: boolean; duration?: string; bestTime?: string; accessibility?: string; address?: string;
  plannedDate?: string; estimatedCost?: number; distanceFromHotelKm?: number; saved: boolean; wishlist?: boolean;
  visited?: boolean; notes?: string;
};

export type TripStoreName = 'bookings' | 'documents' | 'itinerary' | 'checklist' | 'expenses' | 'hotels' | 'attractions' | 'vaults';
type SyncMutation = { id: string; store: TripStoreName; operation: 'put' | 'delete'; key: string; value?: unknown; createdAt: string };

interface TripDB extends DBSchema {
  bookings: { key: string; value: Booking };
  documents: { key: string; value: TripDocument };
  itinerary: { key: string; value: ItineraryItem };
  checklist: { key: string; value: ChecklistItem };
  expenses: { key: string; value: Expense };
  hotels: { key: string; value: HotelStay };
  attractions: { key: string; value: Attraction };
  vaults: { key: string; value: DocumentVault };
  syncQueue: { key: string; value: SyncMutation };
}

const dbPromise = typeof window === 'undefined' ? null : openDB<TripDB>('tripdeck', 9, {
  async upgrade(db, oldVersion, _newVersion, transaction) {
    if (!db.objectStoreNames.contains('bookings')) db.createObjectStore('bookings', { keyPath: 'id' });
    if (!db.objectStoreNames.contains('documents')) db.createObjectStore('documents', { keyPath: 'id' });
    if (!db.objectStoreNames.contains('itinerary')) db.createObjectStore('itinerary', { keyPath: 'id' });
    if (!db.objectStoreNames.contains('checklist')) db.createObjectStore('checklist', { keyPath: 'id' });
    if (!db.objectStoreNames.contains('expenses')) db.createObjectStore('expenses', { keyPath: 'id' });
    if (!db.objectStoreNames.contains('hotels')) db.createObjectStore('hotels', { keyPath: 'id' });
    if (!db.objectStoreNames.contains('attractions')) db.createObjectStore('attractions', { keyPath: 'id' });
    if (!db.objectStoreNames.contains('vaults')) db.createObjectStore('vaults', { keyPath: 'id' });
    if (!db.objectStoreNames.contains('syncQueue')) db.createObjectStore('syncQueue', { keyPath: 'id' });

    if (oldVersion < 3 && db.objectStoreNames.contains('documents')) {
      const store = transaction.objectStore('documents'); let cursor = await store.openCursor();
      while (cursor) { const doc = cursor.value as TripDocument & { traveler?: TravelerName; category?: TripDocument['category'] }; await cursor.update({ ...doc, traveler: doc.traveler || 'Usama', category: doc.category || 'Other' }); cursor = await cursor.continue(); }
    }
    if (oldVersion < 6 && db.objectStoreNames.contains('bookings')) {
      const store = transaction.objectStore('bookings'); let cursor = await store.openCursor();
      while (cursor) { const booking = cursor.value as Booking; if (booking.type === 'flight') { const normalized = booking.date?.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/); if (normalized && normalized[1] < '2026-08-21') await cursor.update({ ...booking, date: `2026-08-21T${normalized[2]}`, travelDate: '2026-08-21' }); } cursor = await cursor.continue(); }
    }
    if (oldVersion < 8 && db.objectStoreNames.contains('bookings')) {
      const store = transaction.objectStore('bookings');
      for (const id of ['b1', 'b2', 'b3', 'b4']) await store.delete(id);
    }
  },
});

async function blobToDataUrl(blob: Blob) {
  const buffer = await blob.arrayBuffer();
  let binary = ''; const bytes = new Uint8Array(buffer); const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return `data:${blob.type || 'application/octet-stream'};base64,${btoa(binary)}`;
}
function dataUrlToBlob(dataUrl: string) {
  const [meta, encoded] = dataUrl.split(','); const mime = meta.match(/^data:(.*?);base64$/)?.[1] || 'application/octet-stream';
  const binary = atob(encoded || ''); const bytes = new Uint8Array(binary.length); for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}
async function toCloudValue(store: TripStoreName, value: any) {
  if (store !== 'documents' || !(value?.blob instanceof Blob)) return value;
  return { ...value, blobDataUrl: await blobToDataUrl(value.blob), blob: undefined };
}
function fromCloudValue(store: TripStoreName, value: any) {
  if (store !== 'documents' || !value?.blobDataUrl) return value;
  const { blobDataUrl, ...rest } = value; return { ...rest, blob: dataUrlToBlob(blobDataUrl) };
}

const DOCUMENT_CHUNK_SIZE = 300_000;

async function withRetry<T>(operation: () => Promise<T>, attempts = 3, delayMs = 350): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try { return await operation(); }
    catch (error) {
      lastError = error;
      if (attempt < attempts - 1) await new Promise(resolve => setTimeout(resolve, delayMs * (attempt + 1)));
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Cloud request failed');
}

async function mapWithConcurrency<T>(items: T[], limit: number, worker: (item: T, index: number) => Promise<void>) {
  let next = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const index = next++;
      if (index >= items.length) return;
      await worker(items[index], index);
    }
  });
  await Promise.all(runners);
}

export async function syncDocumentToCloud(value: TripDocument) {
  if (!(value?.blob instanceof Blob)) {
    await cloudRequest(`/api/data/documents/${encodeURIComponent(value.id)}`, { method: 'PUT', body: JSON.stringify({ value }) });
    return;
  }
  const cloudValue = await toCloudValue('documents', value) as any;
  const dataUrl = String(cloudValue.blobDataUrl || '');
  const chunks: string[] = [];
  for (let offset = 0; offset < dataUrl.length; offset += DOCUMENT_CHUNK_SIZE) chunks.push(dataUrl.slice(offset, offset + DOCUMENT_CHUNK_SIZE));
  // Upload encrypted payload chunks first. The metadata pointer is committed last so
  // another device never sees a document whose payload is only partially uploaded.
  await mapWithConcurrency(chunks, 3, async (chunk, index) => {
    await withRetry(() => cloudRequest(`/api/data/documents/${encodeURIComponent(value.id)}/chunks/${index}`, { method: 'PUT', body: JSON.stringify({ chunk }) }), 3);
  });
  const { blobDataUrl: _blobDataUrl, ...metadata } = cloudValue;
  await cloudRequest(`/api/data/documents/${encodeURIComponent(value.id)}`, {
    method: 'PUT',
    body: JSON.stringify({ value: { ...metadata, blobChunkCount: chunks.length, blobEncoding: 'data-url-chunks-v1' } }),
  });
}

async function downloadDocumentFromCloud(raw: any): Promise<any | null> {
  if (raw?.blobDataUrl) return fromCloudValue('documents', raw);
  const count = Number(raw?.blobChunkCount || 0);
  if (!count) return null;
  try {
    const pieces = new Array<string>(count);
    await mapWithConcurrency(Array.from({ length: count }, (_, index) => index), 4, async (index) => {
      const result = await withRetry(() => cloudRequest(`/api/data/documents/${encodeURIComponent(raw.id)}/chunks/${index}`), 3) as { chunk?: string };
      if (typeof result?.chunk !== 'string') throw new Error('missing document chunk');
      pieces[index] = result.chunk;
    });
    return fromCloudValue('documents', { ...raw, blobDataUrl: pieces.join('') });
  } catch {
    return null;
  }
}
async function cloudRequest(path: string, init?: RequestInit) {
  if (typeof navigator !== 'undefined' && !navigator.onLine) throw new Error('offline');
  const controller = new AbortController();
  const timeoutMs = path.startsWith('/api/data/documents') ? 20_000 : 4_500;
  const timer = typeof window !== 'undefined' ? window.setTimeout(() => controller.abort(), timeoutMs) : undefined;
  try {
    const response = await fetch(path, { ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) }, cache: 'no-store', signal: init?.signal || controller.signal });
    if (!response.ok) throw new Error(`Cloud sync failed (${response.status})`);
    return response.status === 204 ? null : response.json();
  } finally {
    if (timer !== undefined) window.clearTimeout(timer);
  }
}

async function queueMutation(mutation: Omit<SyncMutation, 'id' | 'createdAt'>) {
  const db = await dbPromise!;
  const id = crypto.randomUUID();
  await db.put('syncQueue', { ...mutation, id, createdAt: new Date().toISOString() });
  return id;
}
let flushPromise: Promise<void> | null = null;
async function flushQueue(priorityStore?: TripStoreName) {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;
  if (flushPromise) return flushPromise;
  flushPromise = (async () => {
    const db = await dbPromise!;
    const attempted = new Set<string>();

    // Drain mutations that existed when syncing started AND mutations created while the
    // flush is in progress. Each mutation is attempted at most once per pass so a broken
    // old record cannot create an infinite loop or block newer document uploads.
    while (true) {
      const queued = (await db.getAll('syncQueue')).filter(mutation => !attempted.has(mutation.id));
      if (!queued.length) break;
      const ordered = queued.sort((a, b) => {
        if (priorityStore) {
          const ap = a.store === priorityStore ? 0 : 1;
          const bp = b.store === priorityStore ? 0 : 1;
          if (ap !== bp) return ap - bp;
        }
        return a.createdAt.localeCompare(b.createdAt);
      });

      for (const mutation of ordered) {
        attempted.add(mutation.id);
        try {
          if (mutation.operation === 'put') {
            if (mutation.store === 'documents') {
              if (!mutation.value || typeof mutation.value !== 'object') {
                throw new Error('Invalid queued document payload.');
              }
              await syncDocumentToCloud(mutation.value as TripDocument);
            } else {
              await cloudRequest(`/api/data/${mutation.store}/${encodeURIComponent(mutation.key)}`, { method: 'PUT', body: JSON.stringify({ value: await toCloudValue(mutation.store, mutation.value) }) });
            }
          } else await cloudRequest(`/api/data/${mutation.store}/${encodeURIComponent(mutation.key)}`, { method: 'DELETE' });
          await db.delete('syncQueue', mutation.id);
        } catch {
          // Keep this mutation for the next sync pass, but continue with every later item.
        }
      }
    }
  })().finally(() => { flushPromise = null; });
  return flushPromise;
}



export async function getAll<T extends TripStoreName>(store: T): Promise<TripDB[T]['value'][]> {
  // Critical path is LOCAL ONLY. IndexedDB is the instant/offline source of truth.
  // Cloud reconciliation is deliberately separated so opening Bookings/Stays/Itinerary
  // never waits for Redis, Vercel cold starts or the network.
  const db = await dbPromise!;
  return db.getAll(store as any) as Promise<TripDB[T]['value'][]>;
}

export async function syncStoreFromCloud<T extends TripStoreName>(store: T): Promise<boolean> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return false;
  const db = await dbPromise!;
  try {
    // Push pending local mutations first so a stale cloud copy cannot overwrite them.
    await flushQueue(store);
    const remote = await cloudRequest(`/api/data/${store}`) as { values?: any[]; configured?: boolean };
    if (!remote?.configured || !Array.isArray(remote.values)) return false;

    const local = await db.getAll(store as any) as any[];
    if (!remote.values.length && local.length) {
      // First-run migration is background-only.
      await Promise.allSettled(local.map(async value => {
        if (store === 'documents') return syncDocumentToCloud(value);
        return cloudRequest(`/api/data/${store}/${encodeURIComponent(value.id)}`, {
          method: 'PUT', body: JSON.stringify({ value: await toCloudValue(store, value) })
        });
      }));
      return false;
    }

    let changed = false;
    const remoteIds = new Set(remote.values.map((raw: any) => raw?.id).filter(Boolean));

    // Document vaults were added after the original local-only app. A document may therefore
    // exist only on an older desktop even though the sync queue no longer contains its upload.
    // Repair that situation by backfilling any local document missing from cloud.
    if (store === 'documents') {
      const missingRemote = local.filter(value => !remoteIds.has(value.id));
      if (missingRemote.length) await Promise.allSettled(missingRemote.map(value => syncDocumentToCloud(value)));
    }

    for (const raw of remote.values) {
      const value = store === 'documents' ? await downloadDocumentFromCloud(raw) : fromCloudValue(store, raw);
      if (!value) continue; // Keep any working local copy if a remote payload is incomplete.
      const before = await db.get(store as any, value.id) as any;
      if (!before || JSON.stringify(before) !== JSON.stringify(value)) {
        await db.put(store as any, value);
        changed = true;
      }
    }
    return changed;
  } catch {
    return false;
  }
}

export async function syncAllFromCloud(stores: TripStoreName[] = ['bookings','itinerary','checklist','expenses','hotels','attractions','vaults']): Promise<boolean> {
  const results = await Promise.allSettled(stores.map(store => syncStoreFromCloud(store)));
  return results.some(result => result.status === 'fulfilled' && result.value);
}


export async function fetchTravelerDocumentsFromCloud(traveler: TravelerName): Promise<TripDocument[]> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    const db = await dbPromise!;
    return (await db.getAll('documents')).filter(doc => doc.traveler === traveler);
  }
  const db = await dbPromise!;
  const response = await cloudRequest(`/api/data/documents/traveler/${encodeURIComponent(traveler)}`) as { values?: any[]; configured?: boolean };
  if (!response?.configured || !Array.isArray(response.values)) return [];
  const hydrated: TripDocument[] = [];
  for (const raw of response.values) {
    const value = await downloadDocumentFromCloud(raw);
    if (!value || value.traveler !== traveler) continue;
    await db.put('documents', value);
    hydrated.push(value);
  }
  // Remove stale local copies for this traveler that no longer exist in Redis.
  const remoteIds = new Set(hydrated.map(doc => doc.id));
  const locals = (await db.getAll('documents')).filter(doc => doc.traveler === traveler);
  await Promise.all(locals.filter(doc => !remoteIds.has(doc.id)).map(doc => db.delete('documents', doc.id)));
  return hydrated.sort((a,b) => b.createdAt.localeCompare(a.createdAt));
}

export async function putDocumentCloudFirst(value: TripDocument): Promise<string> {
  const db = await dbPromise!;
  // Keep a local encrypted copy for offline access, but only report success after Redis has it.
  await db.put('documents', value);
  try {
    await syncDocumentToCloud(value);
    // Clear any queued duplicate upload for the same document.
    const queued = await db.getAll('syncQueue');
    await Promise.all(queued.filter(m => m.store === 'documents' && m.key === value.id && m.operation === 'put').map(m => db.delete('syncQueue', m.id)));
  } catch (error) {
    await queueMutation({ store: 'documents', operation: 'put', key: value.id, value });
    throw error;
  }
  return value.id;
}

export async function removeDocumentCloudFirst(id: string): Promise<void> {
  const db = await dbPromise!;
  try {
    await cloudRequest(`/api/data/documents/${encodeURIComponent(id)}`, { method: 'DELETE' });
    await db.delete('documents', id);
    const queued = await db.getAll('syncQueue');
    await Promise.all(queued.filter(m => m.store === 'documents' && m.key === id).map(m => db.delete('syncQueue', m.id)));
  } catch (error) {
    throw error;
  }
}

function syncPutInBackground<T extends TripStoreName>(store: T, _value: TripDB[T]['value']) {
  // The mutation is already durable in IndexedDB's syncQueue. Prioritize the store that
  // the user just changed so document uploads are not stuck behind unrelated retries.
  void flushQueue(store);
}

export async function put<T extends TripStoreName>(store: T, value: TripDB[T]['value']) {
  const db = await dbPromise!;
  await db.put(store as any, value as any);
  // Queue immediately, then sync without blocking the UI.
  await queueMutation({ store, operation: 'put', key: (value as any).id, value });
  syncPutInBackground(store, value);
  return (value as any).id;
}

export async function remove<T extends TripStoreName>(store: T, key: string) {
  const db = await dbPromise!;
  await db.delete(store as any, key);
  await queueMutation({ store, operation: 'delete', key });
  void flushQueue(store);
}

import type { TravelerName, TripDocument, DocumentVault } from './db';

const ITERATIONS = 250_000;
const encoder = new TextEncoder();

function bytesToBase64(bytes: Uint8Array) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}
function base64ToBytes(value: string) {
  const binary = atob(value); const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
async function deriveBits(password: string, salt: Uint8Array, iterations = ITERATIONS) {
  const material = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations }, material, 256));
}
async function verifierFor(bits: Uint8Array) {
  const combined = new Uint8Array(bits.length + 18);
  combined.set(bits); combined.set(encoder.encode('TripDeck vault v1'), bits.length);
  return bytesToBase64(new Uint8Array(await crypto.subtle.digest('SHA-256', combined)));
}
async function keyFromBits(bits: Uint8Array) {
  return crypto.subtle.importKey('raw', bits as BufferSource, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

export async function createVault(traveler: TravelerName, password: string): Promise<{ vault: DocumentVault; key: CryptoKey }> {
  if (password.length < 8) throw new Error('Use a password of at least 8 characters.');
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const bits = await deriveBits(password, salt);
  return {
    vault: { id: traveler, traveler, salt: bytesToBase64(salt), verifier: await verifierFor(bits), iterations: ITERATIONS, createdAt: new Date().toISOString() },
    key: await keyFromBits(bits),
  };
}

export async function unlockVault(vault: DocumentVault, password: string): Promise<CryptoKey | null> {
  const bits = await deriveBits(password, base64ToBytes(vault.salt), vault.iterations || ITERATIONS);
  if ((await verifierFor(bits)) !== vault.verifier) return null;
  return keyFromBits(bits);
}

export async function encryptDocumentBlob(doc: TripDocument, source: Blob, key: CryptoKey): Promise<TripDocument> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, await source.arrayBuffer());
  return {
    ...doc,
    type: doc.type || source.type || 'application/octet-stream',
    originalType: doc.originalType || doc.type || source.type || 'application/octet-stream',
    encrypted: true,
    encryptionIv: bytesToBase64(iv),
    blob: new Blob([encrypted], { type: 'application/octet-stream' }),
  };
}


export async function encryptDocumentBlobWithPassword(doc: TripDocument, source: Blob, password: string): Promise<TripDocument> {
  if (password.length < 8) throw new Error('Unlock the traveler folder again before uploading documents.');
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iterations = ITERATIONS;
  const bits = await deriveBits(password, salt, iterations);
  const key = await keyFromBits(bits);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, await source.arrayBuffer());
  return {
    ...doc,
    type: doc.type || source.type || 'application/octet-stream',
    originalType: doc.originalType || doc.type || source.type || 'application/octet-stream',
    encrypted: true,
    encryptionIv: bytesToBase64(iv),
    encryptionSalt: bytesToBase64(salt),
    encryptionIterations: iterations,
    encryptionKdf: 'pbkdf2-sha256-v2',
    blob: new Blob([encrypted], { type: 'application/octet-stream' }),
  };
}

export async function decryptDocumentBlobWithPassword(doc: TripDocument, password: string): Promise<Blob> {
  if (!(doc.blob instanceof Blob)) throw new Error('Document content is not loaded on this device.');
  if (!doc.encrypted) return doc.blob;
  if (!doc.encryptionIv) throw new Error('Encrypted document is missing its IV.');
  if (!doc.encryptionSalt) throw new Error('LEGACY_DOCUMENT_KEY');
  const bits = await deriveBits(password, base64ToBytes(doc.encryptionSalt), doc.encryptionIterations || ITERATIONS);
  const key = await keyFromBits(bits);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: base64ToBytes(doc.encryptionIv) }, key, await doc.blob.arrayBuffer());
  return new Blob([plain], { type: doc.originalType || doc.type || 'application/octet-stream' });
}

export async function decryptDocumentBlob(doc: TripDocument, key: CryptoKey): Promise<Blob> {
  if (!(doc.blob instanceof Blob)) throw new Error('Document content is not loaded on this device.');
  if (!doc.encrypted) return doc.blob;
  if (!doc.encryptionIv) throw new Error('Encrypted document is missing its IV.');
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: base64ToBytes(doc.encryptionIv) }, key, await doc.blob.arrayBuffer());
  return new Blob([plain], { type: doc.originalType || doc.type || 'application/octet-stream' });
}

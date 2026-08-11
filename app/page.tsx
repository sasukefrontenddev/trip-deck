'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowDownTrayIcon, ArrowUpTrayIcon, BanknotesIcon, BellIcon, BuildingOffice2Icon,
  CalendarDaysIcon, CheckCircleIcon, ClipboardDocumentCheckIcon,
  CurrencyDollarIcon, DocumentTextIcon, FolderIcon, MapIcon, MapPinIcon,
  PaperAirplaneIcon, PhoneIcon, PlusIcon, ShieldCheckIcon, SparklesIcon,
  TrashIcon, UserGroupIcon, WifiIcon
} from '@heroicons/react/24/outline';
import CountryExplorer from '@/components/CountryExplorer';
import TripIntelligence from '@/components/TripIntelligence';
import FoodGuide from '@/components/FoodGuide';
import NearbyHalal from '@/components/NearbyHalal';
import DateTimePicker from '@/components/DateTimePicker';
import LiveMoneyAndShops from '@/components/LiveMoneyAndShops';
import { attractionDataset } from '@/lib/attractions';
import {
  Attraction, Booking, ChecklistItem, CountryName, Expense, getAll, HotelStay,
  ItineraryItem, put, remove, syncAllFromCloud, syncStoreFromCloud, TRAVELERS, TravelerName, TripDocument, DocumentVault,
  fetchTravelerDocumentsFromCloud, fetchDocumentContentFromCloud, putDocumentCloudFirst, removeDocumentCloudFirst, fetchVaultFromCloud
} from '@/lib/db';
import { convertWithRates, fetchLiveFx } from '@/lib/fx';
import { extractPdfLines, parseItineraryLines } from '@/lib/itineraryImport';
import { createVault, decryptDocumentBlob, encryptDocumentBlob, unlockVault } from '@/lib/vault';

const TRAVELER_COUNT_BY_COUNTRY: Record<CountryName, number> = { Malaysia: 5, Singapore: 6, Indonesia: 5 };
const COUNTRY_TRAVELERS: Record<CountryName, TravelerName[]> = {
  Malaysia: [...TRAVELERS.slice(0, 5)],
  Singapore: [...TRAVELERS],
  Indonesia: [...TRAVELERS.slice(0, 5)],
};

const countries: { name: CountryName; code: string; dates: string; city: string; vibe: string }[] = [
  { name: 'Malaysia', code: 'MY', dates: '22–26 Aug · 4 nights', city: 'Kuala Lumpur', vibe: 'Food, skyline and culture' },
  { name: 'Singapore', code: 'SG', dates: '26–30 Aug · 4 nights', city: 'Singapore', vibe: 'Gardens, hawkers and city lights' },
  { name: 'Indonesia', code: 'ID', dates: '30 Aug–4 Sep · 5 nights', city: 'Jakarta', vibe: 'History, food and city culture' },
];

const LEGACY_SAMPLE_FLIGHT_IDS = ['b1', 'b2', 'b3', 'b4'] as const;
const starterHotels: HotelStay[] = countries.map((country, index) => ({
  id: `hotel-${country.code}`,
  country: country.name,
  city: country.city,
  name: `Add ${country.name} hotel`,
  address: 'Add hotel address',
  airport: index === 0 ? 'Kuala Lumpur International Airport' : index === 1 ? 'Singapore Changi Airport' : 'Add arrival airport',
  distanceKm: 0,
  transferMinutes: 0,
  checkIn: index === 0 ? '2026-08-22' : index === 1 ? '2026-08-26' : '2026-08-30',
  checkOut: index === 0 ? '2026-08-26' : index === 1 ? '2026-08-30' : '2026-09-04',
}));

const starterAttractions: Attraction[] = [
  { id: 'a1', country: 'Malaysia', city: 'Kuala Lumpur', name: 'Petronas Towers', category: 'Landmark', saved: true },
  { id: 'a2', country: 'Malaysia', city: 'Kuala Lumpur', name: 'Batu Caves', category: 'Culture', saved: true },
  { id: 'a3', country: 'Singapore', city: 'Singapore', name: 'Gardens by the Bay', category: 'Nature', saved: true },
  { id: 'a4', country: 'Singapore', city: 'Singapore', name: 'Marina Bay waterfront', category: 'City walk', saved: true },
  { id: 'a5', country: 'Indonesia', city: 'Jakarta', name: 'National Monument (Monas)', category: 'Landmark', saved: true },
  { id: 'a6', country: 'Indonesia', city: 'Jakarta', name: 'Kota Tua Jakarta', category: 'Culture', saved: true },
];

const starterChecklist: ChecklistItem[] = [
  { id: 'c1', title: 'All six passports saved offline', category: 'Documents', done: false },
  { id: 'c2', title: 'Visa and entry requirements checked', category: 'Documents', done: false },
  { id: 'c3', title: 'Travel insurance saved for everyone', category: 'Safety', done: false },
  { id: 'c4', title: 'eSIM / roaming plan ready', category: 'Connectivity', done: false },
  { id: 'c5', title: 'Airport transfers confirmed', category: 'Transport', done: false },
  { id: 'c6', title: 'Hotels and addresses confirmed', category: 'Stay', done: false },
  { id: 'sgac-arrival-card', title: 'Singapore Arrival Card (SGAC) submitted', category: 'Entry requirement', done: false },
];

type Tab = 'overview' | 'smart' | 'explorer' | 'food' | 'nearby' | 'bookings' | 'itinerary' | 'documents' | 'expenses' | 'stays' | 'toolkit';
const formatDate = (value: string) => new Date(`${value.slice(0, 10)}T00:00`).toLocaleDateString('en', { day: 'numeric', month: 'short' });
const normalizeWallClock = (value: string) => {
  const match = value?.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/);
  return match ? `${match[1]}T${match[2]}` : value;
};
const formatWallClock = (value: string) => {
  const match = normalizeWallClock(value)?.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!match) return value;
  const [, year, month, day, hour, minute] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
  return date.toLocaleString(undefined, { year:'numeric', month:'numeric', day:'numeric', hour:'numeric', minute:'2-digit' });
};

const aircraftModelFromApi = (aircraft: any) => {
  const model = aircraft?.model;
  if (typeof model === 'string') return model;
  return model?.name || model?.code || aircraft?.typeName || aircraft?.icaoCode || '';
};

const airlineCodeFor = (booking?: Booking) => {
  if (!booking) return '';
  const byName: Record<string, string> = {
    'emirates': 'EK', 'etihad': 'EY', 'air arabia': 'G9', 'qatar airways': 'QR',
    'scoot': 'TR', 'singapore airlines': 'SQ', 'indonesia airasia': 'QZ', 'airasia': 'AK', 'air asia': 'AK', 'batik air': 'ID', 'citilink': 'QG', 'transnusa': '8B',
    'malaysia airlines': 'MH', 'garuda indonesia': 'GA', 'flydubai': 'FZ'
  };
  const name = String(booking.airline || '').toLowerCase().trim();
  const named = Object.entries(byName).find(([key]) => name.includes(key));
  if (named) return named[1];
  return String(booking.flightNumber || '').toUpperCase().replace(/\s+/g, '').match(/^([A-Z0-9]{2})(?=\d)/)?.[1] || '';
};
const airlineLogoUrl = (booking?: Booking) => {
  const code = airlineCodeFor(booking);
  return code ? `https://pics.avs.io/80/80/${code}.png` : '';
};
function AirlineLogo({ booking, small = false }: { booking?: Booking; small?: boolean }) {
  const code = airlineCodeFor(booking);
  const logo = airlineLogoUrl(booking);
  return <span className={`airline-logo ${small ? 'small-logo' : ''}`} aria-label={`${booking?.airline || code || 'Airline'} logo`}><span>{code || String(booking?.airline || 'AIR').slice(0,2).toUpperCase()}</span>{logo && <img src={logo} alt="" onError={e => { e.currentTarget.style.display = 'none'; }}/>}</span>;
}

export default function Home() {
  const [tab, setTab] = useState<Tab>('overview');
  const [online, setOnline] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [documents, setDocuments] = useState<TripDocument[]>([]);
  const [vaults, setVaults] = useState<DocumentVault[]>([]);
  const [unlockedTravelers, setUnlockedTravelers] = useState<TravelerName[]>([]);
  const vaultKeys = useRef<Partial<Record<TravelerName, CryptoKey>>>({});
  const [items, setItems] = useState<ItineraryItem[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [hotels, setHotels] = useState<HotelStay[]>([]);
  const [attractions, setAttractions] = useState<Attraction[]>([]);
  const [traveler, setTraveler] = useState<TravelerName>('Usama');
  const [docCategory, setDocCategory] = useState<TripDocument['category']>('Other');
  const [expenseCountry, setExpenseCountry] = useState<CountryName>('Malaysia');
  const [scrollProgress, setScrollProgress] = useState(0);
  const [explorerCountry, setExplorerCountry] = useState<CountryName>('Malaysia');
  const [itineraryCountry, setItineraryCountry] = useState<CountryName>('Malaysia');
  const [itineraryImporting, setItineraryImporting] = useState(false);
  const [itineraryImportStatus, setItineraryImportStatus] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const [vaultDialog, setVaultDialog] = useState<{ target: TravelerName; mode: 'create' | 'unlock'; password: string; confirm: string; error: string; busy: boolean } | null>(null);
  const vaultDialogResolver = useRef<((key: CryptoKey | null) => void) | null>(null);
  const documentCloudRefreshAt = useRef(0);
  const [documentSyncing, setDocumentSyncing] = useState<TravelerName | null>(null);
  const [documentSyncError, setDocumentSyncError] = useState('');
  const [deleteDocumentDialog, setDeleteDocumentDialog] = useState<TripDocument | null>(null);
  const [deletingDocument, setDeletingDocument] = useState(false);
  const [openingDocumentId, setOpeningDocumentId] = useState<string | null>(null);
  const [documentPreview, setDocumentPreview] = useState<{ doc: TripDocument; url: string; blob: Blob } | null>(null);
  const [documentSelectionMode, setDocumentSelectionMode] = useState(false);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const [bulkDeleteDialog, setBulkDeleteDialog] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  async function refresh() {
    // Private documents are deliberately excluded from normal app hydration. They are fetched
    // from Redis only after the matching traveler vault is unlocked.
    const [b, i, c, e, h, a, v] = await Promise.all([
      getAll('bookings'), getAll('itinerary'), getAll('checklist'),
      getAll('expenses'), getAll('hotels'), getAll('attractions'), getAll('vaults'),
    ]);
    setBookings(b); setItems(i); setChecklist(c); setExpenses(e); setHotels(h); setAttractions(a); setVaults(v);
  }

  async function loadTravelerDocuments(target: TravelerName, allowLocalFallback = true) {
    setDocumentSyncing(target);
    setDocumentSyncError('');
    try {
      let docs: TripDocument[] = [];
      if (navigator.onLine) docs = await fetchTravelerDocumentsFromCloud(target);
      else if (allowLocalFallback) docs = (await getAll('documents')).filter(doc => doc.traveler === target);
      setDocuments(current => [...current.filter(doc => doc.traveler !== target), ...docs]);
      return docs;
    } catch (error) {
      if (allowLocalFallback) {
        const local = (await getAll('documents')).filter(doc => doc.traveler === target);
        setDocuments(current => [...current.filter(doc => doc.traveler !== target), ...local]);
      }
      setDocumentSyncError(error instanceof Error ? error.message : 'Could not load documents from cloud.');
      return [];
    } finally {
      setDocumentSyncing(current => current === target ? null : current);
    }
  }

  useEffect(() => {
    (async () => {
      // Paint cached data first. Nothing network-related is allowed on this path.
      await refresh();

      // Local migrations/seeds are also instant; cloud writes happen in the background.
      for (const id of LEGACY_SAMPLE_FLIGHT_IDS) await remove('bookings', id);
      const existingChecklist = await getAll('checklist');
      if (!existingChecklist.length) for (const item of starterChecklist) await put('checklist', item);
      else if (!existingChecklist.some(item => item.id === 'sgac-arrival-card')) await put('checklist', starterChecklist.find(item => item.id === 'sgac-arrival-card')!);
      if (!(await getAll('hotels')).length) for (const hotel of starterHotels) await put('hotels', hotel);
      const currentHotels = await getAll('hotels');
      const indonesiaHotel = currentHotels.find(h => h.id === 'hotel-ID');
      if (indonesiaHotel?.checkOut === '2026-09-03') await put('hotels', { ...indonesiaHotel, checkOut: '2026-09-04' });
      const existingAttractions = await getAll('attractions');
      const existingById = new Map(existingAttractions.map(item => [item.id, item]));
      for (const seed of attractionDataset) {
        const existing = existingById.get(seed.id);
        await put('attractions', { ...seed, saved: existing?.saved ?? seed.saved, wishlist: existing?.wishlist ?? false, visited: existing?.visited ?? false, plannedDate: existing?.plannedDate, notes: existing?.notes });
      }
      for (const oldId of ['id-uluwatu','id-tegallalang','id-waterbom','id-monkey','id-tirta','id-tanahlot']) await remove('attractions', oldId);
      await refresh();

      // Redis reconciliation is intentionally detached from first paint.
      window.setTimeout(async () => {
        const changed = await syncAllFromCloud();
        if (changed) await refresh();
      }, 50);
    })();
    const sync = () => {
      const isOnline = navigator.onLine; setOnline(isOnline);
      if (isOnline) void syncAllFromCloud().then(changed => { if (changed) void refresh(); });
    };
    const onScroll = () => { const max = document.documentElement.scrollHeight - innerHeight; setScrollProgress(max > 0 ? scrollY / max * 100 : 0); };
    setOnline(navigator.onLine); onScroll();
    const countdownTimer = window.setInterval(() => setNow(Date.now()), 1000);
    window.addEventListener('online', sync); window.addEventListener('offline', sync); window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.clearInterval(countdownTimer); window.removeEventListener('online', sync); window.removeEventListener('offline', sync); window.removeEventListener('scroll', onScroll); };
  }, []);

  useEffect(() => {
    if (tab !== 'documents' || !online) return;
    const nowMs = Date.now();
    if (nowMs - documentCloudRefreshAt.current < 10_000) return;
    documentCloudRefreshAt.current = nowMs;
    // Vault metadata may hydrate globally; private document payloads never do.
    void syncStoreFromCloud('vaults').then(() => refresh());
  }, [tab, online]);

  useEffect(() => {
    if (!online) return;
    let cancelled = false;
    const syncLiveFlightStatuses = async () => {
      const current = await getAll('bookings');
      const currentTime = Date.now();
      const candidates = current.filter(b => {
        if (b.type !== 'flight' || !b.flightNumber) return false;
        const departureMs = +new Date(b.date);
        if (departureMs < currentTime - 12 * 60 * 60 * 1000 || departureMs > currentTime + 36 * 60 * 60 * 1000) return false;
        const lastChecked = b.providerLastChecked ? +new Date(b.providerLastChecked) : 0;
        return !lastChecked || currentTime - lastChecked > 4 * 60 * 1000;
      });
      let changed = false;
      await Promise.allSettled(candidates.map(async (booking) => {
        try {
          const travelDate = booking.travelDate || booking.date.slice(0, 10);
          const controller = new AbortController();
          const timeout = window.setTimeout(() => controller.abort(), 5500);
          const response = await fetch(`/api/flights/lookup?flightNumber=${encodeURIComponent(booking.flightNumber || '')}&date=${travelDate}`, { cache: 'no-store', signal: controller.signal });
          window.clearTimeout(timeout);
          const json = await response.json();
          if (!response.ok || !json.flight) return;
          const f = json.flight as any;
          const revisedDeparture = normalizeWallClock(f?.departure?.actualTime?.local || f?.departure?.revisedTime?.local || f?.departure?.scheduledTime?.local || booking.date);
          const revisedArrival = normalizeWallClock(f?.arrival?.actualTime?.local || f?.arrival?.revisedTime?.local || f?.arrival?.scheduledTime?.local || booking.arrivalTime || '');
          const updated: Booking = { ...booking, date: revisedDeparture || booking.date, arrivalTime: revisedArrival || booking.arrivalTime, airline: f?.airline?.name || booking.airline, departureAirport: f?.departure?.airport?.name || booking.departureAirport, departureAirportCode: f?.departure?.airport?.iata || booking.departureAirportCode, arrivalAirport: f?.arrival?.airport?.name || booking.arrivalAirport, arrivalAirportCode: f?.arrival?.airport?.iata || booking.arrivalAirportCode, terminal: f?.departure?.terminal || booking.terminal, gate: f?.departure?.gate || booking.gate, arrivalTerminal: f?.arrival?.terminal || booking.arrivalTerminal, arrivalGate: f?.arrival?.gate || booking.arrivalGate, checkInDesk: f?.departure?.checkInDesk || booking.checkInDesk, aircraft: aircraftModelFromApi(f?.aircraft) || booking.aircraft, aircraftRegistration: f?.aircraft?.registration || booking.aircraftRegistration, aircraftModeS: f?.aircraft?.modeS || f?.aircraft?.hexIcao || booking.aircraftModeS, providerStatus: f?.status || booking.providerStatus, status: f?.displayStatus || booking.status || 'EXPECTED', revisedDepartureTime: normalizeWallClock(f?.departure?.revisedTime?.local || f?.departure?.actualTime?.local || '') || booking.revisedDepartureTime, revisedArrivalTime: normalizeWallClock(f?.arrival?.revisedTime?.local || f?.arrival?.actualTime?.local || '') || booking.revisedArrivalTime, providerLastChecked: json.checkedAt || new Date().toISOString() };
          if (JSON.stringify(updated) !== JSON.stringify(booking)) { await put('bookings', updated); changed = true; }
        } catch { /* cached details remain visible instantly */ }
      }));
      if (changed && !cancelled) await refresh();
    };
    const initial = window.setTimeout(syncLiveFlightStatuses, 250);
    const timer = window.setInterval(syncLiveFlightStatuses, 5 * 60 * 1000);
    const onVisible = () => { if (document.visibilityState === 'visible') syncLiveFlightStatuses(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { cancelled = true; window.clearTimeout(initial); window.clearInterval(timer); document.removeEventListener('visibilitychange', onVisible); };
  }, [online]);

  const nextBooking = useMemo(() => {
    const completedStatuses = new Set(['IN FLIGHT', 'LANDED', 'CANCELLED']);
    const upcomingFlights = bookings.filter(b => b.type === 'flight' && +new Date(b.date) >= now && !completedStatuses.has(String(b.status || '').toUpperCase()));
    const detailedFlights = upcomingFlights.filter(b => b.flightNumber || b.departureAirportCode || b.arrivalAirportCode || b.airline);
    return [...(detailedFlights.length ? detailedFlights : upcomingFlights)].sort((a, b) => +new Date(a.date) - +new Date(b.date))[0];
  }, [bookings, now]);
  const takenFlights = useMemo(() => bookings
    .filter(b => b.type === 'flight' && +new Date(b.date) <= now && String(b.status || '').toUpperCase() !== 'CANCELLED')
    .sort((a, b) => +new Date(a.date) - +new Date(b.date)), [bookings, now]);
  const flightCountdown = useMemo(() => {
    if (!nextBooking) return null;
    const remaining = Math.max(0, +new Date(nextBooking.date) - now);
    const days = Math.floor(remaining / 86_400_000);
    const hours = Math.floor((remaining % 86_400_000) / 3_600_000);
    const minutes = Math.floor((remaining % 3_600_000) / 60_000);
    const seconds = Math.floor((remaining % 60_000) / 1_000);
    return { days, hours, minutes, seconds, departed: remaining === 0 };
  }, [nextBooking, now]);
  const prepDone = checklist.filter(i => i.done).length;
  const selectedVault = vaults.find(v => v.traveler === traveler);
  const travelerUnlocked = unlockedTravelers.includes(traveler);
  const selectedDocs = travelerUnlocked ? documents.filter(d => d.traveler === traveler) : [];

  async function ensureTravelerVault(target: TravelerName = traveler): Promise<CryptoKey | null> {
    const cached = vaultKeys.current[target];
    if (cached) return cached;
    const existing = vaults.find(v => v.traveler === target) || (await getAll('vaults')).find(v => v.traveler === target);
    return await new Promise<CryptoKey | null>((resolve) => {
      if (vaultDialogResolver.current) vaultDialogResolver.current(null);
      vaultDialogResolver.current = resolve;
      setVaultDialog({ target, mode: existing ? 'unlock' : 'create', password: '', confirm: '', error: '', busy: false });
    });
  }

  async function submitVaultDialog() {
    if (!vaultDialog || vaultDialog.busy) return;
    const { target, mode, password, confirm } = vaultDialog;
    if (password.length < 8) return setVaultDialog(current => current ? { ...current, error: 'Use at least 8 characters.' } : current);
    if (mode === 'create' && password !== confirm) return setVaultDialog(current => current ? { ...current, error: 'Passwords do not match.' } : current);
    setVaultDialog(current => current ? { ...current, busy: true, error: '' } : current);
    try {
      let key: CryptoKey | null = null;
      if (mode === 'create') {
        const created = await createVault(target, password);
        await put('vaults', created.vault);
        key = created.key;
        const legacyDocs = (await getAll('documents')).filter(d => d.traveler === target && !d.encrypted);
        for (const doc of legacyDocs) if (doc.blob instanceof Blob) await putDocumentCloudFirst(await encryptDocumentBlob(doc, doc.blob, key));
        await refresh();
      } else {
        // Always prefer the latest Redis vault metadata before deriving the AES key.
        // A phone may have an older cached salt/verifier that still accepts the same password
        // but derives a different key, causing AES-GCM decrypt to fail with OperationError.
        const cloudVault = await fetchVaultFromCloud(target);
        const existing = cloudVault || vaults.find(v => v.traveler === target) || (await getAll('vaults')).find(v => v.traveler === target);
        if (!existing) throw new Error('This private vault could not be found. Refresh the page and try again.');
        if (cloudVault) setVaults(current => [...current.filter(v => v.traveler !== target), cloudVault]);
        key = await unlockVault(existing, password);
        if (!key) throw new Error('Incorrect password.');
      }
      vaultKeys.current[target] = key;
      setUnlockedTravelers(current => Array.from(new Set([...current, target])));
      const resolver = vaultDialogResolver.current; vaultDialogResolver.current = null; setVaultDialog(null); resolver?.(key);

      // Fetch ONLY this traveler's encrypted Redis documents after successful unlock.
      // Nothing from another traveler's folder is requested or added to this browser session.
      await loadTravelerDocuments(target, true);
    } catch (error) {
      setVaultDialog(current => current ? { ...current, busy: false, error: error instanceof Error ? error.message : 'Could not unlock this folder.' } : current);
    }
  }

  function closeVaultDialog() {
    const resolver = vaultDialogResolver.current; vaultDialogResolver.current = null; setVaultDialog(null); resolver?.(null);
  }

  function lockTraveler(target: TravelerName = traveler) {
    delete vaultKeys.current[target];
    setUnlockedTravelers(current => current.filter(name => name !== target));
    setDocuments(current => current.filter(doc => doc.traveler !== target));
    setDocumentSyncError('');
    setSelectedDocumentIds([]);
    setDocumentSelectionMode(false);
  }

  function closeDocumentPreview() {
    setDocumentPreview(current => {
      if (current) URL.revokeObjectURL(current.url);
      return null;
    });
  }

  async function openPrivateDocument(doc: TripDocument) {
    const key = await ensureTravelerVault(doc.traveler);
    if (!key || openingDocumentId === doc.id) return;

    // Do not pre-open about:blank on iOS. Safari may discard or refuse to navigate that
    // temporary tab after an async Redis fetch + WebCrypto decrypt. Instead, fetch/decrypt
    // in the current app and render the ready Blob URL in a same-page secure preview.
    setOpeningDocumentId(doc.id);
    setDocumentSyncError('');
    try {
      const ready = await fetchDocumentContentFromCloud(doc);
      setDocuments(current => current.map(item => item.id === ready.id ? ready : item));
      const blob = await decryptDocumentBlob(ready, key);
      const url = URL.createObjectURL(blob);
      setDocumentPreview(current => {
        if (current) URL.revokeObjectURL(current.url);
        return { doc: ready, url, blob };
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'This document could not be opened.';
      if (error instanceof DOMException && error.name === 'OperationError') {
        delete vaultKeys.current[doc.traveler];
        setUnlockedTravelers(current => current.filter(name => name !== doc.traveler));
        setDocuments(current => current.filter(item => item.traveler !== doc.traveler));
        setDocumentSyncError('');
        setVaultDialog({ target: doc.traveler, mode: 'unlock', password: '', confirm: '', error: 'This file could not be decrypted with the cached key. Enter the traveler password again to refresh the vault key from Redis.', busy: false });
      } else {
        setDocumentSyncError(message);
      }
    } finally {
      setOpeningDocumentId(current => current === doc.id ? null : current);
    }
  }

  const countryExpenses = expenses.filter(e => e.country === expenseCountry);
  const categoryTotals = useMemo(() => Object.entries(countryExpenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount; return acc;
  }, {})), [countryExpenses]);

  async function uploadFiles(files: FileList | null) {
    if (!files?.length) return;
    const key = await ensureTravelerVault(traveler);
    if (!key) return;
    setDocumentSyncing(traveler);
    setDocumentSyncError('');
    try {
      for (const file of Array.from(files)) {
        const doc: TripDocument = { id: crypto.randomUUID(), traveler, category: docCategory, name: file.name, type: file.type || 'file', size: file.size, createdAt: new Date().toISOString(), blob: file };
        const encrypted = await encryptDocumentBlob(doc, file, key);
        // Cloud-first: the upload is considered complete only after encrypted Redis metadata
        // and all payload chunks have been written successfully.
        await putDocumentCloudFirst(encrypted);
        setDocuments(current => [...current.filter(item => item.id !== encrypted.id), encrypted]);
      }
      await loadTravelerDocuments(traveler, true);
    } catch (error) {
      setDocumentSyncError(`Upload did not reach cloud storage. ${error instanceof Error ? error.message : 'Please try again.'}`);
    } finally {
      setDocumentSyncing(current => current === traveler ? null : current);
    }
  }

  async function confirmDeleteDocument() {
    const doc = deleteDocumentDialog;
    if (!doc || deletingDocument) return;
    setDeletingDocument(true);
    setDocumentSyncError('');
    try {
      await removeDocumentCloudFirst(doc.id);
      setDocuments(current => current.filter(item => item.id !== doc.id));
      setDeleteDocumentDialog(null);
    } catch (error) {
      setDocumentSyncError(`Could not delete ${doc.name} from cloud storage. ${error instanceof Error ? error.message : ''}`.trim());
    } finally {
      setDeletingDocument(false);
    }
  }

  function toggleDocumentSelection(id: string) {
    setSelectedDocumentIds(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
  }

  function clearDocumentSelection() {
    setSelectedDocumentIds([]);
    setDocumentSelectionMode(false);
  }

  async function confirmBulkDeleteDocuments() {
    if (!selectedDocumentIds.length || bulkDeleting) return;
    setBulkDeleting(true);
    setDocumentSyncError('');
    const ids = [...selectedDocumentIds];
    const results = await Promise.allSettled(ids.map(id => removeDocumentCloudFirst(id)));
    const failures = ids.filter((_, index) => results[index].status === 'rejected');
    const deleted = ids.filter(id => !failures.includes(id));
    setDocuments(current => current.filter(doc => !deleted.includes(doc.id)));
    setSelectedDocumentIds(failures);
    setBulkDeleting(false);
    setBulkDeleteDialog(false);
    if (failures.length) setDocumentSyncError(`${failures.length} selected file${failures.length === 1 ? '' : 's'} could not be deleted from Redis. Please retry.`);
    else clearDocumentSelection();
  }

  async function enrichImportedItinerary(imported: ItineraryItem[], fileName: string) {
    if (!online || !imported.length) return;
    let enrichedCount = 0;
    let failedCount = 0;
    const completedByDay = new Map<string, ItineraryItem>();

    // Route enrichment is intentionally best-effort and runs AFTER the itinerary
    // has already been rendered. A geocoder/routing failure must never block a PDF import.
    for (const item of imported) {
      const dayKey = `${item.country}:${item.date}`;
      const previous = completedByDay.get(dayKey);
      const hotel = hotels.find(h => h.country === item.country);
      const hotelAddress = hotel && !hotel.name.startsWith('Add ') && hotel.address && !/^add /i.test(hotel.address) ? hotel.address : '';
      const origin = previous?.location || hotelAddress;
      completedByDay.set(dayKey, item);

      if (!origin || !item.location || origin.trim().toLowerCase() === item.location.trim().toLowerCase()) continue;
      try {
        const controller = new AbortController();
        const timer = window.setTimeout(() => controller.abort(), 7000);
        const response = await fetch('/api/travel', {
          method:'POST', headers:{'Content-Type':'application/json'}, signal: controller.signal,
          body:JSON.stringify({
            origin, destination:item.location, country:item.country,
            originCandidates:[origin, `${origin}, ${item.country}`],
            destinationCandidates:[item.location, `${item.location}, ${item.country}`]
          })
        });
        window.clearTimeout(timer);
        if (!response.ok) { failedCount++; continue; }
        const route = await response.json();
        const updated: ItineraryItem = {
          ...item,
          commuteFrom: origin,
          distanceKm: route.distanceKm,
          commuteMinutes: route.transit?.minutes || route.drivingMinutes,
          commuteMode: route.transit?.mode || 'Drive / taxi',
          commuteCost: route.transit?.cost,
          commuteCurrency: route.transit?.currency,
          commuteNote: route.transit?.note || 'Estimated route'
        };
        enrichedCount++;
        completedByDay.set(dayKey, updated);
        setItems(current => current.map(row => row.id === updated.id ? updated : row));
        await put('itinerary', updated);
      } catch {
        failedCount++;
        // The imported activity remains valid even when its location cannot be geocoded.
      }
    }
    setItineraryImportStatus(
      `Imported ${imported.length} activities from ${fileName}. ${enrichedCount ? `Commute details added to ${enrichedCount} ${enrichedCount === 1 ? 'activity' : 'activities'}. ` : ''}${failedCount ? `${failedCount} route ${failedCount === 1 ? 'estimate was' : 'estimates were'} unavailable and can be retried after correcting the place name.` : 'Commute enrichment complete.'}`
    );
  }

  async function importItineraryPdf(file?: File) {
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) return alert('Please select a PDF itinerary.');
    setItineraryImporting(true); setItineraryImportStatus('Reading PDF…');
    try {
      const documentId = crypto.randomUUID();
      const vaultKey = await ensureTravelerVault(traveler);
      if (!vaultKey) throw new Error('Unlock or create this traveler’s private document vault before importing an itinerary PDF.');
      const itineraryDoc: TripDocument = { id: documentId, traveler, category: 'Itinerary', name: file.name, type: file.type || 'application/pdf', size: file.size, createdAt: new Date().toISOString(), blob: file };
      await putDocumentCloudFirst(await encryptDocumentBlob(itineraryDoc, file, vaultKey));
      const lines = await extractPdfLines(file);
      setItineraryImportStatus('Structuring days and times…');
      let parsed = parseItineraryLines(lines, itineraryCountry).map(item => ({ ...item, sourceDocumentId: documentId }));
      if (!parsed.length) throw new Error('No itinerary activities could be extracted from this PDF.');
      parsed = parsed.sort((a,b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));

      // Render immediately. Commute/geocoding is a secondary enhancement and must
      // not hold the imported itinerary hostage if an external provider rejects a place.
      setItems(current => {
        const importedIds = new Set(parsed.map(item => item.id));
        return [...current.filter(item => !importedIds.has(item.id)), ...parsed];
      });
      setItineraryCountry(parsed[0]?.country || itineraryCountry);
      setItineraryImportStatus(`Imported ${parsed.length} activities. Saving them now; commute details will be added in the background…`);

      const saves = await Promise.allSettled(parsed.map(item => put('itinerary', item)));
      const savedCount = saves.filter(result => result.status === 'fulfilled').length;
      if (!savedCount) throw new Error('The PDF was parsed, but the itinerary could not be saved. Please try again.');
      if (savedCount !== parsed.length) setItineraryImportStatus(`Showing ${parsed.length} parsed activities. ${savedCount} were saved successfully; retry the import if any entries disappear after refresh.`);
      setItineraryImporting(false);

      // Do not await this: routing can involve multiple external geocoding calls.
      // The user can use the itinerary immediately while estimates fill in progressively.
      void enrichImportedItinerary(parsed, file.name);
    } catch (error) {
      setItineraryImportStatus(error instanceof Error ? error.message : 'Could not import this itinerary PDF.');
      setItineraryImporting(false);
    }
  }

  async function enableNotifications() {
    if (!('Notification' in window)) return alert('Notifications are not supported in this browser.');
    if (await Notification.requestPermission() === 'granted') new Notification('TripDeck reminders enabled', { body: 'Your travel reminders are enabled on this device.' });
  }

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const checkReminders = () => {
      const currentTime = Date.now();
      const upcoming = bookings.filter(b => b.type === 'flight' && b.reminderEnabled !== false && +new Date(b.date) > currentTime && +new Date(b.date) - currentTime <= 24 * 60 * 60 * 1000);
      if ('Notification' in window && Notification.permission === 'granted') {
        for (const booking of upcoming) {
          const key = `tripdeck-checkin-${booking.id}-${booking.date.slice(0,10)}`;
          if (!localStorage.getItem(key)) {
            new Notification('Online check-in due', { body: `${booking.airline || ''} ${booking.flightNumber || booking.title} departs within 24 hours. Complete online check-in now. ${booking.terminal ? `Departure terminal ${booking.terminal}.` : ''}`.trim() });
            localStorage.setItem(key, 'sent');
          }
        }
        const stays = hotels.filter(h => h.reminderEnabled !== false && +new Date(`${h.checkIn}T15:00`) > currentTime && +new Date(`${h.checkIn}T15:00`) - currentTime <= 24 * 60 * 60 * 1000);
        for (const hotel of stays) {
          const key = `tripdeck-hotel-${hotel.id}-${hotel.checkIn}`;
          if (!localStorage.getItem(key)) { new Notification(`Hotel check-in tomorrow: ${hotel.name}`, { body: `${hotel.city} · Confirmation ${hotel.confirmation || 'not added'}` }); localStorage.setItem(key, 'sent'); }
        }
      }
    };
    checkReminders();
    const reminderTimer = window.setInterval(checkReminders, 30 * 60 * 1000);
    return () => window.clearInterval(reminderTimer);
  }, [bookings, hotels]);

  const checkInDueFlights = useMemo(() => bookings.filter(b => {
    if (b.type !== 'flight' || b.reminderEnabled === false) return false;
    const remaining = +new Date(b.date) - now;
    return remaining > 0 && remaining <= 24 * 60 * 60 * 1000;
  }).sort((a,b) => +new Date(a.date) - +new Date(b.date)), [bookings, now]);

  const singaporeArrivalFlight = useMemo(() => bookings
    .filter(b => b.type === 'flight' && (b.country === 'Singapore' || String(b.arrivalAirportCode || '').toUpperCase() === 'SIN' || /singapore|changi/i.test(`${b.arrivalAirport || ''} ${b.title || ''}`)))
    .sort((a,b) => +new Date(a.arrivalTime || a.date) - +new Date(b.arrivalTime || b.date))[0], [bookings]);
  const sgacArrivalDate = (singaporeArrivalFlight?.arrivalTime || singaporeArrivalFlight?.date || '2026-08-26T12:00').slice(0, 10);
  const sgacWindowStart = useMemo(() => {
    const [year, month, day] = sgacArrivalDate.split('-').map(Number);
    return new Date(year, month - 1, day - 2, 0, 0, 0, 0).getTime();
  }, [sgacArrivalDate]);
  const sgacArrivalEnd = useMemo(() => {
    const [year, month, day] = sgacArrivalDate.split('-').map(Number);
    return new Date(year, month - 1, day, 23, 59, 59, 999).getTime();
  }, [sgacArrivalDate]);
  const sgacItem = checklist.find(item => item.id === 'sgac-arrival-card');
  const sgacSubmitted = Boolean(sgacItem?.done);
  const sgacIsOpen = now >= sgacWindowStart && now <= sgacArrivalEnd;
  const sgacWindowLabel = new Date(sgacWindowStart).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  const sgacArrivalLabel = new Date(`${sgacArrivalDate}T12:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

  useEffect(() => {
    if (typeof window === 'undefined' || sgacSubmitted || !sgacIsOpen) return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const key = `tripdeck-sgac-${sgacArrivalDate}`;
    if (localStorage.getItem(key)) return;
    new Notification('Singapore Arrival Card due', { body: `Your SGAC submission window is open for arrival on ${sgacArrivalLabel}. Submit it through the official Singapore ICA service before arrival.` });
    localStorage.setItem(key, 'sent');
  }, [sgacSubmitted, sgacIsOpen, sgacArrivalDate, sgacArrivalLabel]);

  async function markSgacSubmitted() {
    await put('checklist', { id: 'sgac-arrival-card', title: 'Singapore Arrival Card (SGAC) submitted', category: 'Entry requirement', done: true });
    await refresh();
  }

  function openOfficialSgac() {
    window.open('https://eservices.ica.gov.sg/sgarrivalcard/', '_blank', 'noopener,noreferrer');
  }

  function exportTrip() {
    const payload = { travelers: TRAVELERS, bookings, itinerary: items, checklist, expenses, hotels, attractions, exportedAt: new Date().toISOString() };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = 'tripdeck-group-backup.json'; a.click(); URL.revokeObjectURL(url);
  }

  return <main>
    <motion.div className="scroll-progress" style={{ width: `${scrollProgress}%` }}/><div className="ambient a1"/><div className="ambient a2"/>
    <header className="topbar glass"><div className="brand-lockup"><img src="/tripdeck-logo.svg" alt="TripDeck"/><div><span className="eyebrow">GROUP TRAVEL OS</span><h1>TripDeck<span>.</span></h1></div></div><div className={`status ${online ? 'online' : 'offline'}`}><WifiIcon/>{online ? 'Online' : 'Offline · local mode'}</div></header>

    <section className="hero"><motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }}>
      <span className="eyebrow">21 AUGUST — 4 SEPTEMBER 2026</span><h2>One journey.<br/><em>Zero chaos.</em></h2>
      <p>Documents, detailed country budgets, hotels, airport transfers, attractions and every booking—available offline.</p>
      <div className="date-pill"><CalendarDaysIcon/><b>15 days</b><span>Sharjah → Malaysia → Singapore → Indonesia → Abu Dhabi</span></div>
      <div className="hero-actions"><button className="primary" onClick={() => setShowAdd(true)}><PlusIcon/> Add trip item</button><button className="secondary" onClick={() => setTab('documents')}><FolderIcon/> Traveler folders</button></div>
    </motion.div>
    <motion.div className="boarding-pass" initial={{ opacity: 0, rotate: 4, x: 40 }} animate={{ opacity: 1, rotate: -2, x: 0 }} whileHover={{ rotate: 0, scale: 1.02 }}>
      <div className="pass-notch pass-notch-left"/><div className="pass-notch pass-notch-right"/>
      <div className="pass-header"><div className="pass-brand"><span>TRIPDECK AIR</span><b>BOARDING PASS</b></div><div className="pass-flight-badge"><PaperAirplaneIcon/><span>{nextBooking?.flightNumber || 'NEXT FLIGHT'}</span></div></div>
      <div className="pass-route-row"><div className="pass-airport"><b>{nextBooking?.departureAirportCode || nextBooking?.title?.split('→')[0]?.trim().slice(0,3).toUpperCase() || 'SHJ'}</b><span>{nextBooking?.departureAirport || nextBooking?.title?.split('→')[0]?.trim() || 'Sharjah'}</span></div><div className="pass-route-line"><i/><PaperAirplaneIcon/><i/></div><div className="pass-airport align-right"><b>{nextBooking?.arrivalAirportCode || nextBooking?.title?.split('→')[1]?.trim().slice(0,3).toUpperCase() || 'KUL'}</b><span>{nextBooking?.arrivalAirport || nextBooking?.title?.split('→')[1]?.trim() || 'Malaysia'}</span></div></div>
      <div className="pass-date-line"><div className="pass-airline"><AirlineLogo booking={nextBooking}/><span>{nextBooking?.airline || 'Airline pending'}</span></div><b>{nextBooking ? formatWallClock(nextBooking.date) : '21 Aug 2026, 10:00 PM'}</b></div>
      <div className="pass-countdown"><span>DEPARTURE COUNTDOWN</span>{flightCountdown ? <div className="countdown-grid"><div><b>{String(flightCountdown.days).padStart(2,'0')}</b><small>DAYS</small></div><div><b>{String(flightCountdown.hours).padStart(2,'0')}</b><small>HRS</small></div><div><b>{String(flightCountdown.minutes).padStart(2,'0')}</b><small>MIN</small></div><div><b>{String(flightCountdown.seconds).padStart(2,'0')}</b><small>SEC</small></div></div> : <strong>Add a flight to start countdown</strong>}</div>
      <div className="pass-divider"/>
      <div className="pass-meta detailed"><div><span>PASSENGERS</span><b>{nextBooking ? TRAVELER_COUNT_BY_COUNTRY[nextBooking.country] : 5}</b></div><div><span>PNR</span><b>{nextBooking?.confirmation || 'ADD PNR'}</b></div><div><span>DEP. TERMINAL</span><b>{nextBooking?.terminal || '—'}</b></div><div><span>GATE</span><b>{nextBooking?.gate || '—'}</b></div><div><span>STATUS</span><b>{nextBooking?.status || 'EXPECTED'}</b></div></div>
      <div className="pass-extra-meta"><div><span>ARRIVAL</span><b>{nextBooking?.arrivalTime ? formatWallClock(nextBooking.arrivalTime) : '—'}</b></div><div><span>ARR. TERMINAL</span><b>{nextBooking?.arrivalTerminal || '—'}</b></div><div><span>CHECK-IN</span><b>{nextBooking?.checkInDesk || '—'}</b></div><div><span>AIRCRAFT</span><b>{nextBooking?.aircraft || '—'}</b>{nextBooking?.aircraftRegistration && <small>{nextBooking.aircraftRegistration}</small>}</div></div>
      <div className="flight-history"><div className="flight-history-heading"><span>FLIGHTS TAKEN</span><b>{takenFlights.length}</b></div>{takenFlights.length ? <div className="flight-history-list">{takenFlights.map(f => <div className="taken-flight" key={f.id}><AirlineLogo booking={f} small/><div><b>{f.flightNumber || f.airline || 'Flight'}</b><span>{f.departureAirportCode || f.title?.split('→')[0]?.trim() || '---'} → {f.arrivalAirportCode || f.title?.split('→')[1]?.trim() || '---'}</span></div><small>{formatDate(f.date)}</small></div>)}</div> : <div className="flight-history-empty">Your completed flights will appear here automatically.</div>}</div>
      <div className="pass-footer"><div className="barcode">|||| ||| || |||| | ||| ||||||</div><span>{nextBooking?.providerLastChecked ? `Live status checked ${new Date(nextBooking.providerLastChecked).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}` : 'Save flight details to complete this pass'}</span></div>
    </motion.div></section>
    {checkInDueFlights.length > 0 && <section className="checkin-alert glass"><BellIcon/><div><b>Online check-in due</b><span>{checkInDueFlights[0].airline || 'Your airline'} {checkInDueFlights[0].flightNumber || checkInDueFlights[0].title} departs within 24 hours · {formatWallClock(checkInDueFlights[0].date)}{checkInDueFlights[0].terminal ? ` · Terminal ${checkInDueFlights[0].terminal}` : ''}</span></div><button onClick={enableNotifications}>Enable alerts</button></section>}
    <section className={`sgac-alert glass ${sgacSubmitted ? 'complete' : sgacIsOpen ? 'due' : ''}`}>
      <ShieldCheckIcon/>
      <div className="sgac-copy"><div className="sgac-title-row"><b>Singapore Arrival Card (SGAC)</b><span>{sgacSubmitted ? 'SUBMITTED' : sgacIsOpen ? 'SUBMIT NOW' : `OPENS ${sgacWindowLabel.toUpperCase()}`}</span></div><p>{sgacSubmitted ? `Marked complete for your ${sgacArrivalLabel} Singapore arrival.` : sgacIsOpen ? `Your valid SGAC submission window is open. Submit it before arriving in Singapore on ${sgacArrivalLabel} to avoid immigration delays.` : `For your ${sgacArrivalLabel} Singapore arrival, submit the SGAC from ${sgacWindowLabel} through arrival day. TripDeck will alert you when the window opens.`}</p><small>Official Singapore ICA service · submission is free</small></div>
      <div className="sgac-actions"><button className="secondary small" onClick={openOfficialSgac}>Open official SGAC</button>{!sgacSubmitted && <button className="primary small" onClick={markSgacSubmitted}><CheckCircleIcon/> Mark submitted</button>}</div>
    </section>

    <nav className="tabs glass">{(['overview', 'smart', 'explorer', 'food', 'nearby', 'bookings', 'itinerary', 'documents', 'expenses', 'stays', 'toolkit'] as Tab[]).map(t => <button key={t} onClick={() => setTab(t)} className={tab === t ? 'active' : ''}>{t}</button>)}</nav>

    <AnimatePresence mode="wait">
      {tab === 'overview' && <motion.section className="content" key="overview" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="quick-stats"><Stat icon={<UserGroupIcon/>} value="6" label="Travelers"/><Stat icon={<DocumentTextIcon/>} value={String(vaults.length)} label="Private vaults"/><Stat icon={<BuildingOffice2Icon/>} value={String(hotels.length)} label="Hotel stays"/><Stat icon={<SparklesIcon/>} value={String(attractions.filter(a => a.saved).length)} label="Saved attractions"/></div>
        <div className="section-heading"><div><span className="eyebrow">THE ROUTE</span><h3>Country overview</h3></div><button className="text-button" onClick={enableNotifications}><BellIcon/> Reminders</button></div>
        <div className="country-grid">{countries.map((c, i) => <motion.button type="button" className="country-card country-card-button" key={c.code} onClick={() => { setExplorerCountry(c.name); setTab('explorer'); }} initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .25 }} transition={{ delay: i * .1 }} whileHover={{ y: -8, rotateX: 2 }}><span className="number">0{i + 1}</span><div className={`flag f${c.code}`}>{c.code}</div><h4>{c.name}</h4><p>{c.dates}</p><small>{c.city} · {c.vibe}</small><small>{TRAVELER_COUNT_BY_COUNTRY[c.name]} friends travelling</small><b className="explore-label">Explore attractions →</b></motion.button>)}</div>
        <div className="two-col"><section className="panel glass"><div className="panel-title"><h3>Bookings</h3><button onClick={() => setShowAdd(true)}><PlusIcon/></button></div>{bookings.map(b => <div className="booking" key={b.id}><div className="booking-icon">{b.type === 'flight' ? <PaperAirplaneIcon/> : <MapPinIcon/>}</div><div><b>{b.title}</b><span>{b.flightNumber ? `${b.flightNumber} · ` : ''}{b.subtitle}</span></div><div className="booking-right"><b>{formatDate(b.date)}</b><span>{b.confirmation}</span></div></div>)}<button className="gmail" onClick={() => setTab('bookings')}><PaperAirplaneIcon/> Manage flights manually <span>Lookup live schedule by flight number and date</span></button></section>
        <section className="panel glass"><div className="panel-title"><h3>Group readiness</h3><ShieldCheckIcon/></div><div className="progress"><span style={{ width: `${checklist.length ? prepDone / checklist.length * 100 : 0}%` }}/></div><p className="muted">{prepDone} of {checklist.length} essentials ready</p><div className="mini-checks">{checklist.map(item => <label key={item.id}><input type="checkbox" checked={item.done} onChange={async () => { await put('checklist', { ...item, done: !item.done }); await refresh(); }}/><span>{item.title}</span></label>)}</div></section></div>
      </motion.section>}

      {tab === 'smart' && <motion.section className="content" key="smart" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}><TripIntelligence attractions={attractions} bookings={bookings} hotels={hotels} itinerary={items} expenses={expenses} checklist={checklist} onRefresh={refresh} onOpenExplorer={(country) => { setExplorerCountry(country); setTab('explorer'); }} onOpenItinerary={() => setTab('itinerary')}/></motion.section>}
      {tab === 'explorer' && <motion.section className="content" key="explorer" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}><CountryExplorer attractions={attractions} hotels={hotels} bookings={bookings} initialCountry={explorerCountry} onRefresh={refresh} onOpenItinerary={() => setTab('itinerary')}/></motion.section>}
      {tab === 'food' && <motion.section className="content" key="food" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}><FoodGuide hotels={hotels} bookings={bookings}/></motion.section>}
      {tab === 'nearby' && <motion.section className="content" key="nearby" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}><NearbyHalal/></motion.section>}

      {tab === 'itinerary' && <motion.section className="content itinerary-shell" key="itinerary" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><div className="section-heading"><div><span className="eyebrow">COUNTRY · DAY · TIME</span><h3>Detailed itinerary</h3></div><div className="itinerary-actions"><label className={`secondary small ${itineraryImporting ? 'disabled' : ''}`}><ArrowUpTrayIcon/>{itineraryImporting ? 'Importing…' : 'Import itinerary PDF'}<input type="file" accept="application/pdf,.pdf" hidden disabled={itineraryImporting} onChange={e => { const file=e.target.files?.[0]; importItineraryPdf(file); e.currentTarget.value=''; }}/></label><button className="primary small" onClick={() => setShowAdd(true)}><PlusIcon/> Add manually</button></div></div>
        <div className="itinerary-country-tabs">{countries.map(country => { const count=items.filter(x=>x.country===country.name).length; return <button key={country.name} className={itineraryCountry===country.name?'active':''} onClick={()=>setItineraryCountry(country.name)}><span className={`flag-mini f${country.code}`}>{country.code}</span><div><b>{country.name}</b><small>{country.dates} · {count} plans</small></div></button>; })}</div>
        <div className="itinerary-import-note"><DocumentTextIcon/><div><b>PDF itinerary importer</b><span>Upload a text-based PDF. TripDeck stores the original in Documents, extracts dates/times/places, groups everything by country and day, then estimates route time and public-transport cost between stops when online.</span>{itineraryImportStatus && <em>{itineraryImportStatus}</em>}</div></div>
        {items.filter(x=>x.country===itineraryCountry).length === 0 ? <Empty icon={<CalendarDaysIcon/>} title={`No ${itineraryCountry} plans yet`} text="Import an itinerary PDF or add activities, meals, transfers and reservations manually."/> : <div className="itinerary-days">{Object.entries(items.filter(x=>x.country===itineraryCountry).sort((a,b)=>`${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)).reduce<Record<string,ItineraryItem[]>>((acc,item)=>{(acc[item.date] ||= []).push(item);return acc;},{})).map(([date,dayItems],dayIndex)=><section className="itinerary-day glass" key={date}><header><div><span>DAY {dayIndex+1}</span><h4>{new Date(`${date}T12:00`).toLocaleDateString(undefined,{weekday:'long',day:'numeric',month:'long'})}</h4></div><b>{dayItems.length} stops</b></header><div className="timeline">{dayItems.map((item,index)=><div className="timeline-row itinerary-row" key={item.id}><div className="time"><b>{item.time}</b><span>{index===0?'Start':`Stop ${index+1}`}</span></div><div className="dot"/><div className="timeline-card rich-itinerary-card"><div className="itinerary-card-top"><span>{item.source==='pdf'?'PDF IMPORT':'MANUAL'}</span><button title="Delete" onClick={async()=>{await remove('itinerary',item.id);await refresh();}}><TrashIcon/></button></div><h4>{item.title}</h4><p><MapPinIcon/>{item.location}</p>{item.commuteMinutes && <div className="commute-strip"><div><small>FROM</small><b>{item.commuteFrom || 'Previous stop'}</b></div><div><small>COMMUTE</small><b>{item.commuteMinutes} min</b><span>{item.commuteMode}</span></div><div><small>DISTANCE</small><b>{item.distanceKm ? `${item.distanceKm} km` : '—'}</b></div><div><small>EST. COST</small><b>{item.commuteCost != null ? `${item.commuteCurrency} ${Number(item.commuteCost).toLocaleString()}` : '—'}</b><span>{item.commuteCost != null ? `~${item.commuteCurrency} ${(Number(item.commuteCost)*TRAVELER_COUNT_BY_COUNTRY[item.country]).toLocaleString()} for ${TRAVELER_COUNT_BY_COUNTRY[item.country]}` : ''}</span></div></div>}{item.activityCost != null && <div className="activity-cost"><small>ACTIVITY / BOOKING COST FOUND IN PDF</small><b>{item.activityCurrency} {Number(item.activityCost).toLocaleString()}</b></div>}{item.commuteNote && <small className="route-note">{item.commuteNote}</small>}{item.notes && <small className="itinerary-notes">{item.notes}</small>}</div></div>)}</div></section>)}</div>}</motion.section>}

      {tab === 'documents' && <motion.section className="content" key="documents" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><div className="section-heading"><div><span className="eyebrow">6 PRIVATE FOLDERS</span><h3>Traveler documents</h3></div></div>
        <div className="traveler-tabs">{TRAVELERS.map(name => <button key={name} className={traveler === name ? 'active' : ''} onClick={() => setTraveler(name)}><FolderIcon/><span>{name}</span><b>{unlockedTravelers.includes(name) ? documents.filter(d => d.traveler === name).length : '🔒'}</b></button>)}</div>
        {!travelerUnlocked ? <div className="vault-lock glass"><ShieldCheckIcon/><div><b>{selectedVault ? `${traveler}'s private vault is locked` : `Protect ${traveler}'s documents`}</b><span>{selectedVault ? 'Enter this traveler’s password to view or open their documents.' : 'Create a password. Existing files will be encrypted automatically and future uploads will be encrypted before cloud sync.'}</span></div><button className="primary small" onClick={() => ensureTravelerVault(traveler)}>{selectedVault ? 'Unlock documents' : 'Create private vault'}</button></div> : <><div className="vault-banner"><ShieldCheckIcon/><div><b>{traveler}&apos;s encrypted folder</b><span>Unlocked for this browser session. File contents are AES-256-GCM encrypted before local/cloud storage.</span></div></div><div className="upload-toolbar"><select value={docCategory} onChange={e => setDocCategory(e.target.value as TripDocument['category'])}><option>Passport</option><option>Visa</option><option>Ticket</option><option>Insurance</option><option>Hotel</option><option>Itinerary</option><option>Other</option></select><label className="primary small"><ArrowUpTrayIcon/> Upload for {traveler}<input type="file" multiple hidden onChange={e => uploadFiles(e.target.files)}/></label><button className="secondary small" onClick={() => lockTraveler(traveler)}>Lock folder</button></div>
        {documentSyncing === traveler && <div className="document-cloud-status"><span className="document-cloud-spinner"/><div><b>Checking private documents</b><span>Refreshing {traveler}&apos;s secure document list…</span></div></div>}
        {documentSyncError && <div className="document-cloud-error">{documentSyncError}<button onClick={() => loadTravelerDocuments(traveler, true)}>Retry cloud fetch</button></div>}
        {selectedDocs.length > 0 && <div className="document-selection-toolbar"><button className={`secondary small ${documentSelectionMode ? 'active' : ''}`} onClick={() => { setDocumentSelectionMode(value => !value); setSelectedDocumentIds([]); }}>{documentSelectionMode ? 'Cancel selection' : 'Select files'}</button>{documentSelectionMode && <><button className="secondary small" onClick={() => setSelectedDocumentIds(selectedDocumentIds.length === selectedDocs.length ? [] : selectedDocs.map(doc => doc.id))}>{selectedDocumentIds.length === selectedDocs.length ? 'Clear all' : 'Select all'}</button><span>{selectedDocumentIds.length} selected</span><button className="danger-action small" disabled={!selectedDocumentIds.length} onClick={() => setBulkDeleteDialog(true)}><TrashIcon/> Delete selected</button></>}</div>}
        {selectedDocs.length === 0 && documentSyncing === traveler ? null : selectedDocs.length === 0 ? <Empty icon={<DocumentTextIcon/>} title={`No files for ${traveler}`} text="No encrypted files were found in this traveler’s Redis vault. Upload a document here and TripDeck will confirm it reaches cloud storage before showing it as synced."/> : <div className="doc-grid">{selectedDocs.map(doc => { const selected = selectedDocumentIds.includes(doc.id); return <article className={`doc-card ${selected ? 'selected' : ''}`} key={doc.id}>{documentSelectionMode && <label className="doc-select-check"><input type="checkbox" checked={selected} onChange={() => toggleDocumentSelection(doc.id)}/><span/></label>}<DocumentTextIcon/><div><b>{doc.name}</b><span>{doc.category} · {(doc.size / 1024).toFixed(1)} KB · {doc.encrypted ? 'Encrypted' : 'Legacy file'}</span></div><div className="doc-actions">{!documentSelectionMode && <><button className="doc-open-button" disabled={openingDocumentId===doc.id} onClick={() => openPrivateDocument(doc)}>{openingDocumentId===doc.id ? 'Opening…' : 'Open file'}</button><button className="doc-delete-button" aria-label={`Delete ${doc.name}`} onClick={() => setDeleteDocumentDialog(doc)}><TrashIcon/></button></>}</div></article>})}</div>}</>}
      </motion.section>}

      {tab === 'expenses' && <motion.section className="content" key="expenses" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><ExpenseCenter country={expenseCountry} setCountry={setExpenseCountry} expenses={expenses} onRefresh={refresh}/></motion.section>}

      {tab === 'stays' && <motion.section className="content" key="stays" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><div className="section-heading"><div><span className="eyebrow">HOTELS & THINGS TO DO</span><h3>Stay planner</h3></div></div>
        <div className="hotel-grid">{hotels.map(hotel => <HotelCard key={hotel.id} hotel={hotel} onSaved={refresh}/>)}</div>
        <div className="section-heading attractions-heading"><div><span className="eyebrow">CITY SHORTLIST</span><h3>Attractions</h3></div></div>
        <AttractionForm onSaved={refresh}/><div className="attraction-grid">{attractions.map(a => <article className="attraction-card" key={a.id}><div className="attraction-icon"><MapIcon/></div><div><span>{a.country} · {a.city}</span><h4>{a.name}</h4><p>{a.category}{a.distanceFromHotelKm ? ` · ${a.distanceFromHotelKm} km from hotel` : ''}</p>{a.plannedDate && <small>Planned {formatDate(a.plannedDate)}</small>}</div><button onClick={async () => { await put('attractions', { ...a, saved: !a.saved }); await refresh(); }} className={a.saved ? 'saved' : ''}>{a.saved ? 'Saved' : 'Save'}</button></article>)}</div>
      </motion.section>}


      {tab === 'bookings' && <motion.section className="content" key="bookings" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
        <div className="section-heading"><div><span className="eyebrow">MANUAL + LIVE SCHEDULE LOOKUP</span><h3>Flights and booking details</h3></div><button className="text-button" onClick={enableNotifications}><BellIcon/> Enable alerts</button></div>
        <div className="notice">Airline booking references are private reservation records. TripDeck stores your PNR manually and uses a flight-data provider to fetch schedules by flight number and travel date.</div>
        <FlightForm online={online} onSaved={refresh}/>
        <div className="flight-list">{bookings.filter(b => b.type === 'flight').sort((a,b) => +new Date(a.date)-+new Date(b.date)).map((booking,index) => <motion.article className="flight-card glass" key={booking.id} initial={{opacity:0,y:22}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{delay:index*.05}}><div className="flight-route"><div><span>{booking.departureAirport || 'Origin'}</span><b>{booking.departureAirportCode || '---'}</b></div><PaperAirplaneIcon/><div><span>{booking.arrivalAirport || 'Destination'}</span><b>{booking.arrivalAirportCode || '---'}</b></div></div><div className="flight-details"><div><span>Flight</span><b>{booking.flightNumber || 'Add number'}</b></div><div><span>Departure</span><b>{formatWallClock(booking.date)}</b></div><div><span>Dep. terminal</span><b>{booking.terminal || '—'}</b></div><div><span>Arr. terminal</span><b>{booking.arrivalTerminal || '—'}</b></div><div><span>Aircraft</span><b>{booking.aircraft || '—'}</b>{booking.aircraftRegistration && <small>{booking.aircraftRegistration}</small>}</div><div><span>PNR</span><b>{booking.confirmation || 'Not added'}</b></div><div><span>Status</span><b>{booking.status || 'Saved offline'}</b></div></div><div className="flight-actions"><span>{booking.providerLastChecked ? `Updated ${new Date(booking.providerLastChecked).toLocaleString()}` : 'Manual details'}</span><button onClick={async()=>{await remove('bookings',booking.id);await refresh();}}><TrashIcon/> Remove</button></div></motion.article>)}</div>
      </motion.section>}

      {tab === 'toolkit' && <motion.section className="content" key="toolkit" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><div className="section-heading"><div><span className="eyebrow">TRAVEL SMARTER</span><h3>Group toolkit</h3></div><button className="secondary small" onClick={exportTrip}><ArrowDownTrayIcon/> Backup data</button></div><div className="tool-grid"><section className="panel glass"><div className="panel-title"><h3>Checklist</h3><ClipboardDocumentCheckIcon/></div><div className="checklist">{checklist.map(item => <label key={item.id} className={item.done ? 'done' : ''}><input type="checkbox" checked={item.done} onChange={async () => { await put('checklist', { ...item, done: !item.done }); await refresh(); }}/><div><b>{item.title}</b><span>{item.category}</span></div></label>)}</div></section><section className="panel glass emergency"><div className="panel-title"><h3>Emergency card</h3><PhoneIcon/></div><div className="emergency-list"><div><b>Malaysia</b><span>Emergency: 999</span></div><div><b>Singapore</b><span>Police: 999 · Fire/Ambulance: 995</span></div><div><b>Indonesia</b><span>Emergency: 112</span></div></div></section></div></motion.section>}
    </AnimatePresence>

    <AnimatePresence>{documentPreview && <motion.div className="document-preview-backdrop" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onMouseDown={closeDocumentPreview}><motion.div className="document-preview-modal" initial={{opacity:0,y:18,scale:.99}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:10,scale:.99}} onMouseDown={e=>e.stopPropagation()}>
      <header className="document-preview-header"><div><span className="eyebrow">SECURE DOCUMENT PREVIEW</span><b>{documentPreview.doc.name}</b><small>{documentPreview.doc.category} · {(documentPreview.doc.size/1024).toFixed(1)} KB</small></div><button className="secondary small" type="button" onClick={closeDocumentPreview}>Close</button></header>
      <div className="document-preview-stage">{documentPreview.blob.type.startsWith('image/') ? <img src={documentPreview.url} alt={documentPreview.doc.name}/> : documentPreview.blob.type === 'application/pdf' || documentPreview.doc.name.toLowerCase().endsWith('.pdf') ? <iframe src={documentPreview.url} title={documentPreview.doc.name}/> : <div className="document-preview-unsupported"><DocumentTextIcon/><h4>Preview is not available for this file type</h4><p>The document decrypted successfully. Use Open in new tab or Download to view it with your device.</p></div>}</div>
      <footer className="document-preview-actions"><a className="secondary" href={documentPreview.url} target="_blank" rel="noopener noreferrer">Open in new tab</a><a className="primary" href={documentPreview.url} download={documentPreview.doc.name}><ArrowDownTrayIcon/> Download</a></footer>
    </motion.div></motion.div>}</AnimatePresence>

    <AnimatePresence>{vaultDialog && <motion.div className="vault-modal-backdrop" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onMouseDown={closeVaultDialog}><motion.div className="vault-modal" initial={{opacity:0,y:18,scale:.98}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:10,scale:.98}} onMouseDown={e=>e.stopPropagation()}>
      <div className="vault-modal-icon"><ShieldCheckIcon/></div><div className="vault-modal-copy"><span className="eyebrow">PRIVATE DOCUMENT VAULT</span><h3>{vaultDialog.mode === 'create' ? `Protect ${vaultDialog.target}'s folder` : `Unlock ${vaultDialog.target}'s folder`}</h3><p>{vaultDialog.mode === 'create' ? 'Create a private password. Files are encrypted on this device before they are stored or synced.' : 'Enter this traveler’s password to view, open or upload private documents.'}</p></div>
      <label className="vault-field"><span>Password</span><input autoFocus type="password" value={vaultDialog.password} onChange={e=>setVaultDialog(v=>v?{...v,password:e.target.value,error:''}:v)} onKeyDown={e=>{if(e.key==='Enter'&&vaultDialog.mode==='unlock') submitVaultDialog();}} placeholder="At least 8 characters"/></label>
      {vaultDialog.mode === 'create' && <label className="vault-field"><span>Confirm password</span><input type="password" value={vaultDialog.confirm} onChange={e=>setVaultDialog(v=>v?{...v,confirm:e.target.value,error:''}:v)} onKeyDown={e=>{if(e.key==='Enter') submitVaultDialog();}} placeholder="Repeat the password"/></label>}
      {vaultDialog.error && <div className="vault-error">{vaultDialog.error}</div>}
      <div className="vault-modal-actions"><button className="secondary" type="button" onClick={closeVaultDialog} disabled={vaultDialog.busy}>Cancel</button><button className="primary" type="button" onClick={submitVaultDialog} disabled={vaultDialog.busy}><ShieldCheckIcon/>{vaultDialog.busy ? 'Securing…' : vaultDialog.mode === 'create' ? 'Create private vault' : 'Unlock folder'}</button></div>
      <small className="vault-privacy-note">TripDeck never stores the password itself. Keep it somewhere safe.</small>
    </motion.div></motion.div>}</AnimatePresence>
    <AnimatePresence>{deleteDocumentDialog && <motion.div className="vault-modal-backdrop" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onMouseDown={()=>!deletingDocument&&setDeleteDocumentDialog(null)}><motion.div className="delete-doc-modal" initial={{opacity:0,y:18,scale:.98}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:10,scale:.98}} onMouseDown={e=>e.stopPropagation()}>
      <div className="delete-doc-icon"><TrashIcon/></div><div className="vault-modal-copy"><span className="eyebrow">REMOVE PRIVATE DOCUMENT</span><h3>Delete this file?</h3><p><b>{deleteDocumentDialog.name}</b> will be permanently removed from {deleteDocumentDialog.traveler}&apos;s encrypted Redis vault and this device.</p></div>
      <div className="delete-doc-file"><DocumentTextIcon/><div><b>{deleteDocumentDialog.name}</b><span>{deleteDocumentDialog.category} · {(deleteDocumentDialog.size/1024).toFixed(1)} KB</span></div></div>
      <div className="vault-modal-actions"><button className="secondary" type="button" disabled={deletingDocument} onClick={()=>setDeleteDocumentDialog(null)}>Keep file</button><button className="danger-action" type="button" disabled={deletingDocument} onClick={confirmDeleteDocument}><TrashIcon/>{deletingDocument?'Deleting…':'Delete permanently'}</button></div>
    </motion.div></motion.div>}</AnimatePresence>
    <AnimatePresence>{bulkDeleteDialog && <motion.div className="vault-modal-backdrop" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onMouseDown={()=>!bulkDeleting&&setBulkDeleteDialog(false)}><motion.div className="delete-doc-modal" initial={{opacity:0,y:18,scale:.98}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:10,scale:.98}} onMouseDown={e=>e.stopPropagation()}>
      <div className="delete-doc-icon"><TrashIcon/></div><div className="vault-modal-copy"><span className="eyebrow">REMOVE PRIVATE DOCUMENTS</span><h3>Delete {selectedDocumentIds.length} selected file{selectedDocumentIds.length === 1 ? '' : 's'}?</h3><p>The selected files will be permanently removed from {traveler}&apos;s encrypted Redis vault and this device.</p></div>
      <div className="bulk-delete-summary">{selectedDocs.filter(doc => selectedDocumentIds.includes(doc.id)).slice(0,4).map(doc => <div key={doc.id}><DocumentTextIcon/><span>{doc.name}</span></div>)}{selectedDocumentIds.length > 4 && <small>+{selectedDocumentIds.length - 4} more file{selectedDocumentIds.length - 4 === 1 ? '' : 's'}</small>}</div>
      <div className="vault-modal-actions"><button className="secondary" type="button" disabled={bulkDeleting} onClick={()=>setBulkDeleteDialog(false)}>Keep files</button><button className="danger-action" type="button" disabled={bulkDeleting} onClick={confirmBulkDeleteDocuments}><TrashIcon/>{bulkDeleting?'Deleting…':'Delete selected'}</button></div>
    </motion.div></motion.div>}</AnimatePresence>
    <footer><CheckCircleIcon/> Offline-first group travel planner. Local files remain on this device.</footer>
    <AnimatePresence>{showAdd && <AddModal onClose={() => setShowAdd(false)} onSaved={async () => { await refresh(); setShowAdd(false); }}/>}</AnimatePresence>
  </main>;
}

function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) { return <motion.div initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .2 }} transition={{ duration: .55, delay }}>{children}</motion.div>; }

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) { return <div className="stat glass">{icon}<div><b>{value}</b><span>{label}</span></div></div>; }
function Empty({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) { return <div className="empty">{icon}<h4>{title}</h4><p>{text}</p></div>; }

function ExpenseCenter({country,setCountry,expenses,onRefresh}:{country:CountryName;setCountry:(c:CountryName)=>void;expenses:Expense[];onRefresh:()=>Promise<void>}) {
 const rows=expenses.filter(e=>e.country===country); const currency=country==='Malaysia'?'MYR':country==='Singapore'?'SGD':'IDR';
 const [budget,setBudget]=useState(0); const [search,setSearch]=useState(''); const [category,setCategory]=useState('All');
 useEffect(()=>{setBudget(Number(localStorage.getItem(`tripdeck-budget-${country}`)||0))},[country]);
 const travelerCount=TRAVELER_COUNT_BY_COUNTRY[country];
 const localValue=(e:Expense)=>e.localAmount ?? (e.currency===currency?e.amount:0);
 const total=rows.reduce((a,e)=>a+localValue(e),0), aedTotal=rows.reduce((a,e)=>a+(e.aedAmount||0),0), remaining=budget-total, perPerson=travelerCount ? total/travelerCount : 0;
 const categories=Object.entries(rows.reduce<Record<string,number>>((a,e)=>(a[e.category]=(a[e.category]||0)+localValue(e),a),{})).sort((a,b)=>b[1]-a[1]);
 const payers=TRAVELERS.map(name=>({name,total:rows.filter(e=>e.paidBy===name).reduce((a,e)=>a+localValue(e),0)}));
 const shares=TRAVELERS.map(name=>({name,total:rows.reduce((sum,e)=>sum+(e.splitShares?.[name]||0),0),aed:rows.reduce((sum,e)=>{const localShare=e.splitShares?.[name]||0;return sum+(e.localAmount&&e.aedAmount?localShare*(e.aedAmount/e.localAmount):0)},0)}));
 const filtered=rows.filter(e=>(category==='All'||e.category===category)&&`${e.title} ${e.merchant||''} ${e.notes||''}`.toLowerCase().includes(search.toLowerCase())).sort((a,b)=>b.date.localeCompare(a.date));
 return <div className="expense-center"><div className="section-heading"><div><span className="eyebrow">COUNTRYWISE BUDGET CONTROL</span><h3>Expenses & group settlement</h3><p className="muted">Track spending, AED conversions, payment methods and each traveler&apos;s share.</p></div><label className="budget-control"><span>{country} trip budget</span><div><b>{currency}</b><input type="number" min="0" value={budget||''} placeholder="Set budget" onChange={e=>{const v=Number(e.target.value);setBudget(v);localStorage.setItem(`tripdeck-budget-${country}`,String(v))}}/></div></label></div>
 <div className="country-switch">{countries.map(c=><button key={c.code} className={country===c.name?'active':''} onClick={()=>setCountry(c.name)}>{c.code}<span>{c.name}</span></button>)}</div>
 <div className="expense-kpis"><div className="glass"><span>Total spent</span><b>{currency} {total.toLocaleString(undefined,{maximumFractionDigits:2})}</b><small>{aedTotal?`AED ${aedTotal.toLocaleString(undefined,{maximumFractionDigits:2})}`:`${rows.length} transactions`}</small></div><div className="glass"><span>Budget remaining</span><b className={remaining<0?'over':''}>{budget?`${currency} ${remaining.toLocaleString(undefined,{maximumFractionDigits:2})}`:'Set a budget'}</b><small>{budget?`${Math.min(100,Math.round(total/budget*100))}% used`:'Add a target above'}</small></div><div className="glass"><span>Average per traveler</span><b>{currency} {perPerson.toLocaleString(undefined,{maximumFractionDigits:2})}</b><small>{travelerCount} travelers in {country}</small></div><div className="glass"><span>Largest category</span><b>{categories[0]?.[0]||'No data'}</b><small>{categories[0]?`${currency} ${categories[0][1].toLocaleString()}`:'Start logging expenses'}</small></div></div>
 {budget>0&&<div className="budget-progress"><span style={{width:`${Math.min(100,total/budget*100)}%`}}/></div>}
 <div className="expense-layout upgraded"><section className="panel glass"><div className="panel-title"><h3>Log an expense</h3><CurrencyDollarIcon/></div><ExpenseForm country={country} onSaved={onRefresh}/></section><section className="panel glass"><div className="panel-title"><h3>Group accounts</h3><BanknotesIcon/></div><h4 className="settlement-title">Each traveler&apos;s allocated share</h4><div className="payer-grid">{shares.map(p=><div key={p.name}><span>{p.name}</span><b>{currency} {p.total.toLocaleString(undefined,{maximumFractionDigits:2})}</b>{p.aed>0&&<small>AED {p.aed.toLocaleString(undefined,{maximumFractionDigits:2})}</small>}</div>)}</div><h4 className="settlement-title">Paid by</h4><div className="payer-grid">{payers.map(p=><div key={p.name}><span>{p.name}</span><b>{currency} {p.total.toLocaleString(undefined,{maximumFractionDigits:2})}</b></div>)}</div></section></div>
 <div className="expense-toolbar"><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search expense, merchant or note…"/><select value={category} onChange={e=>setCategory(e.target.value)}><option>All</option><option>Food</option><option>Transport</option><option>Hotel</option><option>Attraction</option><option>Shopping</option><option>Flights</option><option>Other</option></select></div>
 <LiveMoneyAndShops country={country} expenses={rows}/>
 <div className="expense-table modern">{filtered.length?filtered.map(e=><div className="expense-row" key={e.id}><div className="expense-category-icon">{e.category.slice(0,1)}</div><div><b>{e.title}</b><span>{e.category} · {e.merchant||'No merchant'} · paid by {e.paidBy}</span><small>{formatDate(e.date)}{e.paymentMethod?` · ${e.paymentMethod}`:''}{e.splitCount?` · split ${e.splitCount} ways`:''}</small>{e.splitWith?.length&&<small>Shared with: {e.splitWith.join(', ')}</small>}{e.notes&&<small>{e.notes}</small>}</div><strong>{e.currency} {e.amount.toFixed(2)}{e.aedAmount!=null&&<small>AED {e.aedAmount.toFixed(2)}</small>}</strong><button onClick={async()=>{await remove('expenses',e.id);await onRefresh()}}><TrashIcon/></button></div>):<Empty icon={<BanknotesIcon/>} title="No matching expenses" text="Log your first expense or clear the filters."/>}</div></div>
}

function ExpenseForm({ country, onSaved }: { country: CountryName; onSaved: () => Promise<void> }) {
 const travelerCount = TRAVELER_COUNT_BY_COUNTRY[country];
 const [saving,setSaving]=useState(false); const [message,setMessage]=useState('');
 async function submit(formData: FormData) {
  setSaving(true);setMessage('Getting a live AED rate…');
  try {
   const amount=Number(formData.get('amount')); const currency=String(formData.get('currency')); const splitCount=Number(formData.get('splitCount')||1); const paidBy=String(formData.get('paidBy')) as TravelerName;
   const fx=await fetchLiveFx('AED'); const localCurrency=country==='Malaysia'?'MYR':country==='Singapore'?'SGD':'IDR';
   const localAmount=convertWithRates(amount,currency,localCurrency,fx); const aedAmount=convertWithRates(amount,currency,'AED',fx);
   const available=COUNTRY_TRAVELERS[country]; const splitWith=splitCount===1?[paidBy]:available.slice(0,Math.min(splitCount,available.length));
   if(!splitWith.includes(paidBy)&&splitWith.length) splitWith[splitWith.length-1]=paidBy;
   const share=localAmount/splitWith.length; const splitShares=Object.fromEntries(splitWith.map(name=>[name,share])) as Partial<Record<TravelerName,number>>;
   await put('expenses', { id: crypto.randomUUID(), title: String(formData.get('title')), amount, currency, localAmount, aedAmount, fxRateToAED:aedAmount/amount, fxProvider:fx.provider, fxUpdatedAt:fx.updatedAt, country, category: String(formData.get('category')) as Expense['category'], paidBy, date: String(formData.get('date')), notes: String(formData.get('notes') || ''), merchant:String(formData.get('merchant')||''), paymentMethod:String(formData.get('paymentMethod')||'Card') as Expense['paymentMethod'], splitCount:splitWith.length, splitWith, splitShares });
   setMessage(`Saved with live conversion: AED ${aedAmount.toFixed(2)}. Split added to ${splitWith.length} traveler account${splitWith.length===1?'':'s'}.`); await onSaved();
  } catch(error) { setMessage(error instanceof Error?error.message:'Could not save with a live currency rate.'); }
  finally{setSaving(false)}
 }
 return <form className="expense-form detailed" action={submit}><div className="field-pair"><input name="title" required placeholder="What was purchased?"/><input name="merchant" placeholder="Merchant / provider"/></div><div className="field-pair"><input name="amount" required min="0.01" step="0.01" type="number" placeholder="Amount"/><select name="currency"><option>{country==='Malaysia'?'MYR':country==='Singapore'?'SGD':'IDR'}</option><option>AED</option><option>USD</option></select></div><div className="field-pair"><select name="category"><option>Food</option><option>Transport</option><option>Hotel</option><option>Attraction</option><option>Shopping</option><option>Flights</option><option>Other</option></select><select name="paidBy">{COUNTRY_TRAVELERS[country].map(t=><option key={t}>{t}</option>)}</select></div><div className="field-pair"><select name="paymentMethod"><option>Card</option><option>Cash</option><option>Bank transfer</option><option>E-wallet</option></select><select name="splitCount" key={country} defaultValue={String(travelerCount)}><option value="1">Personal expense</option>{Array.from({length: 5}, (_, i) => i + 2).map(n=><option key={n} value={n}>Split {n} ways</option>)}</select></div><DateTimePicker name="date" min="2026-08-21" required/><textarea name="notes" placeholder="Receipt reference, split details or notes"/>{message&&<div className="notice">{message}</div>}<button className="primary small" type="submit" disabled={saving}><PlusIcon/> {saving?'Converting & saving…':'Save expense'}</button></form>;
}

function HotelCard({ hotel, onSaved }: { hotel: HotelStay; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [routeMessage,setRouteMessage] = useState('');
  async function submit(formData: FormData) {
    const name=String(formData.get('name')); const city=String(formData.get('city')); const address=String(formData.get('address')); const airport=String(formData.get('airport'));
    let distanceKm=hotel.distanceKm; let transferMinutes=hotel.transferMinutes; setRouteMessage('Calculating airport transfer…');
    try { const response=await fetch('/api/travel',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({origin:airport,destination:address,originCandidates:[airport,`${airport}, ${city}, ${hotel.country}`],destinationCandidates:[address,`${address}, ${city}, ${hotel.country}`,`${name}, ${address}, ${city}, ${hotel.country}`],country:hotel.country})}); const route=await response.json(); if(response.ok){distanceKm=route.distanceKm;transferMinutes=route.drivingMinutes;} else setRouteMessage(route.error||'Could not calculate airport transfer.'); } catch { setRouteMessage('Could not calculate airport transfer.'); }
    await put('hotels', { ...hotel, name, city, address, airport, distanceKm, transferMinutes, confirmation: String(formData.get('confirmation') || ''), phone: String(formData.get('phone') || ''), notes: String(formData.get('notes') || ''), bookingProvider: String(formData.get('bookingProvider') || ''), reminderEnabled: true }); setEditing(false); onSaved();
  }
  if (editing) return <form className="hotel-card glass hotel-form" action={submit}><div className="panel-title"><h3>{hotel.country}</h3><button type="button" onClick={() => setEditing(false)}>×</button></div><input name="name" defaultValue={hotel.name} placeholder="Hotel name" required/><input name="city" defaultValue={hotel.city} placeholder="City" required/><input name="address" defaultValue={hotel.address} placeholder="Complete hotel street address" required/><input name="airport" defaultValue={hotel.airport} placeholder="Arrival airport name or IATA code" required/><div className="notice">Airport distance and driving time will be calculated automatically when you save.</div>{routeMessage&&<div className="notice">{routeMessage}</div>}<input name="confirmation" defaultValue={hotel.confirmation} placeholder="Booking confirmation"/><input name="bookingProvider" defaultValue={hotel.bookingProvider} placeholder="Booked with (hotel, Booking.com, Agoda...)"/><input name="phone" defaultValue={hotel.phone} placeholder="Hotel phone"/><textarea name="notes" defaultValue={hotel.notes} placeholder="Breakfast, rooms, pickup notes..."/><button className="primary small">Save stay & calculate route</button></form>;
  return <article className="hotel-card glass"><div className="hotel-top"><div className="booking-icon"><BuildingOffice2Icon/></div><div><span>{hotel.country} · {hotel.city}</span><h3>{hotel.name}</h3></div><button onClick={() => setEditing(true)}>Edit</button></div><p>{hotel.address}</p><div className="hotel-metrics"><div><span>Airport</span><b>{hotel.airport}</b></div><div><span>Distance</span><b>{hotel.distanceKm ? `${hotel.distanceKm} km` : 'Not calculated'}</b></div><div><span>Transfer</span><b>{hotel.transferMinutes ? `${hotel.transferMinutes} min` : 'Not calculated'}</b></div></div><small>{formatDate(hotel.checkIn)} → {formatDate(hotel.checkOut)} {hotel.confirmation ? `· ${hotel.confirmation}` : ''}{hotel.bookingProvider ? ` · ${hotel.bookingProvider}` : ''}</small></article>;
}

function AttractionForm({ onSaved }: { onSaved: () => void }) {
  async function submit(formData: FormData) { await put('attractions', { id: crypto.randomUUID(), country: String(formData.get('country')) as CountryName, city: String(formData.get('city')), name: String(formData.get('name')), category: String(formData.get('category')), plannedDate: String(formData.get('plannedDate') || ''), saved: true, notes: String(formData.get('notes') || '') }); onSaved(); }
  return <form className="attraction-form glass" action={submit}><input name="name" required placeholder="Add attraction or restaurant"/><select name="country"><option>Malaysia</option><option>Singapore</option><option>Indonesia</option></select><input name="city" required placeholder="City"/><input name="category" placeholder="Landmark, food, beach..."/><DateTimePicker name="plannedDate" min="2026-08-21"/><button className="primary small"><PlusIcon/> Add place</button></form>;
}

function FlightForm({ online, onSaved }: { online: boolean; onSaved: () => void }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [lookup, setLookup] = useState<Record<string, unknown> | null>(null);
  async function fetchFlight(form: HTMLFormElement) {
    const data = new FormData(form); const flightNumber = String(data.get('flightNumber') || '').trim(); const date = String(data.get('travelDate') || '');
    if (!flightNumber || !date) return setMessage('Enter a flight number and travel date first.');
    setLoading(true); setMessage('Checking saved flight details…');
    const cached = (await getAll('bookings')).find(b => b.type === 'flight' && String(b.flightNumber || '').replace(/\s+/g,'').toUpperCase() === flightNumber.replace(/\s+/g,'').toUpperCase() && (b.travelDate || b.date.slice(0,10)) === date);
    if (cached) {
      setLookup({ airline:{name:cached.airline}, departure:{airport:{name:cached.departureAirport,iata:cached.departureAirportCode},scheduledTime:{local:cached.date},revisedTime:{local:cached.revisedDepartureTime},terminal:cached.terminal,gate:cached.gate,checkInDesk:cached.checkInDesk}, arrival:{airport:{name:cached.arrivalAirport,iata:cached.arrivalAirportCode},scheduledTime:{local:cached.arrivalTime},revisedTime:{local:cached.revisedArrivalTime},terminal:cached.arrivalTerminal,gate:cached.arrivalGate}, aircraft:{model:cached.aircraft,registration:cached.aircraftRegistration,modeS:cached.aircraftModeS}, status:cached.providerStatus, displayStatus:cached.status });
      setMessage('Saved details loaded instantly. Refreshing live data…');
    } else setMessage('Fetching live schedule…');
    const controller = new AbortController(); const timeout = window.setTimeout(() => controller.abort(), 5500);
    try { const response = await fetch(`/api/flights/lookup?flightNumber=${encodeURIComponent(flightNumber)}&date=${date}`, { signal: controller.signal, cache:'no-store' }); const json = await response.json(); if (!response.ok) throw new Error(json.error || 'Lookup failed'); setLookup(json.flight); setMessage('Live schedule loaded. Review it, then save.'); }
    catch (error) { if (!cached) setLookup(null); setMessage(cached ? 'Saved details are ready. Live refresh timed out, so TripDeck kept the cached information.' : (error instanceof Error && error.name === 'AbortError' ? 'Live lookup timed out. You can save manually and TripDeck will refresh it in the background.' : error instanceof Error ? error.message : 'Could not fetch flight. You can still save it manually.')); }
    finally { window.clearTimeout(timeout); setLoading(false); }
  }
  async function submit(formData: FormData) {
    const f = lookup as any;
    const travelDate = String(formData.get('travelDate') || '');
    const typedDeparture = normalizeWallClock(String(formData.get('departureTime') || ''));
    const providerDeparture = normalizeWallClock(f?.departure?.scheduledTime?.local || '');
    const departureTime = (typedDeparture || providerDeparture).match(/T(\d{2}:\d{2})/)?.[1] || '12:00';
    // The date selected by the traveler is authoritative. Never let API timezone
    // conversion move it to the previous UTC/calendar day.
    const departure = `${travelDate}T${departureTime}`;
    await put('bookings', { id: crypto.randomUUID(), type:'flight', title:`${String(formData.get('originCode')).toUpperCase()} → ${String(formData.get('destinationCode')).toUpperCase()}`, subtitle:`${String(formData.get('airline') || '')} ${String(formData.get('flightNumber'))}`.trim(), date: departure, travelDate, confirmation:String(formData.get('confirmation') || ''), country:String(formData.get('country')) as CountryName, airline:String(formData.get('airline') || f?.airline?.name || ''), flightNumber:String(formData.get('flightNumber')), departureAirport:String(formData.get('departureAirport') || f?.departure?.airport?.name || ''), departureAirportCode:String(formData.get('originCode') || f?.departure?.airport?.iata || ''), arrivalAirport:String(formData.get('arrivalAirport') || f?.arrival?.airport?.name || ''), arrivalAirportCode:String(formData.get('destinationCode') || f?.arrival?.airport?.iata || ''), arrivalTime:normalizeWallClock(f?.arrival?.actualTime?.local || f?.arrival?.revisedTime?.local || f?.arrival?.scheduledTime?.local || String(formData.get('arrivalTime') || '')), revisedDepartureTime:normalizeWallClock(f?.departure?.revisedTime?.local || f?.departure?.actualTime?.local || ''), revisedArrivalTime:normalizeWallClock(f?.arrival?.revisedTime?.local || f?.arrival?.actualTime?.local || ''), terminal:f?.departure?.terminal || '', gate:f?.departure?.gate || '', arrivalTerminal:f?.arrival?.terminal || '', arrivalGate:f?.arrival?.gate || '', checkInDesk:f?.departure?.checkInDesk || '', aircraft:aircraftModelFromApi(f?.aircraft), aircraftRegistration:f?.aircraft?.registration || '', aircraftModeS:f?.aircraft?.modeS || f?.aircraft?.hexIcao || '', providerStatus:f?.status || '', status:f?.displayStatus || (f?.status ? String(f.status).toUpperCase() : 'EXPECTED'), providerLastChecked:f ? new Date().toISOString() : undefined, reminderEnabled:true }); setLookup(null); setMessage('Flight saved and synced, with offline access and a one-day reminder.'); onSaved();
  }
  return <form className="flight-form glass" action={submit} ref={form => { if (form) (form as any).__lookup = () => fetchFlight(form); }}><div className="panel-title"><h3>Add flight</h3><PaperAirplaneIcon/></div><div className="flight-form-grid"><input name="flightNumber" required placeholder="Flight number e.g. EK342"/><DateTimePicker name="travelDate" min="2026-08-21" required/><button type="button" className="secondary" disabled={!online || loading} onClick={e=>fetchFlight(e.currentTarget.form!)}>{loading?'Checking…':'Fetch schedule'}</button><input name="confirmation" placeholder="Booking number / PNR"/><input name="airline" placeholder="Airline"/><select name="country"><option>Malaysia</option><option>Singapore</option><option>Indonesia</option></select><input name="originCode" required placeholder="Origin IATA e.g. DXB"/><input name="departureAirport" placeholder="Departure airport"/><DateTimePicker name="departureTime" mode="datetime" required/><input name="destinationCode" required placeholder="Destination IATA e.g. KUL"/><input name="arrivalAirport" placeholder="Arrival airport"/><DateTimePicker name="arrivalTime" mode="datetime"/></div>{message&&<div className="notice">{message}</div>}{lookup&&<div className="lookup-preview"><CheckCircleIcon/><div><b>Schedule loaded</b><span>{String((lookup as any).departure?.airport?.name || '')} → {String((lookup as any).arrival?.airport?.name || '')}</span></div></div>}<button className="primary"><PlusIcon/> Save flight & reminder</button></form>;
}

function AddModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [kind, setKind] = useState<'itinerary' | 'booking'>('itinerary');
  async function submit(formData: FormData) { const id = crypto.randomUUID(); if (kind === 'itinerary') await put('itinerary', { id, title: String(formData.get('title')), location: String(formData.get('location')), date: String(formData.get('date')), time: String(formData.get('time')), country: String(formData.get('country')) as CountryName, notes: String(formData.get('notes') || '') }); else await put('bookings', { id, type: String(formData.get('type')) as Booking['type'], title: String(formData.get('title')), subtitle: String(formData.get('location')), date: String(formData.get('date')), country: String(formData.get('country')) as CountryName, confirmation: String(formData.get('confirmation') || '') }); onSaved(); }
  return <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}><motion.form className="modal glass" action={submit} onMouseDown={e => e.stopPropagation()}><div className="panel-title"><h3>Add to trip</h3><button type="button" onClick={onClose}>×</button></div><div className="segmented"><button type="button" className={kind === 'itinerary' ? 'active' : ''} onClick={() => setKind('itinerary')}>Plan</button><button type="button" className={kind === 'booking' ? 'active' : ''} onClick={() => setKind('booking')}>Booking</button></div>{kind === 'booking' && <select name="type"><option value="flight">Flight</option><option value="hotel">Hotel</option><option value="transfer">Transfer</option><option value="activity">Activity</option></select>}<input name="title" required placeholder="Title"/><input name="location" required placeholder="Location or details"/><div className="form-row"><select name="country"><option>Malaysia</option><option>Singapore</option><option>Indonesia</option></select><DateTimePicker name="date" min="2026-08-21" required/></div>{kind === 'itinerary' ? <DateTimePicker name="time" mode="time" required/> : <input name="confirmation" placeholder="Booking number"/>}<textarea name="notes" placeholder="Notes"/><button className="primary">Save offline</button></motion.form></motion.div>;
}

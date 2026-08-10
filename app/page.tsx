'use client';

import { useEffect, useMemo, useState } from 'react';
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
  ItineraryItem, put, remove, TRAVELERS, TravelerName, TripDocument
} from '@/lib/db';
import { convertWithRates, fetchLiveFx } from '@/lib/fx';

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
  const [now, setNow] = useState(() => Date.now());

  async function refresh() {
    const [b, d, i, c, e, h, a] = await Promise.all([
      getAll('bookings'), getAll('documents'), getAll('itinerary'), getAll('checklist'),
      getAll('expenses'), getAll('hotels'), getAll('attractions'),
    ]);
    setBookings(b); setDocuments(d); setItems(i); setChecklist(c); setExpenses(e); setHotels(h); setAttractions(a);
  }

  useEffect(() => {
    (async () => {
      // Remove flight placeholders from older builds. Only user-added flights should appear.
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
    })();
    const sync = () => setOnline(navigator.onLine);
    const onScroll = () => { const max = document.documentElement.scrollHeight - innerHeight; setScrollProgress(max > 0 ? scrollY / max * 100 : 0); };
    sync(); onScroll();
    const countdownTimer = window.setInterval(() => setNow(Date.now()), 1000);
    window.addEventListener('online', sync); window.addEventListener('offline', sync); window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.clearInterval(countdownTimer); window.removeEventListener('online', sync); window.removeEventListener('offline', sync); window.removeEventListener('scroll', onScroll); };
  }, []);

  useEffect(() => {
    if (!online) return;
    let cancelled = false;
    const syncLiveFlightStatuses = async () => {
      const current = await getAll('bookings');
      const currentTime = Date.now();
      let changed = false;
      for (const booking of current.filter(b => b.type === 'flight' && b.flightNumber)) {
        const departureMs = +new Date(booking.date);
        // Poll live status only near departure to avoid wasting API quota. The initial
        // add-flight lookup still stores the provider's current schedule/status.
        if (departureMs < currentTime - 12 * 60 * 60 * 1000 || departureMs > currentTime + 36 * 60 * 60 * 1000) continue;
        try {
          const travelDate = booking.travelDate || booking.date.slice(0, 10);
          const response = await fetch(`/api/flights/lookup?flightNumber=${encodeURIComponent(booking.flightNumber || '')}&date=${travelDate}`, { cache: 'no-store' });
          const json = await response.json();
          if (!response.ok || !json.flight) continue;
          const f = json.flight as any;
          const revisedDeparture = normalizeWallClock(f?.departure?.actualTime?.local || f?.departure?.revisedTime?.local || f?.departure?.scheduledTime?.local || booking.date);
          const revisedArrival = normalizeWallClock(f?.arrival?.actualTime?.local || f?.arrival?.revisedTime?.local || f?.arrival?.scheduledTime?.local || booking.arrivalTime || '');
          const updated: Booking = {
            ...booking,
            date: revisedDeparture || booking.date,
            arrivalTime: revisedArrival || booking.arrivalTime,
            airline: f?.airline?.name || booking.airline,
            departureAirport: f?.departure?.airport?.name || booking.departureAirport,
            departureAirportCode: f?.departure?.airport?.iata || booking.departureAirportCode,
            arrivalAirport: f?.arrival?.airport?.name || booking.arrivalAirport,
            arrivalAirportCode: f?.arrival?.airport?.iata || booking.arrivalAirportCode,
            terminal: f?.departure?.terminal || booking.terminal,
            gate: f?.departure?.gate || booking.gate,
            arrivalTerminal: f?.arrival?.terminal || booking.arrivalTerminal,
            arrivalGate: f?.arrival?.gate || booking.arrivalGate,
            checkInDesk: f?.departure?.checkInDesk || booking.checkInDesk,
            aircraft: aircraftModelFromApi(f?.aircraft) || booking.aircraft,
            aircraftRegistration: f?.aircraft?.registration || booking.aircraftRegistration,
            aircraftModeS: f?.aircraft?.modeS || f?.aircraft?.hexIcao || booking.aircraftModeS,
            providerStatus: f?.status || booking.providerStatus,
            status: f?.displayStatus || booking.status || 'EXPECTED',
            revisedDepartureTime: normalizeWallClock(f?.departure?.revisedTime?.local || f?.departure?.actualTime?.local || '') || booking.revisedDepartureTime,
            revisedArrivalTime: normalizeWallClock(f?.arrival?.revisedTime?.local || f?.arrival?.actualTime?.local || '') || booking.revisedArrivalTime,
            providerLastChecked: json.checkedAt || new Date().toISOString(),
          };
          if (JSON.stringify(updated) !== JSON.stringify(booking)) { await put('bookings', updated); changed = true; }
        } catch { /* keep the last known/offline flight status */ }
      }
      if (changed && !cancelled) await refresh();
    };
    const initial = window.setTimeout(syncLiveFlightStatuses, 1500);
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
  const selectedDocs = documents.filter(d => d.traveler === traveler);
  const countryExpenses = expenses.filter(e => e.country === expenseCountry);
  const categoryTotals = useMemo(() => Object.entries(countryExpenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount; return acc;
  }, {})), [countryExpenses]);

  async function uploadFiles(files: FileList | null) {
    if (!files) return;
    for (const file of Array.from(files)) await put('documents', {
      id: crypto.randomUUID(), traveler, category: docCategory, name: file.name,
      type: file.type || 'file', size: file.size, createdAt: new Date().toISOString(), blob: file,
    });
    await refresh();
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
        <div className="quick-stats"><Stat icon={<UserGroupIcon/>} value="6" label="Travelers"/><Stat icon={<DocumentTextIcon/>} value={String(documents.length)} label="Saved documents"/><Stat icon={<BuildingOffice2Icon/>} value={String(hotels.length)} label="Hotel stays"/><Stat icon={<SparklesIcon/>} value={String(attractions.filter(a => a.saved).length)} label="Saved attractions"/></div>
        <div className="section-heading"><div><span className="eyebrow">THE ROUTE</span><h3>Country overview</h3></div><button className="text-button" onClick={enableNotifications}><BellIcon/> Reminders</button></div>
        <div className="country-grid">{countries.map((c, i) => <motion.button type="button" className="country-card country-card-button" key={c.code} onClick={() => { setExplorerCountry(c.name); setTab('explorer'); }} initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .25 }} transition={{ delay: i * .1 }} whileHover={{ y: -8, rotateX: 2 }}><span className="number">0{i + 1}</span><div className={`flag f${c.code}`}>{c.code}</div><h4>{c.name}</h4><p>{c.dates}</p><small>{c.city} · {c.vibe}</small><small>{TRAVELER_COUNT_BY_COUNTRY[c.name]} friends travelling</small><b className="explore-label">Explore attractions →</b></motion.button>)}</div>
        <div className="two-col"><section className="panel glass"><div className="panel-title"><h3>Bookings</h3><button onClick={() => setShowAdd(true)}><PlusIcon/></button></div>{bookings.map(b => <div className="booking" key={b.id}><div className="booking-icon">{b.type === 'flight' ? <PaperAirplaneIcon/> : <MapPinIcon/>}</div><div><b>{b.title}</b><span>{b.flightNumber ? `${b.flightNumber} · ` : ''}{b.subtitle}</span></div><div className="booking-right"><b>{formatDate(b.date)}</b><span>{b.confirmation}</span></div></div>)}<button className="gmail" onClick={() => setTab('bookings')}><PaperAirplaneIcon/> Manage flights manually <span>Lookup live schedule by flight number and date</span></button></section>
        <section className="panel glass"><div className="panel-title"><h3>Group readiness</h3><ShieldCheckIcon/></div><div className="progress"><span style={{ width: `${checklist.length ? prepDone / checklist.length * 100 : 0}%` }}/></div><p className="muted">{prepDone} of {checklist.length} essentials ready</p><div className="mini-checks">{checklist.map(item => <label key={item.id}><input type="checkbox" checked={item.done} onChange={async () => { await put('checklist', { ...item, done: !item.done }); await refresh(); }}/><span>{item.title}</span></label>)}</div></section></div>
      </motion.section>}

      {tab === 'smart' && <motion.section className="content" key="smart" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}><TripIntelligence attractions={attractions} bookings={bookings} hotels={hotels} itinerary={items} expenses={expenses} checklist={checklist} onRefresh={refresh} onOpenExplorer={(country) => { setExplorerCountry(country); setTab('explorer'); }} onOpenItinerary={() => setTab('itinerary')}/></motion.section>}
      {tab === 'explorer' && <motion.section className="content" key="explorer" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}><CountryExplorer attractions={attractions} hotels={hotels} bookings={bookings} initialCountry={explorerCountry} onRefresh={refresh} onOpenItinerary={() => setTab('itinerary')}/></motion.section>}
      {tab === 'food' && <motion.section className="content" key="food" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}><FoodGuide hotels={hotels} bookings={bookings}/></motion.section>}
      {tab === 'nearby' && <motion.section className="content" key="nearby" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}><NearbyHalal/></motion.section>}

      {tab === 'itinerary' && <motion.section className="content" key="itinerary" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><div className="section-heading"><div><span className="eyebrow">DAY BY DAY</span><h3>Group itinerary</h3></div><button className="primary small" onClick={() => setShowAdd(true)}><PlusIcon/> Add</button></div>{items.length === 0 ? <Empty icon={<CalendarDaysIcon/>} title="No plans yet" text="Add activities, meals, transfers and reservations."/> : <div className="timeline">{[...items].sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)).map(item => <div className="timeline-row" key={item.id}><div className="time"><b>{formatDate(item.date)}</b><span>{item.time}</span></div><div className="dot"/><div className="timeline-card"><span>{item.country}</span><h4>{item.title}</h4><p>{item.location}</p><small>{item.notes}</small></div></div>)}</div>}</motion.section>}

      {tab === 'documents' && <motion.section className="content" key="documents" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><div className="section-heading"><div><span className="eyebrow">6 PRIVATE FOLDERS</span><h3>Traveler documents</h3></div></div>
        <div className="traveler-tabs">{TRAVELERS.map(name => <button key={name} className={traveler === name ? 'active' : ''} onClick={() => setTraveler(name)}><FolderIcon/><span>{name}</span><b>{documents.filter(d => d.traveler === name).length}</b></button>)}</div>
        <div className="vault-banner"><ShieldCheckIcon/><div><b>{traveler}&apos;s folder</b><span>Files are stored locally in IndexedDB and remain available offline on this device.</span></div></div>
        <div className="upload-toolbar"><select value={docCategory} onChange={e => setDocCategory(e.target.value as TripDocument['category'])}><option>Passport</option><option>Visa</option><option>Ticket</option><option>Insurance</option><option>Hotel</option><option>Other</option></select><label className="primary small"><ArrowUpTrayIcon/> Upload for {traveler}<input type="file" multiple hidden onChange={e => uploadFiles(e.target.files)}/></label></div>
        {selectedDocs.length === 0 ? <Empty icon={<DocumentTextIcon/>} title={`No files for ${traveler}`} text="Upload passport copies, visas, tickets, insurance and hotel vouchers."/> : <div className="doc-grid">{selectedDocs.map(doc => <article className="doc-card" key={doc.id}><DocumentTextIcon/><div><b>{doc.name}</b><span>{doc.category} · {(doc.size / 1024).toFixed(1)} KB</span></div><div className="doc-actions"><button onClick={() => { const u = URL.createObjectURL(doc.blob); window.open(u, '_blank'); }}>Open</button><button onClick={async () => { await remove('documents', doc.id); await refresh(); }}><TrashIcon/></button></div></article>)}</div>}
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
    setLoading(true); setMessage('');
    try { const response = await fetch(`/api/flights/lookup?flightNumber=${encodeURIComponent(flightNumber)}&date=${date}`); const json = await response.json(); if (!response.ok) throw new Error(json.error || 'Lookup failed'); setLookup(json.flight); setMessage('Flight schedule found. Review it, then save.'); }
    catch (error) { setLookup(null); setMessage(error instanceof Error ? error.message : 'Could not fetch flight. You can still save it manually.'); }
    finally { setLoading(false); }
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

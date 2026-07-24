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
import { attractionDataset } from '@/lib/attractions';
import {
  Attraction, Booking, ChecklistItem, CountryName, Expense, getAll, HotelStay,
  ItineraryItem, put, remove, TRAVELERS, TravelerName, TripDocument
} from '@/lib/db';

const countries: { name: CountryName; code: string; dates: string; city: string; vibe: string }[] = [
  { name: 'Malaysia', code: 'MY', dates: '22–26 Aug · 4 nights', city: 'Kuala Lumpur', vibe: 'Food, skyline and culture' },
  { name: 'Singapore', code: 'SG', dates: '26–30 Aug · 4 nights', city: 'Singapore', vibe: 'Gardens, hawkers and city lights' },
  { name: 'Indonesia', code: 'ID', dates: '30 Aug–3 Sep · 4 nights', city: 'Jakarta', vibe: 'History, food and city culture' },
];

const starterBookings: Booking[] = [
  { id: 'b1', type: 'flight', title: 'Dubai → Malaysia', subtitle: 'Depart 21 Aug · arrive 22 Aug', date: '2026-08-21T22:00', confirmation: 'ADD PNR', country: 'Malaysia' },
  { id: 'b2', type: 'flight', title: 'Malaysia → Singapore', subtitle: 'Travel on 26 August', date: '2026-08-26T11:00', confirmation: 'ADD PNR', country: 'Singapore' },
  { id: 'b3', type: 'flight', title: 'Singapore → Indonesia', subtitle: 'Travel on 30 August', date: '2026-08-30T13:00', confirmation: 'ADD PNR', country: 'Indonesia' },
  { id: 'b4', type: 'flight', title: 'Indonesia → Dubai', subtitle: 'Return on 3 September', date: '2026-09-03T18:00', confirmation: 'ADD PNR', country: 'Indonesia' },
];

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
  checkOut: index === 0 ? '2026-08-26' : index === 1 ? '2026-08-30' : '2026-09-03',
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
];

type Tab = 'overview' | 'smart' | 'explorer' | 'bookings' | 'itinerary' | 'documents' | 'expenses' | 'stays' | 'toolkit';
const formatDate = (value: string) => new Date(`${value.slice(0, 10)}T00:00`).toLocaleDateString('en', { day: 'numeric', month: 'short' });

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

  async function refresh() {
    const [b, d, i, c, e, h, a] = await Promise.all([
      getAll('bookings'), getAll('documents'), getAll('itinerary'), getAll('checklist'),
      getAll('expenses'), getAll('hotels'), getAll('attractions'),
    ]);
    setBookings(b); setDocuments(d); setItems(i); setChecklist(c); setExpenses(e); setHotels(h); setAttractions(a);
  }

  useEffect(() => {
    (async () => {
      for (const booking of starterBookings) await put('bookings', booking);
      if (!(await getAll('checklist')).length) for (const item of starterChecklist) await put('checklist', item);
      if (!(await getAll('hotels')).length) for (const hotel of starterHotels) await put('hotels', hotel);
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
    sync(); onScroll(); window.addEventListener('online', sync); window.addEventListener('offline', sync); window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('online', sync); window.removeEventListener('offline', sync); window.removeEventListener('scroll', onScroll); };
  }, []);

  const nextBooking = useMemo(() => [...bookings].sort((a, b) => +new Date(a.date) - +new Date(b.date))[0], [bookings]);
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
    if (!bookings.length || typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') return;
    const now = Date.now();
    const upcoming = bookings.filter(b => b.reminderEnabled !== false && +new Date(b.date) > now && +new Date(b.date) - now <= 24 * 60 * 60 * 1000);
    const stays = hotels.filter(h => h.reminderEnabled !== false && +new Date(`${h.checkIn}T15:00`) > now && +new Date(`${h.checkIn}T15:00`) - now <= 24 * 60 * 60 * 1000);
    for (const booking of upcoming) {
      const key = `tripdeck-reminder-${booking.id}-${booking.date.slice(0,10)}`;
      if (!localStorage.getItem(key)) { new Notification(`Tomorrow: ${booking.title}`, { body: `${booking.departureAirport || booking.subtitle} · ${new Date(booking.date).toLocaleString()}` }); localStorage.setItem(key, 'sent'); }
    }
    for (const hotel of stays) {
      const key = `tripdeck-hotel-${hotel.id}-${hotel.checkIn}`;
      if (!localStorage.getItem(key)) { new Notification(`Hotel check-in tomorrow: ${hotel.name}`, { body: `${hotel.city} · Confirmation ${hotel.confirmation || 'not added'}` }); localStorage.setItem(key, 'sent'); }
    }
  }, [bookings, hotels]);


  function exportTrip() {
    const payload = { travelers: TRAVELERS, bookings, itinerary: items, checklist, expenses, hotels, attractions, exportedAt: new Date().toISOString() };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = 'tripdeck-group-backup.json'; a.click(); URL.revokeObjectURL(url);
  }

  return <main>
    <motion.div className="scroll-progress" style={{ width: `${scrollProgress}%` }}/><div className="ambient a1"/><div className="ambient a2"/>
    <header className="topbar glass"><div className="brand-lockup"><img src="/tripdeck-logo.svg" alt="TripDeck"/><div><span className="eyebrow">GROUP TRAVEL OS</span><h1>TripDeck<span>.</span></h1></div></div><div className={`status ${online ? 'online' : 'offline'}`}><WifiIcon/>{online ? 'Online' : 'Offline · local mode'}</div></header>

    <section className="hero"><motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }}>
      <span className="eyebrow">21 AUGUST — 3 SEPTEMBER 2026</span><h2>Six travelers.<br/><em>Zero chaos.</em></h2>
      <p>Documents, detailed country budgets, hotels, airport transfers, attractions and every booking—available offline.</p>
      <div className="date-pill"><CalendarDaysIcon/><b>14 days</b><span>Dubai → Malaysia → Singapore → Indonesia → Dubai</span></div>
      <div className="hero-actions"><button className="primary" onClick={() => setShowAdd(true)}><PlusIcon/> Add trip item</button><button className="secondary" onClick={() => setTab('documents')}><FolderIcon/> Traveler folders</button></div>
    </motion.div>
    <motion.div className="boarding-pass" initial={{ opacity: 0, rotate: 4, x: 40 }} animate={{ opacity: 1, rotate: -2, x: 0 }} whileHover={{ rotate: 0, scale: 1.02 }}>
      <div className="pass-top"><span>NEXT ROUTE</span><PaperAirplaneIcon/></div><div className="route"><strong>{nextBooking?.title || 'Dubai → Malaysia'}</strong><small>{nextBooking?.subtitle}</small></div><div className="pass-meta"><div><span>TRAVELERS</span><b>6</b></div><div><span>CONFIRMATION</span><b>{nextBooking?.confirmation || 'ADD PNR'}</b></div></div><div className="barcode">|||| ||| || |||| | ||| ||||||</div>
    </motion.div></section>

    <nav className="tabs glass">{(['overview', 'smart', 'explorer', 'bookings', 'itinerary', 'documents', 'expenses', 'stays', 'toolkit'] as Tab[]).map(t => <button key={t} onClick={() => setTab(t)} className={tab === t ? 'active' : ''}>{t}</button>)}</nav>

    <AnimatePresence mode="wait">
      {tab === 'overview' && <motion.section className="content" key="overview" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="quick-stats"><Stat icon={<UserGroupIcon/>} value="6" label="Travelers"/><Stat icon={<DocumentTextIcon/>} value={String(documents.length)} label="Saved documents"/><Stat icon={<BuildingOffice2Icon/>} value={String(hotels.length)} label="Hotel stays"/><Stat icon={<SparklesIcon/>} value={String(attractions.filter(a => a.saved).length)} label="Saved attractions"/></div>
        <div className="section-heading"><div><span className="eyebrow">THE ROUTE</span><h3>Country overview</h3></div><button className="text-button" onClick={enableNotifications}><BellIcon/> Reminders</button></div>
        <div className="country-grid">{countries.map((c, i) => <motion.button type="button" className="country-card country-card-button" key={c.code} onClick={() => { setExplorerCountry(c.name); setTab('explorer'); }} initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .25 }} transition={{ delay: i * .1 }} whileHover={{ y: -8, rotateX: 2 }}><span className="number">0{i + 1}</span><div className={`flag f${c.code}`}>{c.code}</div><h4>{c.name}</h4><p>{c.dates}</p><small>{c.city} · {c.vibe}</small><b className="explore-label">Explore attractions →</b></motion.button>)}</div>
        <div className="two-col"><section className="panel glass"><div className="panel-title"><h3>Bookings</h3><button onClick={() => setShowAdd(true)}><PlusIcon/></button></div>{bookings.map(b => <div className="booking" key={b.id}><div className="booking-icon">{b.type === 'flight' ? <PaperAirplaneIcon/> : <MapPinIcon/>}</div><div><b>{b.title}</b><span>{b.flightNumber ? `${b.flightNumber} · ` : ''}{b.subtitle}</span></div><div className="booking-right"><b>{formatDate(b.date)}</b><span>{b.confirmation}</span></div></div>)}<button className="gmail" onClick={() => setTab('bookings')}><PaperAirplaneIcon/> Manage flights manually <span>Lookup live schedule by flight number and date</span></button></section>
        <section className="panel glass"><div className="panel-title"><h3>Group readiness</h3><ShieldCheckIcon/></div><div className="progress"><span style={{ width: `${checklist.length ? prepDone / checklist.length * 100 : 0}%` }}/></div><p className="muted">{prepDone} of {checklist.length} essentials ready</p><div className="mini-checks">{checklist.map(item => <label key={item.id}><input type="checkbox" checked={item.done} onChange={async () => { await put('checklist', { ...item, done: !item.done }); await refresh(); }}/><span>{item.title}</span></label>)}</div></section></div>
      </motion.section>}

      {tab === 'smart' && <motion.section className="content" key="smart" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}><TripIntelligence attractions={attractions} bookings={bookings} hotels={hotels} itinerary={items} expenses={expenses} checklist={checklist} onRefresh={refresh} onOpenExplorer={(country) => { setExplorerCountry(country); setTab('explorer'); }} onOpenItinerary={() => setTab('itinerary')}/></motion.section>}
      {tab === 'explorer' && <motion.section className="content" key="explorer" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}><CountryExplorer attractions={attractions} hotels={hotels} bookings={bookings} initialCountry={explorerCountry} onRefresh={refresh} onOpenItinerary={() => setTab('itinerary')}/></motion.section>}

      {tab === 'itinerary' && <motion.section className="content" key="itinerary" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><div className="section-heading"><div><span className="eyebrow">DAY BY DAY</span><h3>Group itinerary</h3></div><button className="primary small" onClick={() => setShowAdd(true)}><PlusIcon/> Add</button></div>{items.length === 0 ? <Empty icon={<CalendarDaysIcon/>} title="No plans yet" text="Add activities, meals, transfers and reservations."/> : <div className="timeline">{[...items].sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)).map(item => <div className="timeline-row" key={item.id}><div className="time"><b>{formatDate(item.date)}</b><span>{item.time}</span></div><div className="dot"/><div className="timeline-card"><span>{item.country}</span><h4>{item.title}</h4><p>{item.location}</p><small>{item.notes}</small></div></div>)}</div>}</motion.section>}

      {tab === 'documents' && <motion.section className="content" key="documents" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><div className="section-heading"><div><span className="eyebrow">6 PRIVATE FOLDERS</span><h3>Traveler documents</h3></div></div>
        <div className="traveler-tabs">{TRAVELERS.map(name => <button key={name} className={traveler === name ? 'active' : ''} onClick={() => setTraveler(name)}><FolderIcon/><span>{name}</span><b>{documents.filter(d => d.traveler === name).length}</b></button>)}</div>
        <div className="vault-banner"><ShieldCheckIcon/><div><b>{traveler}&apos;s folder</b><span>Files are stored locally in IndexedDB and remain available offline on this device.</span></div></div>
        <div className="upload-toolbar"><select value={docCategory} onChange={e => setDocCategory(e.target.value as TripDocument['category'])}><option>Passport</option><option>Visa</option><option>Ticket</option><option>Insurance</option><option>Hotel</option><option>Other</option></select><label className="primary small"><ArrowUpTrayIcon/> Upload for {traveler}<input type="file" multiple hidden onChange={e => uploadFiles(e.target.files)}/></label></div>
        {selectedDocs.length === 0 ? <Empty icon={<DocumentTextIcon/>} title={`No files for ${traveler}`} text="Upload passport copies, visas, tickets, insurance and hotel vouchers."/> : <div className="doc-grid">{selectedDocs.map(doc => <article className="doc-card" key={doc.id}><DocumentTextIcon/><div><b>{doc.name}</b><span>{doc.category} · {(doc.size / 1024).toFixed(1)} KB</span></div><div className="doc-actions"><button onClick={() => { const u = URL.createObjectURL(doc.blob); window.open(u, '_blank'); }}>Open</button><button onClick={async () => { await remove('documents', doc.id); await refresh(); }}><TrashIcon/></button></div></article>)}</div>}
      </motion.section>}

      {tab === 'expenses' && <motion.section className="content" key="expenses" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><div className="section-heading"><div><span className="eyebrow">COUNTRYWISE BUDGETS</span><h3>Detailed expenses</h3></div></div>
        <div className="country-switch">{countries.map(c => <button key={c.code} className={expenseCountry === c.name ? 'active' : ''} onClick={() => setExpenseCountry(c.name)}>{c.code}<span>{c.name}</span></button>)}</div>
        <div className="expense-layout"><section className="panel glass"><div className="panel-title"><h3>Add expense</h3><CurrencyDollarIcon/></div><ExpenseForm country={expenseCountry} onSaved={refresh}/></section><section className="panel glass"><div className="panel-title"><h3>{expenseCountry} breakdown</h3><BanknotesIcon/></div><div className="category-grid">{categoryTotals.length ? categoryTotals.map(([category, amount]) => <div key={category}><span>{category}</span><b>{amount.toFixed(2)}</b></div>) : <p className="muted">No expenses logged yet.</p>}</div></section></div>
        <div className="expense-table">{countryExpenses.map(e => <div className="expense-row" key={e.id}><div><b>{e.title}</b><span>{e.category} · paid by {e.paidBy} · {formatDate(e.date)}</span>{e.notes && <small>{e.notes}</small>}</div><strong>{e.currency} {e.amount.toFixed(2)}</strong><button onClick={async () => { await remove('expenses', e.id); await refresh(); }}><TrashIcon/></button></div>)}</div>
      </motion.section>}

      {tab === 'stays' && <motion.section className="content" key="stays" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><div className="section-heading"><div><span className="eyebrow">HOTELS & THINGS TO DO</span><h3>Stay planner</h3></div></div>
        <div className="hotel-grid">{hotels.map(hotel => <HotelCard key={hotel.id} hotel={hotel} onSaved={refresh}/>)}</div>
        <div className="section-heading attractions-heading"><div><span className="eyebrow">CITY SHORTLIST</span><h3>Attractions</h3></div></div>
        <AttractionForm onSaved={refresh}/><div className="attraction-grid">{attractions.map(a => <article className="attraction-card" key={a.id}><div className="attraction-icon"><MapIcon/></div><div><span>{a.country} · {a.city}</span><h4>{a.name}</h4><p>{a.category}{a.distanceFromHotelKm ? ` · ${a.distanceFromHotelKm} km from hotel` : ''}</p>{a.plannedDate && <small>Planned {formatDate(a.plannedDate)}</small>}</div><button onClick={async () => { await put('attractions', { ...a, saved: !a.saved }); await refresh(); }} className={a.saved ? 'saved' : ''}>{a.saved ? 'Saved' : 'Save'}</button></article>)}</div>
      </motion.section>}


      {tab === 'bookings' && <motion.section className="content" key="bookings" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
        <div className="section-heading"><div><span className="eyebrow">MANUAL + LIVE SCHEDULE LOOKUP</span><h3>Flights and booking details</h3></div><button className="text-button" onClick={enableNotifications}><BellIcon/> Enable alerts</button></div>
        <div className="notice">Airline booking references are private reservation records. TripDeck stores your PNR manually and uses a flight-data provider to fetch schedules by flight number and travel date.</div>
        <FlightForm online={online} onSaved={refresh}/>
        <div className="flight-list">{bookings.filter(b => b.type === 'flight').sort((a,b) => +new Date(a.date)-+new Date(b.date)).map((booking,index) => <motion.article className="flight-card glass" key={booking.id} initial={{opacity:0,y:22}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{delay:index*.05}}><div className="flight-route"><div><span>{booking.departureAirport || 'Origin'}</span><b>{booking.departureAirportCode || '---'}</b></div><PaperAirplaneIcon/><div><span>{booking.arrivalAirport || 'Destination'}</span><b>{booking.arrivalAirportCode || '---'}</b></div></div><div className="flight-details"><div><span>Flight</span><b>{booking.flightNumber || 'Add number'}</b></div><div><span>Departure</span><b>{new Date(booking.date).toLocaleString()}</b></div><div><span>PNR</span><b>{booking.confirmation || 'Not added'}</b></div><div><span>Status</span><b>{booking.status || 'Saved offline'}</b></div></div><div className="flight-actions"><span>{booking.providerLastChecked ? `Updated ${new Date(booking.providerLastChecked).toLocaleString()}` : 'Manual details'}</span><button onClick={async()=>{await remove('bookings',booking.id);await refresh();}}><TrashIcon/> Remove</button></div></motion.article>)}</div>
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

function ExpenseForm({ country, onSaved }: { country: CountryName; onSaved: () => void }) {
  async function submit(formData: FormData) {
    await put('expenses', { id: crypto.randomUUID(), title: String(formData.get('title')), amount: Number(formData.get('amount')), currency: String(formData.get('currency')), country, category: String(formData.get('category')) as Expense['category'], paidBy: String(formData.get('paidBy')) as TravelerName, date: String(formData.get('date')), notes: String(formData.get('notes') || '') }); onSaved();
  }
  return <form className="expense-form" action={submit}><input name="title" required placeholder="Taxi, dinner, tickets..."/><div><input name="amount" required min="0" step="0.01" type="number" placeholder="Amount"/><select name="currency"><option>{country === 'Malaysia' ? 'MYR' : country === 'Singapore' ? 'SGD' : 'IDR'}</option><option>AED</option><option>USD</option></select></div><div><select name="category"><option>Food</option><option>Transport</option><option>Hotel</option><option>Attraction</option><option>Shopping</option><option>Flights</option><option>Other</option></select><select name="paidBy">{TRAVELERS.map(t => <option key={t}>{t}</option>)}</select></div><input name="date" type="date" min="2026-08-21" max="2026-09-03" required/><textarea name="notes" placeholder="Split details or notes"/><button className="primary small" type="submit"><PlusIcon/> Log expense</button></form>;
}

function HotelCard({ hotel, onSaved }: { hotel: HotelStay; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  async function submit(formData: FormData) { await put('hotels', { ...hotel, name: String(formData.get('name')), city: String(formData.get('city')), address: String(formData.get('address')), airport: String(formData.get('airport')), distanceKm: Number(formData.get('distanceKm')), transferMinutes: Number(formData.get('transferMinutes')), confirmation: String(formData.get('confirmation') || ''), phone: String(formData.get('phone') || ''), notes: String(formData.get('notes') || ''), bookingProvider: String(formData.get('bookingProvider') || ''), reminderEnabled: true }); setEditing(false); onSaved(); }
  if (editing) return <form className="hotel-card glass hotel-form" action={submit}><div className="panel-title"><h3>{hotel.country}</h3><button type="button" onClick={() => setEditing(false)}>×</button></div><input name="name" defaultValue={hotel.name} placeholder="Hotel name"/><input name="city" defaultValue={hotel.city} placeholder="City"/><input name="address" defaultValue={hotel.address} placeholder="Address"/><input name="airport" defaultValue={hotel.airport} placeholder="Arrival airport"/><div className="form-row"><input name="distanceKm" type="number" step="0.1" defaultValue={hotel.distanceKm} placeholder="Distance km"/><input name="transferMinutes" type="number" defaultValue={hotel.transferMinutes} placeholder="Transfer minutes"/></div><input name="confirmation" defaultValue={hotel.confirmation} placeholder="Booking confirmation"/><input name="bookingProvider" defaultValue={hotel.bookingProvider} placeholder="Booked with (hotel, Booking.com, Agoda...)"/><input name="phone" defaultValue={hotel.phone} placeholder="Hotel phone"/><textarea name="notes" defaultValue={hotel.notes} placeholder="Breakfast, rooms, pickup notes..."/><button className="primary small">Save stay</button></form>;
  return <article className="hotel-card glass"><div className="hotel-top"><div className="booking-icon"><BuildingOffice2Icon/></div><div><span>{hotel.country} · {hotel.city}</span><h3>{hotel.name}</h3></div><button onClick={() => setEditing(true)}>Edit</button></div><p>{hotel.address}</p><div className="hotel-metrics"><div><span>Airport</span><b>{hotel.airport}</b></div><div><span>Distance</span><b>{hotel.distanceKm ? `${hotel.distanceKm} km` : 'Add distance'}</b></div><div><span>Transfer</span><b>{hotel.transferMinutes ? `${hotel.transferMinutes} min` : 'Add time'}</b></div></div><small>{formatDate(hotel.checkIn)} → {formatDate(hotel.checkOut)} {hotel.confirmation ? `· ${hotel.confirmation}` : ''}{hotel.bookingProvider ? ` · ${hotel.bookingProvider}` : ''}</small></article>;
}

function AttractionForm({ onSaved }: { onSaved: () => void }) {
  async function submit(formData: FormData) { await put('attractions', { id: crypto.randomUUID(), country: String(formData.get('country')) as CountryName, city: String(formData.get('city')), name: String(formData.get('name')), category: String(formData.get('category')), plannedDate: String(formData.get('plannedDate') || ''), distanceFromHotelKm: Number(formData.get('distanceFromHotelKm') || 0), saved: true, notes: String(formData.get('notes') || '') }); onSaved(); }
  return <form className="attraction-form glass" action={submit}><input name="name" required placeholder="Add attraction or restaurant"/><select name="country"><option>Malaysia</option><option>Singapore</option><option>Indonesia</option></select><input name="city" required placeholder="City"/><input name="category" placeholder="Landmark, food, beach..."/><input name="plannedDate" type="date" min="2026-08-21" max="2026-09-03"/><input name="distanceFromHotelKm" type="number" step="0.1" placeholder="Km from hotel"/><button className="primary small"><PlusIcon/> Add place</button></form>;
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
    const departure = f?.departure?.scheduledTime?.local || String(formData.get('departureTime'));
    await put('bookings', { id: crypto.randomUUID(), type:'flight', title:`${String(formData.get('originCode')).toUpperCase()} → ${String(formData.get('destinationCode')).toUpperCase()}`, subtitle:`${String(formData.get('airline') || '')} ${String(formData.get('flightNumber'))}`.trim(), date: departure || `${String(formData.get('travelDate'))}T12:00`, confirmation:String(formData.get('confirmation') || ''), country:String(formData.get('country')) as CountryName, airline:String(formData.get('airline') || f?.airline?.name || ''), flightNumber:String(formData.get('flightNumber')), departureAirport:String(formData.get('departureAirport') || f?.departure?.airport?.name || ''), departureAirportCode:String(formData.get('originCode') || f?.departure?.airport?.iata || ''), arrivalAirport:String(formData.get('arrivalAirport') || f?.arrival?.airport?.name || ''), arrivalAirportCode:String(formData.get('destinationCode') || f?.arrival?.airport?.iata || ''), arrivalTime:f?.arrival?.scheduledTime?.local || String(formData.get('arrivalTime') || ''), terminal:f?.departure?.terminal || '', gate:f?.departure?.gate || '', status:f?.status || '', providerLastChecked:f ? new Date().toISOString() : undefined, reminderEnabled:true }); setLookup(null); setMessage('Flight saved offline with a one-day reminder.'); onSaved();
  }
  return <form className="flight-form glass" action={submit} ref={form => { if (form) (form as any).__lookup = () => fetchFlight(form); }}><div className="panel-title"><h3>Add flight</h3><PaperAirplaneIcon/></div><div className="flight-form-grid"><input name="flightNumber" required placeholder="Flight number e.g. EK342"/><input name="travelDate" type="date" min="2026-08-21" max="2026-09-03" required/><button type="button" className="secondary" disabled={!online || loading} onClick={e=>fetchFlight(e.currentTarget.form!)}>{loading?'Checking…':'Fetch schedule'}</button><input name="confirmation" placeholder="Booking number / PNR"/><input name="airline" placeholder="Airline"/><select name="country"><option>Malaysia</option><option>Singapore</option><option>Indonesia</option></select><input name="originCode" required placeholder="Origin IATA e.g. DXB"/><input name="departureAirport" placeholder="Departure airport"/><input name="departureTime" type="datetime-local" required/><input name="destinationCode" required placeholder="Destination IATA e.g. KUL"/><input name="arrivalAirport" placeholder="Arrival airport"/><input name="arrivalTime" type="datetime-local"/></div>{message&&<div className="notice">{message}</div>}{lookup&&<div className="lookup-preview"><CheckCircleIcon/><div><b>Schedule loaded</b><span>{String((lookup as any).departure?.airport?.name || '')} → {String((lookup as any).arrival?.airport?.name || '')}</span></div></div>}<button className="primary"><PlusIcon/> Save flight & reminder</button></form>;
}

function AddModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [kind, setKind] = useState<'itinerary' | 'booking'>('itinerary');
  async function submit(formData: FormData) { const id = crypto.randomUUID(); if (kind === 'itinerary') await put('itinerary', { id, title: String(formData.get('title')), location: String(formData.get('location')), date: String(formData.get('date')), time: String(formData.get('time')), country: String(formData.get('country')) as CountryName, notes: String(formData.get('notes') || '') }); else await put('bookings', { id, type: String(formData.get('type')) as Booking['type'], title: String(formData.get('title')), subtitle: String(formData.get('location')), date: String(formData.get('date')), country: String(formData.get('country')) as CountryName, confirmation: String(formData.get('confirmation') || '') }); onSaved(); }
  return <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}><motion.form className="modal glass" action={submit} onMouseDown={e => e.stopPropagation()}><div className="panel-title"><h3>Add to trip</h3><button type="button" onClick={onClose}>×</button></div><div className="segmented"><button type="button" className={kind === 'itinerary' ? 'active' : ''} onClick={() => setKind('itinerary')}>Plan</button><button type="button" className={kind === 'booking' ? 'active' : ''} onClick={() => setKind('booking')}>Booking</button></div>{kind === 'booking' && <select name="type"><option value="flight">Flight</option><option value="hotel">Hotel</option><option value="transfer">Transfer</option><option value="activity">Activity</option></select>}<input name="title" required placeholder="Title"/><input name="location" required placeholder="Location or details"/><div className="form-row"><select name="country"><option>Malaysia</option><option>Singapore</option><option>Indonesia</option></select><input name="date" type="date" min="2026-08-21" max="2026-09-03" required/></div>{kind === 'itinerary' ? <input name="time" type="time" required/> : <input name="confirmation" placeholder="Booking number"/>}<textarea name="notes" placeholder="Notes"/><button className="primary">Save offline</button></motion.form></motion.div>;
}

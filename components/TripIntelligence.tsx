'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowPathIcon, BanknotesIcon, BoltIcon, CalendarDaysIcon, CameraIcon,
  CheckBadgeIcon, CheckCircleIcon, ClockIcon, CloudIcon, CurrencyDollarIcon,
  HeartIcon, MapPinIcon, MoonIcon, PaperAirplaneIcon, PlusIcon, ShareIcon,
  ShieldCheckIcon, SparklesIcon, SunIcon, TrophyIcon, UserGroupIcon
} from '@heroicons/react/24/outline';
import { Attraction, Booking, ChecklistItem, CountryName, Expense, HotelStay, ItineraryItem, put } from '@/lib/db';

type Props = {
  attractions: Attraction[];
  bookings: Booking[];
  hotels: HotelStay[];
  itinerary: ItineraryItem[];
  expenses: Expense[];
  checklist: ChecklistItem[];
  onRefresh: () => Promise<void> | void;
  onOpenExplorer: (country: CountryName) => void;
  onOpenItinerary: () => void;
};

type Weather = { temperature: number; code: number; label: string; isRain: boolean };
type Mode = 'Family' | 'Couple' | 'Balanced';

const countryDates: Record<CountryName, string[]> = {
  Malaysia: ['2026-08-22','2026-08-23','2026-08-24','2026-08-25'],
  Singapore: ['2026-08-26','2026-08-27','2026-08-28','2026-08-29'],
  Indonesia: ['2026-08-30','2026-08-31','2026-09-01','2026-09-02'],
};
const cityCoords: Record<CountryName, [number, number]> = {
  Malaysia: [3.139, 101.6869], Singapore: [1.3521, 103.8198], Indonesia: [-6.2088, 106.8456]
};
const budgets: Record<CountryName, number> = { Malaysia: 3500, Singapore: 5000, Indonesia: 3000 };
const weatherLabel = (code: number) => code === 0 ? 'Clear' : code <= 3 ? 'Partly cloudy' : code <= 67 ? 'Rain likely' : code <= 77 ? 'Showers' : 'Storm risk';
const fmt = (n: number) => Number.isFinite(n) ? Math.round(n).toLocaleString() : '0';
const validHotel = (h?: HotelStay) => h && h.address && !h.address.toLowerCase().startsWith('add hotel');

export default function TripIntelligence(props: Props) {
  const { attractions, bookings, hotels, itinerary, expenses, checklist, onRefresh, onOpenExplorer, onOpenItinerary } = props;
  const [country, setCountry] = useState<CountryName>('Malaysia');
  const [mode, setMode] = useState<Mode>('Balanced');
  const [weather, setWeather] = useState<Weather | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [photoTasks, setPhotoTasks] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try { setPhotoTasks(JSON.parse(localStorage.getItem('tripdeck-photo-tasks') || '{}')); } catch { /* ignore */ }
  }, []);
  const setPhoto = (key: string, value: boolean) => {
    const next = { ...photoTasks, [key]: value }; setPhotoTasks(next); localStorage.setItem('tripdeck-photo-tasks', JSON.stringify(next));
  };

  const activeHotel = hotels.find(h => h.country === country && validHotel(h));
  const countryAttractions = attractions.filter(a => a.country === country);
  const recommended = useMemo(() => countryAttractions.filter(a => {
    if (mode === 'Family' && !a.familyFriendly) return false;
    if (mode === 'Couple') return /view|garden|cruise|sky|island|bay|tower|rooftop|park/i.test(`${a.name} ${a.category} ${a.description}`);
    return true;
  }).sort((a,b) => Number(b.saved) + Number(b.wishlist) - Number(a.saved) - Number(a.wishlist)).slice(0, 6), [countryAttractions, mode]);

  const spent = expenses.filter(e => e.country === country).reduce((s,e) => s + e.amount, 0);
  const budget = budgets[country];
  const budgetPercent = Math.min(100, Math.round(spent / budget * 100));
  const nextFlight = [...bookings].filter(b => b.type === 'flight' && +new Date(b.date) > Date.now()).sort((a,b) => +new Date(a.date) - +new Date(b.date))[0];
  const daysToFlight = nextFlight ? Math.max(0, Math.ceil((+new Date(nextFlight.date)-Date.now())/86400000)) : null;
  const checklistDone = checklist.filter(c => c.done).length;
  const readiness = Math.round((
    (validHotel(activeHotel) ? 25 : 0) +
    (bookings.filter(b=>b.country===country).length ? 20 : 0) +
    (itinerary.filter(i=>i.country===country).length ? 20 : 0) +
    (checklist.length ? checklistDone/checklist.length*25 : 0) +
    (countryAttractions.some(a=>a.saved||a.wishlist) ? 10 : 0)
  ));

  const badges = [
    { name: 'Planner', earned: itinerary.length >= 3, icon: <CalendarDaysIcon/> },
    { name: 'Metro Master', earned: itinerary.some(i => /metro|mrt|transit/i.test(`${i.notes} ${i.location}`)), icon: <MapPinIcon/> },
    { name: 'Culture Hunter', earned: attractions.filter(a=>a.visited && /culture|museum|heritage/i.test(a.category)).length >= 2, icon: <TrophyIcon/> },
    { name: 'Budget Keeper', earned: spent > 0 && spent <= budget, icon: <BanknotesIcon/> },
    { name: 'Ready to Go', earned: readiness >= 80, icon: <CheckBadgeIcon/> },
  ];

  async function loadWeather() {
    setWeatherLoading(true);
    try {
      const [lat, lon] = cityCoords[country];
      const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=auto`);
      if (!r.ok) throw new Error('Weather unavailable');
      const data = await r.json(); const code = Number(data.current.weather_code);
      setWeather({ temperature: Number(data.current.temperature_2m), code, label: weatherLabel(code), isRain: code >= 51 });
    } catch { setWeather(null); }
    finally { setWeatherLoading(false); }
  }

  async function generateDay() {
    setGenerating(true);
    const date = countryDates[country].find(d => !itinerary.some(i => i.country === country && i.date === d)) || countryDates[country][0];
    let picks = [...recommended];
    if (weather?.isRain) picks = picks.sort((a,b)=>Number(b.indoor)-Number(a.indoor));
    const slots = [
      { period: 'Morning' as const, time: '09:00' },
      { period: 'Afternoon' as const, time: '14:00' },
      { period: 'Evening' as const, time: '18:30' },
    ];
    for (const [index, attraction] of picks.slice(0,3).entries()) {
      await put('itinerary', {
        id: crypto.randomUUID(), title: attraction.name, location: attraction.city, date,
        time: slots[index].time, country, period: slots[index].period, attractionId: attraction.id,
        notes: `${mode} plan${weather ? ` · ${weather.label}` : ''} · ${attraction.duration || 'Flexible visit'}${activeHotel ? ` · Start from ${activeHotel.name}` : ''}`
      });
    }
    await onRefresh(); setGenerating(false); onOpenItinerary();
  }

  async function saveReceipt(formData: FormData) {
    await put('expenses', {
      id: crypto.randomUUID(), title: String(formData.get('merchant') || 'Receipt'),
      amount: Number(formData.get('amount') || 0), currency: String(formData.get('currency') || 'AED'),
      country, category: String(formData.get('category') || 'Other') as Expense['category'],
      paidBy: 'Usama', date: String(formData.get('date') || new Date().toISOString().slice(0,10)),
      notes: `Receipt: ${String((formData.get('receipt') as File)?.name || 'manual entry')}`
    });
    await onRefresh(); setReceiptOpen(false);
  }

  async function shareTrip() {
    const todayPlans = itinerary.filter(i=>i.country===country).sort((a,b)=>`${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)).slice(0,5);
    const text = `${country} TripDeck plan\n${todayPlans.map(i=>`${i.date} ${i.time} — ${i.title}`).join('\n') || 'Planning in progress'}`;
    if (navigator.share) await navigator.share({ title: 'Our TripDeck plan', text });
    else { await navigator.clipboard.writeText(text); alert('Trip summary copied.'); }
  }

  const photoList = recommended.slice(0,3).flatMap(a => [
    { key: `${a.id}-entrance`, label: `${a.name}: entrance` },
    { key: `${a.id}-group`, label: `${a.name}: group photo` },
  ]).slice(0,6);

  return <section className="intel-shell">
    <div className="intel-hero glass">
      <div><span className="eyebrow">TRIP INTELLIGENCE</span><h2>Your travel operating system</h2><p>Live context, smart planning and trip readiness—built on top of your existing TripDeck data.</p></div>
      <div className="intel-hero-actions"><select value={country} onChange={e=>setCountry(e.target.value as CountryName)}><option>Malaysia</option><option>Singapore</option><option>Indonesia</option></select><button className="secondary" onClick={shareTrip}><ShareIcon/> Share plan</button></div>
    </div>

    <div className="intel-kpis">
      <article className="intel-kpi glass"><div className="kpi-ring" style={{'--score':`${readiness * 3.6}deg`} as React.CSSProperties}><b>{readiness}%</b></div><div><span>Travel readiness</span><strong>{readiness >= 80 ? 'Ready to go' : readiness >= 55 ? 'Nearly ready' : 'Needs attention'}</strong><small>{checklistDone}/{checklist.length} checklist items done</small></div></article>
      <article className="intel-kpi glass"><PaperAirplaneIcon/><div><span>Next flight</span><strong>{daysToFlight === null ? 'No upcoming flight' : `${daysToFlight} days`}</strong><small>{nextFlight?.title || 'Add a flight in Bookings'}</small></div></article>
      <article className="intel-kpi glass"><CurrencyDollarIcon/><div><span>{country} budget health</span><strong>{fmt(spent)} / {fmt(budget)}</strong><div className="mini-progress"><i style={{width:`${budgetPercent}%`}}/></div><small>{budgetPercent <= 75 ? 'Spending is on track' : budgetPercent <= 100 ? 'Watch the remaining budget' : 'Budget exceeded'}</small></div></article>
    </div>

    <div className="intel-grid">
      <motion.article className="intel-card glass smart-planner" initial={{opacity:0,y:18}} animate={{opacity:1,y:0}}>
        <div className="panel-title"><div><span className="eyebrow">SMART DAY</span><h3>Weather-aware planner</h3></div><SparklesIcon/></div>
        <div className="mode-switch">{(['Balanced','Family','Couple'] as Mode[]).map(m=><button key={m} className={mode===m?'active':''} onClick={()=>setMode(m)}>{m==='Family'?<UserGroupIcon/>:m==='Couple'?<HeartIcon/>:<SparklesIcon/>}{m}</button>)}</div>
        <div className="weather-strip">{weather ? <><span>{weather.isRain?<CloudIcon/>:<SunIcon/>}</span><div><b>{weather.temperature}°C · {weather.label}</b><small>{weather.isRain?'Indoor places will be prioritised.':'Outdoor and skyline stops are suitable.'}</small></div></> : <><CloudIcon/><div><b>Check current weather</b><small>Open-Meteo is used without an API key.</small></div></>}<button onClick={loadWeather} disabled={weatherLoading}>{weatherLoading?<ArrowPathIcon className="spin"/>:'Refresh'}</button></div>
        <div className="planner-preview">{recommended.slice(0,3).map((a,i)=><div key={a.id}><span>{['09:00','14:00','18:30'][i]}</span><i/><div><b>{a.name}</b><small>{a.city} · {a.duration || 'Flexible'}</small></div></div>)}</div>
        <button className="primary full" onClick={generateDay} disabled={generating || !recommended.length}>{generating?<ArrowPathIcon className="spin"/>:<BoltIcon/>} Generate and add day</button>
      </motion.article>

      <article className="intel-card glass">
        <div className="panel-title"><div><span className="eyebrow">CONTEXT</span><h3>Hotel & commute command</h3></div><MapPinIcon/></div>
        {activeHotel ? <div className="hotel-context"><CheckCircleIcon/><div><b>{activeHotel.name}</b><span>{activeHotel.address}</span></div></div> : <div className="intel-empty"><MapPinIcon/><b>Add your {country} hotel</b><span>Distance, fare and route estimates activate automatically in Country Explorer.</span></div>}
        <div className="commute-tip"><b>{country === 'Malaysia' ? 'Rapid KL + Touch ’n Go' : country === 'Singapore' ? 'MRT/bus + contactless card' : 'TransJakarta/MRT + JakLingko'}</b><p>{country === 'Malaysia' ? 'Use rail for central KL and a coach + Awana SkyWay for Genting.' : country === 'Singapore' ? 'Tap a contactless bank card; fares are distance-based and usually cheapest by MRT/bus.' : 'Use TransJakarta for broad coverage, MRT for the central corridor, then an app bike/taxi for the last mile.'}</p></div>
        <button className="secondary full" onClick={()=>onOpenExplorer(country)}>Open routes & fares</button>
      </article>

      <article className="intel-card glass">
        <div className="panel-title"><div><span className="eyebrow">MOMENTS</span><h3>Photo mission</h3></div><CameraIcon/></div>
        <div className="photo-list">{photoList.map(x=><label key={x.key} className={photoTasks[x.key]?'done':''}><input type="checkbox" checked={!!photoTasks[x.key]} onChange={e=>setPhoto(x.key,e.target.checked)}/><span>{x.label}</span></label>)}</div>
        {!photoList.length&&<div className="intel-empty"><CameraIcon/><span>Save attractions to create photo missions.</span></div>}
      </article>

      <article className="intel-card glass">
        <div className="panel-title"><div><span className="eyebrow">ACHIEVEMENTS</span><h3>Travel badges</h3></div><TrophyIcon/></div>
        <div className="badge-grid">{badges.map(b=><div key={b.name} className={b.earned?'earned':''}>{b.icon}<span>{b.name}</span><small>{b.earned?'Unlocked':'Locked'}</small></div>)}</div>
      </article>

      <article className="intel-card glass">
        <div className="panel-title"><div><span className="eyebrow">DAILY RHYTHM</span><h3>Prayer & wellbeing</h3></div><MoonIcon/></div>
        <p className="intel-copy">Keep the itinerary realistic with rest, prayer, hydration and meal breaks. Live prayer times open using your selected city.</p>
        <div className="quick-links"><a target="_blank" rel="noreferrer" href={`https://www.google.com/maps/search/${encodeURIComponent(`mosque near ${activeHotel?.address || (country==='Malaysia'?'Kuala Lumpur':country==='Singapore'?'Singapore':'Jakarta')}`)}`}>Nearest mosque</a><a target="_blank" rel="noreferrer" href={`https://www.google.com/search?q=${encodeURIComponent(`${country==='Indonesia'?'Jakarta':country==='Malaysia'?'Kuala Lumpur':'Singapore'} prayer times today`)}`}>Prayer times</a><a target="_blank" rel="noreferrer" href={`https://www.google.com/maps/search/${encodeURIComponent(`halal food near ${activeHotel?.address || country}`)}`}>Halal food</a></div>
        <button className="secondary full" onClick={async()=>{ const d=countryDates[country][0]; await put('itinerary',{id:crypto.randomUUID(),title:'Prayer & rest break',location:activeHotel?.city||country,date:d,time:'13:00',country,period:'Afternoon',notes:'Flexible prayer, hydration and rest buffer'}); await onRefresh(); onOpenItinerary(); }}><PlusIcon/> Add wellbeing break</button>
      </article>

      <article className="intel-card glass">
        <div className="panel-title"><div><span className="eyebrow">SMART CAPTURE</span><h3>Receipt to expense</h3></div><BanknotesIcon/></div>
        <p className="intel-copy">Attach a receipt photo and save the key details directly into the existing Expenses section.</p>
        <button className="primary full" onClick={()=>setReceiptOpen(v=>!v)}><CameraIcon/> {receiptOpen?'Close scanner':'Add receipt'}</button>
        {receiptOpen&&<form action={saveReceipt} className="receipt-form"><input name="receipt" type="file" accept="image/*" capture="environment"/><input name="merchant" required placeholder="Merchant or expense"/><div><input name="amount" type="number" step="0.01" required placeholder="Amount"/><select name="currency"><option>AED</option><option>MYR</option><option>SGD</option><option>IDR</option></select></div><div><select name="category"><option>Food</option><option>Transport</option><option>Attraction</option><option>Shopping</option><option>Hotel</option><option>Other</option></select><input name="date" type="date" defaultValue={new Date().toISOString().slice(0,10)}/></div><button className="secondary">Save expense</button></form>}
      </article>
    </div>

    <div className="intel-card glass hidden-gems">
      <div className="panel-title"><div><span className="eyebrow">DISCOVER DIFFERENTLY</span><h3>{mode === 'Couple' ? 'Couple picks & sunset moments' : mode === 'Family' ? 'Family-friendly picks' : 'Hidden gems and local favourites'}</h3></div><SparklesIcon/></div>
      <div className="gem-grid">{recommended.slice(0,6).map(a=><button key={a.id} onClick={()=>onOpenExplorer(a.country)}><span>{a.category}</span><b>{a.name}</b><small>{a.bestTime || a.city}</small></button>)}</div>
    </div>
  </section>;
}

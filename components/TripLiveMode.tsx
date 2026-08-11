'use client';

import { useMemo, useState } from 'react';
import {
  ArrowDownTrayIcon, ArrowTopRightOnSquareIcon, BuildingOffice2Icon, CalendarDaysIcon,
  ClockIcon, ClipboardDocumentIcon, ExclamationTriangleIcon, LifebuoyIcon, MapPinIcon,
  PaperAirplaneIcon, ShieldCheckIcon, SparklesIcon, UserGroupIcon, XMarkIcon
} from '@heroicons/react/24/outline';
import type { Booking, CountryName, HotelStay, ItineraryItem } from '@/lib/db';

type Props = {
  bookings: Booking[];
  itinerary: ItineraryItem[];
  hotels: HotelStay[];
  now: number;
  onClose: () => void;
  onOpenBookings: () => void;
  onOpenItinerary: () => void;
  onOpenDocuments: () => void;
  onOpenStays: () => void;
};

const TZ: Record<CountryName, string> = { Malaysia: 'Asia/Kuala_Lumpur', Singapore: 'Asia/Singapore', Indonesia: 'Asia/Jakarta' };
const COUNTRY_CITY: Record<CountryName, string> = { Malaysia: 'Kuala Lumpur', Singapore: 'Singapore', Indonesia: 'Jakarta' };
const COUNTRY_EMERGENCY: Record<CountryName, { emergency: string; ambulance: string; note: string }> = {
  Malaysia: { emergency: '999', ambulance: '999', note: 'Police / ambulance / fire' },
  Singapore: { emergency: '999', ambulance: '995', note: '999 police · 995 ambulance/fire' },
  Indonesia: { emergency: '112', ambulance: '118 / 119', note: '112 general emergency where supported' },
};
const GROUP: Record<CountryName, number> = { Malaysia: 5, Singapore: 6, Indonesia: 5 };

function minutesOf(time = '00:00') {
  const [h, m] = time.slice(0,5).split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}
function dateTime(item: ItineraryItem) { return new Date(`${item.date}T${item.time || '00:00'}`).getTime(); }
function compactCountdown(ms: number) {
  if (ms <= 0) return 'now';
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60), rem = mins % 60;
  if (hrs < 24) return `${hrs}h ${rem}m`;
  return `${Math.floor(hrs/24)}d ${hrs%24}h`;
}
function currentCountry(now: number): CountryName {
  const d = new Date(now);
  const iso = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  if (iso >= '2026-08-30' && iso <= '2026-09-04') return 'Indonesia';
  if (iso >= '2026-08-26' && iso < '2026-08-30') return 'Singapore';
  return 'Malaysia';
}

export default function TripLiveMode({ bookings, itinerary, hotels, now, onClose, onOpenBookings, onOpenItinerary, onOpenDocuments, onOpenStays }: Props) {
  const [rescue, setRescue] = useState(false);
  const country = currentCountry(now);
  const zone = TZ[country];
  const localTime = new Intl.DateTimeFormat('en', { timeZone: zone, hour:'2-digit', minute:'2-digit', second:'2-digit' }).format(new Date(now));
  const localDate = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year:'numeric', month:'2-digit', day:'2-digit' }).format(new Date(now));
  const localDateLabel = new Intl.DateTimeFormat('en', { timeZone: zone, weekday:'long', day:'numeric', month:'short' }).format(new Date(now));

  const futurePlans = useMemo(() => itinerary.filter(i => dateTime(i) >= now - 30*60000).sort((a,b)=>dateTime(a)-dateTime(b)), [itinerary, now]);
  const nextPlan = futurePlans[0];
  const nextFlight = useMemo(() => bookings.filter(b => b.type==='flight' && new Date(b.date).getTime() >= now - 6*3600000).sort((a,b)=>+new Date(a.date)-+new Date(b.date))[0], [bookings, now]);
  const activeHotel = hotels.find(h => h.country === country);

  const leaveBy = nextPlan ? dateTime(nextPlan) - Math.max(0, nextPlan.commuteMinutes || 0) * 60000 - 10*60000 : null;
  const leaveState = leaveBy == null ? null : leaveBy <= now ? 'LEAVE NOW' : `Leave in ${compactCountdown(leaveBy-now)}`;

  const radar = useMemo(() => {
    const sorted = [...itinerary].sort((a,b)=>`${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
    const issues: { id:string; title:string; detail:string; severity:'tight'|'clash' }[] = [];
    for (let i=1;i<sorted.length;i++) {
      const prev=sorted[i-1], curr=sorted[i];
      if (prev.date!==curr.date || prev.country!==curr.country) continue;
      const gap=minutesOf(curr.time)-minutesOf(prev.time);
      const needed=Math.max(0, curr.commuteMinutes || 0);
      if (gap < 0) issues.push({id:`${prev.id}-${curr.id}`,title:'Time clash',detail:`${prev.title} and ${curr.title} overlap.`,severity:'clash'});
      else if (needed && gap < needed + 20) issues.push({id:`${prev.id}-${curr.id}`,title:'Tight transfer',detail:`Only ${gap} min between stops; commute is ~${needed} min.`,severity:'tight'});
    }
    return issues.slice(0,4);
  }, [itinerary]);

  const dayPlans = itinerary.filter(i => i.date === localDate && i.country === country).sort((a,b)=>iTime(a)-iTime(b));
  function iTime(i: ItineraryItem){ return minutesOf(i.time); }
  const totalCommute = dayPlans.reduce((s,i)=>s+(i.commuteMinutes||0),0);
  const dayLoad = dayPlans.length >= 6 || totalCommute > 180 ? 'Packed' : dayPlans.length >= 4 || totalCommute > 90 ? 'Balanced' : 'Easy';

  const pocketText = [
    `TRIP DECK — ${country.toUpperCase()} POCKET BRIEF`,
    `${localDateLabel} · ${localTime}`,
    '',
    nextFlight ? `NEXT FLIGHT: ${nextFlight.departureAirportCode || ''} → ${nextFlight.arrivalAirportCode || ''} · ${nextFlight.flightNumber || nextFlight.airline || ''} · ${new Date(nextFlight.date).toLocaleString()} · Terminal ${nextFlight.terminal || '—'} · Gate ${nextFlight.gate || '—'} · Status ${nextFlight.status || 'EXPECTED'}` : 'NEXT FLIGHT: not saved',
    activeHotel ? `HOTEL: ${activeHotel.name} · ${activeHotel.address} · ${activeHotel.phone || 'no phone saved'}` : 'HOTEL: not saved',
    nextPlan ? `NEXT PLAN: ${nextPlan.time} · ${nextPlan.title} · ${nextPlan.location}${nextPlan.commuteMinutes ? ` · ~${nextPlan.commuteMinutes} min commute` : ''}` : 'NEXT PLAN: none',
    `GROUP: ${GROUP[country]} travelers`,
    `EMERGENCY: ${COUNTRY_EMERGENCY[country].note} · ${COUNTRY_EMERGENCY[country].emergency}`,
  ].join('\n');

  async function copyPocket() {
    try { await navigator.clipboard.writeText(pocketText); }
    catch { /* best-effort */ }
  }
  function downloadPocket() {
    const url=URL.createObjectURL(new Blob([pocketText],{type:'text/plain;charset=utf-8'}));
    const a=document.createElement('a'); a.href=url; a.download=`trip-deck-${country.toLowerCase()}-pocket-brief.txt`; a.click(); URL.revokeObjectURL(url);
  }

  return <div className="live-mode-backdrop" role="dialog" aria-modal="true" aria-label="Trip Deck Live Mode">
    <div className="live-mode-shell">
      <header className="live-mode-header">
        <div><span className="live-dot"/><span className="eyebrow">TRIP DECK LIVE</span><h2>{country} · {COUNTRY_CITY[country]}</h2></div>
        <div className="live-time"><b>{localTime}</b><span>{localDateLabel}</span></div>
        <button className="live-close" onClick={onClose} aria-label="Close live mode"><XMarkIcon/></button>
      </header>

      <section className="live-now-grid">
        <article className="live-primary-card">
          <div className="live-card-label"><SparklesIcon/> WHAT NOW?</div>
          {nextPlan ? <><span className="live-kicker">NEXT ACTIVITY · {compactCountdown(dateTime(nextPlan)-now)}</span><h3>{nextPlan.title}</h3><p><MapPinIcon/>{nextPlan.location}</p><div className="live-command-row"><div><span>START</span><b>{nextPlan.time}</b></div><div><span>COMMUTE</span><b>{nextPlan.commuteMinutes ? `~${nextPlan.commuteMinutes} min` : 'Not estimated'}</b></div><div className={leaveBy && leaveBy <= now ? 'danger' : ''}><span>DEPARTURE CUE</span><b>{leaveState || '—'}</b></div></div><button className="live-cta" onClick={onOpenItinerary}><CalendarDaysIcon/> Open today’s timeline</button></> : <><span className="live-kicker">DAY OPEN</span><h3>No upcoming plan</h3><p>Your itinerary is clear. Add the next stop when you are ready.</p><button className="live-cta" onClick={onOpenItinerary}>Open itinerary</button></>}
        </article>

        <article className="live-flight-card">
          <div className="live-card-label"><PaperAirplaneIcon/> NEXT FLIGHT</div>
          {nextFlight ? <><div className="live-route"><b>{nextFlight.departureAirportCode || '---'}</b><span>→</span><b>{nextFlight.arrivalAirportCode || '---'}</b></div><strong>{nextFlight.flightNumber || nextFlight.airline || 'Flight'} · {compactCountdown(+new Date(nextFlight.date)-now)}</strong><div className="live-flight-meta"><span>Terminal <b>{nextFlight.terminal || '—'}</b></span><span>Gate <b>{nextFlight.gate || '—'}</b></span><span>Status <b>{nextFlight.status || 'EXPECTED'}</b></span></div><button className="live-secondary" onClick={onOpenBookings}>Open boarding details</button></> : <p>No upcoming flight saved.</p>}
        </article>
      </section>

      <section className="live-insight-grid">
        <article><div className="live-card-label"><ClockIcon/> DAY LOAD</div><b className={`load-${dayLoad.toLowerCase()}`}>{dayLoad}</b><p>{dayPlans.length} stops · ~{totalCommute} min planned commute</p></article>
        <article><div className="live-card-label"><UserGroupIcon/> GROUP</div><b>{GROUP[country]} travelers</b><p>Country-aware passenger and expense split</p></article>
        <article><div className="live-card-label"><BuildingOffice2Icon/> HOME BASE</div><b>{activeHotel?.name || 'Hotel not saved'}</b><p>{activeHotel?.address || 'Add the hotel address for instant rescue directions.'}</p></article>
      </section>

      <section className="live-radar">
        <div className="live-section-head"><div><span className="eyebrow">SCHEDULE RADAR</span><h3>{radar.length ? `${radar.length} timing risk${radar.length===1?'':'s'} detected` : 'Timeline looks clean'}</h3></div><ShieldCheckIcon/></div>
        {radar.length ? <div className="radar-list">{radar.map(r=><div key={r.id} className={`radar-item ${r.severity}`}><ExclamationTriangleIcon/><div><b>{r.title}</b><span>{r.detail}</span></div></div>)}</div> : <p className="live-muted">Trip Deck checked your itinerary spacing and commute estimates. No obvious clashes were found.</p>}
      </section>

      <section className="live-actions-grid">
        <button onClick={() => setRescue(v=>!v)} className="rescue-button"><LifebuoyIcon/><div><b>Rescue mode</b><span>Emergency numbers, hotel and documents</span></div></button>
        <button onClick={copyPocket}><ClipboardDocumentIcon/><div><b>Copy pocket brief</b><span>Flight + hotel + next plan + emergency</span></div></button>
        <button onClick={downloadPocket}><ArrowDownTrayIcon/><div><b>Offline pocket brief</b><span>Download a tiny text backup</span></div></button>
        {activeHotel?.address ? <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activeHotel.address)}`} target="_blank" rel="noreferrer"><MapPinIcon/><div><b>Take me to hotel</b><span>Open the saved stay in Maps</span></div><ArrowTopRightOnSquareIcon/></a> : <button onClick={onOpenStays}><MapPinIcon/><div><b>Add hotel address</b><span>Unlock one-tap arrival directions</span></div></button>}
      </section>

      {rescue && <section className="rescue-panel">
        <div className="live-section-head"><div><span className="eyebrow">TRIP RESCUE</span><h3>Everything essential, one screen</h3></div><LifebuoyIcon/></div>
        <div className="rescue-grid"><div><span>LOCAL EMERGENCY</span><b>{COUNTRY_EMERGENCY[country].emergency}</b><small>{COUNTRY_EMERGENCY[country].note}</small></div><div><span>AMBULANCE / FIRE</span><b>{COUNTRY_EMERGENCY[country].ambulance}</b><small>{country}</small></div><div><span>HOTEL</span><b>{activeHotel?.name || 'Not saved'}</b><small>{activeHotel?.phone || activeHotel?.address || 'Add hotel contact'}</small></div><div><span>NEXT FLIGHT</span><b>{nextFlight?.flightNumber || 'Not saved'}</b><small>{nextFlight ? `${nextFlight.departureAirportCode || ''} → ${nextFlight.arrivalAirportCode || ''}` : 'Open Bookings'}</small></div></div>
        <div className="rescue-actions"><button onClick={onOpenDocuments}><ShieldCheckIcon/> Open private documents</button><button onClick={onOpenStays}><BuildingOffice2Icon/> Open stay details</button>{activeHotel?.address&&<a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activeHotel.address)}`} target="_blank" rel="noreferrer"><MapPinIcon/> Hotel directions</a>}</div>
      </section>}
    </div>
  </div>;
}

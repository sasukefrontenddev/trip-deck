'use client';

import { useMemo, useState } from 'react';
import {
  ArrowDownTrayIcon, ArrowTopRightOnSquareIcon, BuildingOffice2Icon, CalendarDaysIcon,
  CheckCircleIcon, ClockIcon, DocumentTextIcon, ExclamationTriangleIcon, GlobeAltIcon,
  LifebuoyIcon, MapPinIcon, PaperAirplaneIcon, ShieldCheckIcon, SparklesIcon,
  UserGroupIcon, XMarkIcon, BoltIcon, ChevronRightIcon, MapIcon
} from '@heroicons/react/24/outline';
import type { Booking, CountryName, Expense, HotelStay, ItineraryItem } from '@/lib/db';

type Props = {
  bookings: Booking[];
  itinerary: ItineraryItem[];
  hotels: HotelStay[];
  expenses: Expense[];
  now: number;
  onClose: () => void;
  onOpenBookings: () => void;
  onOpenItinerary: () => void;
  onOpenDocuments: () => void;
  onOpenStays: () => void;
};

type JourneyPlace = 'UAE' | CountryName;
type JourneyPhase = 'pretrip' | 'airport' | 'boarding' | 'inflight' | 'arrival' | 'city' | 'complete';

const TRIP_START = new Date('2026-08-21T00:00:00+04:00').getTime();
const TRIP_END = new Date('2026-09-05T00:00:00+04:00').getTime();
const ROUTE = [
  { code: 'SHJ', label: 'Sharjah', flag: '🇦🇪' },
  { code: 'KUL', label: 'Kuala Lumpur', flag: '🇲🇾' },
  { code: 'SIN', label: 'Singapore', flag: '🇸🇬' },
  { code: 'CGK', label: 'Jakarta', flag: '🇮🇩' },
  { code: 'AUH', label: 'Abu Dhabi', flag: '🇦🇪' },
] as const;
const TZ: Record<JourneyPlace, string> = { UAE: 'Asia/Dubai', Malaysia: 'Asia/Kuala_Lumpur', Singapore: 'Asia/Singapore', Indonesia: 'Asia/Jakarta' };
const CITY: Record<JourneyPlace, string> = { UAE: 'United Arab Emirates', Malaysia: 'Kuala Lumpur', Singapore: 'Singapore', Indonesia: 'Jakarta' };
const EMERGENCY: Record<CountryName, { emergency: string; ambulance: string; note: string }> = {
  Malaysia: { emergency: '999', ambulance: '999', note: 'Police / ambulance / fire' },
  Singapore: { emergency: '999', ambulance: '995', note: '999 police · 995 ambulance/fire' },
  Indonesia: { emergency: '112', ambulance: '118 / 119', note: '112 general emergency where supported' },
};
const GROUP: Record<CountryName, number> = { Malaysia: 5, Singapore: 6, Indonesia: 5 };

function ms(value?: string) { return value ? new Date(value).getTime() : NaN; }
function minutesOf(time = '00:00') { const [h,m]=time.slice(0,5).split(':').map(Number); return (h||0)*60+(m||0); }
function itemMs(item: ItineraryItem) { return new Date(`${item.date}T${item.time || '00:00'}`).getTime(); }
function countdown(value: number) {
  if (value <= 0) return 'now';
  const minutes=Math.floor(value/60000); if(minutes<60) return `${minutes} min`;
  const hours=Math.floor(minutes/60), rem=minutes%60; if(hours<24) return `${hours}h ${rem}m`;
  return `${Math.floor(hours/24)}d ${hours%24}h`;
}
function clockCountdown(value: number) {
  const total=Math.max(0,Math.floor(value/1000)); const d=Math.floor(total/86400), h=Math.floor((total%86400)/3600), m=Math.floor((total%3600)/60), s=total%60;
  return { d,h,m,s };
}
function journeyPlace(now: number): JourneyPlace {
  const date=new Date(now).toISOString().slice(0,10);
  if(date<'2026-08-22') return 'UAE';
  if(date<'2026-08-26') return 'Malaysia';
  if(date<'2026-08-30') return 'Singapore';
  if(date<'2026-09-04') return 'Indonesia';
  return 'UAE';
}
function journeyCountry(place: JourneyPlace): CountryName | null { return place==='UAE' ? null : place; }
function flightStatus(booking?: Booking) { return String(booking?.status || booking?.providerStatus || '').toUpperCase(); }
function isDoneFlight(booking: Booking, now:number) {
  const status=flightStatus(booking);
  return ['LANDED','ARRIVED'].some(x=>status.includes(x)) || (Number.isFinite(ms(booking.arrivalTime)) ? ms(booking.arrivalTime)<now : ms(booking.date)+5*3600000<now);
}
function phaseFor(now:number, activeFlight:Booking|undefined, nextFlight:Booking|undefined): JourneyPhase {
  if(now<TRIP_START) return 'pretrip';
  if(now>=TRIP_END) return 'complete';
  if(activeFlight) return 'inflight';
  if(nextFlight) {
    const until=ms(nextFlight.date)-now; const status=flightStatus(nextFlight);
    if(status.includes('BOARD')) return 'boarding';
    if(until<=90*60000 && until>-2*3600000) return 'boarding';
    if(until<=6*3600000 && until>0) return 'airport';
  }
  return 'city';
}

export default function TripLiveMode({ bookings, itinerary, hotels, expenses, now, onClose, onOpenBookings, onOpenItinerary, onOpenDocuments, onOpenStays }: Props) {
  const [rescue, setRescue] = useState(false);
  const [orbOpen, setOrbOpen] = useState(false);
  const [wrapped, setWrapped] = useState(false);
  const [arrivalGuide, setArrivalGuide] = useState(false);

  const flights=useMemo(()=>bookings.filter(b=>b.type==='flight').sort((a,b)=>ms(a.date)-ms(b.date)),[bookings]);
  const activeFlight=useMemo(()=>flights.find(f=>{
    const dep=ms(f.revisedDepartureTime||f.date); const arr=ms(f.revisedArrivalTime||f.arrivalTime);
    return dep<=now && Number.isFinite(arr) && arr>now && !isDoneFlight(f,now);
  }),[flights,now]);
  const nextFlight=useMemo(()=>flights.find(f=>!isDoneFlight(f,now) && ms(f.date)>=now-90*60000),[flights,now]);
  const completedFlights=useMemo(()=>flights.filter(f=>isDoneFlight(f,now)),[flights,now]);
  const recentlyLanded=useMemo(()=>[...flights].reverse().find(f=>{const arr=ms(f.revisedArrivalTime||f.arrivalTime); return Number.isFinite(arr)&&arr<=now&&arr>=now-4*3600000;}),[flights,now]);
  const basePhase=phaseFor(now,activeFlight,nextFlight);
  const phase:JourneyPhase=basePhase==='city'&&recentlyLanded?'arrival':basePhase;
  const place=journeyPlace(now); const country=journeyCountry(place); const zone=TZ[place];
  const localTime=new Intl.DateTimeFormat('en',{timeZone:zone,hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(new Date(now));
  const localDate=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(now));
  const localDateLabel=new Intl.DateTimeFormat('en',{timeZone:zone,weekday:'long',day:'numeric',month:'short'}).format(new Date(now));
  const activeHotel=country ? hotels.find(h=>h.country===country) : undefined;
  const upcomingPlans=useMemo(()=>itinerary.filter(i=>itemMs(i)>=now-30*60000).sort((a,b)=>itemMs(a)-itemMs(b)),[itinerary,now]);
  const nextPlan=upcomingPlans[0];
  const todayPlans=country ? itinerary.filter(i=>i.country===country&&i.date===localDate).sort((a,b)=>minutesOf(a.time)-minutesOf(b.time)) : [];
  const tomorrowIso=(()=>{const d=new Date(`${localDate}T12:00:00`); d.setDate(d.getDate()+1); return d.toISOString().slice(0,10);})();
  const tomorrowPlans=country ? itinerary.filter(i=>i.country===country&&i.date===tomorrowIso).sort((a,b)=>minutesOf(a.time)-minutesOf(b.time)) : [];
  const totalCommute=todayPlans.reduce((s,i)=>s+(i.commuteMinutes||0),0);
  const dayLoad=todayPlans.length>=6||totalCommute>180?'Packed':todayPlans.length>=4||totalCommute>90?'Balanced':'Easy';
  const leaveBy=nextPlan ? itemMs(nextPlan)-Math.max(0,nextPlan.commuteMinutes||0)*60000-10*60000 : null;
  const leaveState=leaveBy==null?null:leaveBy<=now?'LEAVE NOW':`Leave in ${countdown(leaveBy-now)}`;

  const radar=useMemo(()=>{
    const sorted=[...itinerary].sort((a,b)=>`${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
    const issues:{id:string;title:string;detail:string;severity:'tight'|'clash'}[]=[];
    for(let i=1;i<sorted.length;i++){const prev=sorted[i-1],curr=sorted[i]; if(prev.date!==curr.date||prev.country!==curr.country) continue; const gap=minutesOf(curr.time)-minutesOf(prev.time),needed=Math.max(0,curr.commuteMinutes||0); if(gap<0) issues.push({id:`${prev.id}-${curr.id}`,title:'Time clash',detail:`${prev.title} and ${curr.title} overlap.`,severity:'clash'}); else if(needed&&gap<needed+20) issues.push({id:`${prev.id}-${curr.id}`,title:'Tight transfer',detail:`Only ${gap} min between stops; commute is ~${needed} min.`,severity:'tight'});}
    return issues.slice(0,4);
  },[itinerary]);

  const tripSpend=expenses.reduce((sum,e)=>sum+(e.aedAmount||0),0);
  const uniquePlaces=new Set(itinerary.map(i=>i.location.trim().toLowerCase()).filter(Boolean)).size;
  const plannedDistance=itinerary.reduce((sum,i)=>sum+(i.distanceKm||0),0);
  const routeCompleted=Math.min(4,completedFlights.length);
  const activeFlightIndex=activeFlight?Math.max(0,flights.findIndex(f=>f.id===activeFlight.id)):-1;
  const activeFlightFraction=activeFlight&&activeFlightIndex>=0?Math.max(0,Math.min(1,(now-ms(activeFlight.revisedDepartureTime||activeFlight.date))/Math.max(1,ms(activeFlight.revisedArrivalTime||activeFlight.arrivalTime)-ms(activeFlight.revisedDepartureTime||activeFlight.date)))):0;
  const routeProgress=Math.min(100,((activeFlightIndex>=0?activeFlightIndex+activeFlightFraction:routeCompleted)/4)*100);
  const firstFlight=flights[0]; const pretripTarget=firstFlight?ms(firstFlight.date):new Date('2026-08-21T21:40:00+04:00').getTime();
  const preCountdown=clockCountdown(pretripTarget-now);

  const currentOperationalFlight=activeFlight||nextFlight;
  const flightUntil=currentOperationalFlight?ms(currentOperationalFlight.date)-now:0;
  const airportStage=(()=>{
    if(activeFlight) return 6;
    const status=flightStatus(nextFlight);
    if(status.includes('BOARD')) return 5;
    if(status.includes('GATE CLOSED')) return 5;
    if(flightUntil<=45*60000) return 4;
    if(flightUntil<=90*60000) return 3;
    if(flightUntil<=180*60000) return 2;
    if(flightUntil<=360*60000) return 1;
    return 0;
  })();
  const stages=['HEAD OUT','AIRPORT','CHECK-IN','SECURITY','GATE','BOARD','AIRBORNE'];

  const phaseCopy=(()=>{
    if(phase==='pretrip') return {eyebrow:'JOURNEY MODE ARMED',title:'Your adventure is waiting.',sub:'Trip Deck will transform automatically when travel day begins.'};
    if(phase==='inflight'&&activeFlight) return {eyebrow:'IN FLIGHT',title:`${activeFlight.departureAirportCode||'---'} → ${activeFlight.arrivalAirportCode||'---'}`,sub:'Arrival mode is already preparing your next moves.'};
    if(phase==='boarding') return {eyebrow:'BOARDING PHASE',title:'Everything else can wait.',sub:'Gate, documents and boarding details are now the priority.'};
    if(phase==='airport') return {eyebrow:'TRAVEL DAY',title:'Airport mode is active.',sub:'Trip Deck is reducing the day to only what matters right now.'};
    if(phase==='complete') return {eyebrow:'JOURNEY COMPLETE',title:'Welcome home.',sub:'Your Southeast Asia story is ready to replay.'};
    return {eyebrow:`GOOD ${new Date(now).getHours()<12?'MORNING':new Date(now).getHours()<18?'AFTERNOON':'EVENING'} FROM`,title:country?`${CITY[country]} ${country==='Malaysia'?'🇲🇾':country==='Singapore'?'🇸🇬':'🇮🇩'}`:'Trip Deck',sub:'Your day is already assembled. Just follow the next move.'};
  })();

  const arrivalSteps=[
    'Immigration / entry clearance',
    'Collect baggage',
    country==='Singapore'?'Check SGAC / connectivity':'SIM, cash or connectivity if needed',
    activeHotel?`Transfer → ${activeHotel.name}`:'Open Stay Planner for your hotel',
  ];

  const posterStats=[
    ['DAYS','15'],['COUNTRIES','3'],['FLIGHTS',String(Math.max(completedFlights.length,flights.length))],['PLACES',String(uniquePlaces)],
    ['PLANNED KM',plannedDistance?plannedDistance.toFixed(0):'—'],['SPEND',tripSpend?`AED ${tripSpend.toFixed(0)}`:'—']
  ];

  function generatePoster(){
    const canvas=document.createElement('canvas'); canvas.width=1080; canvas.height=1350; const c=canvas.getContext('2d'); if(!c)return;
    const bg=c.createLinearGradient(0,0,1080,1350); bg.addColorStop(0,'#061525'); bg.addColorStop(.55,'#0a2232'); bg.addColorStop(1,'#07111d'); c.fillStyle=bg;c.fillRect(0,0,1080,1350);
    c.fillStyle='rgba(131,243,199,.08)';c.beginPath();c.arc(920,130,280,0,Math.PI*2);c.fill();
    c.fillStyle='#83f3c7';c.font='700 28px Arial';c.fillText('✦ TRIP DECK',80,95);
    c.fillStyle='#ffffff';c.font='700 72px Arial';c.fillText('SOUTHEAST ASIA',80,205);c.fillText('JOURNEY',80,290);
    c.fillStyle='#8fa9bb';c.font='26px Arial';c.fillText('21 AUG — 4 SEP 2026',80,345);
    const y=505; c.strokeStyle='rgba(131,243,199,.45)';c.lineWidth=5;c.beginPath();c.moveTo(115,y);c.lineTo(965,y);c.stroke();
    ROUTE.forEach((r,i)=>{const x=115+i*(850/4);c.fillStyle=i<=routeCompleted?'#83f3c7':'#284052';c.beginPath();c.arc(x,y,18,0,Math.PI*2);c.fill();c.fillStyle='#fff';c.font='700 26px Arial';c.textAlign='center';c.fillText(r.code,x,y+65);c.fillStyle='#8fa9bb';c.font='18px Arial';c.fillText(r.label,x,y+95);});c.textAlign='left';
    posterStats.forEach((s,i)=>{const col=i%2,row=Math.floor(i/2);const x=80+col*490,yy=690+row*150;c.fillStyle='rgba(255,255,255,.045)';c.fillRect(x,yy,440,115);c.fillStyle='#8fa9bb';c.font='700 18px Arial';c.fillText(s[0],x+24,yy+35);c.fillStyle='#fff';c.font='700 38px Arial';c.fillText(s[1],x+24,yy+83);});
    c.fillStyle='#83f3c7';c.font='700 22px Arial';c.fillText('ONE JOURNEY · ZERO CHAOS',80,1240);c.fillStyle='#6f8798';c.font='18px Arial';c.fillText('Generated by Trip Deck',80,1280);
    canvas.toBlob(blob=>{if(!blob)return;const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='trip-deck-journey-memory.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);},'image/png');
  }

  return <div className="live-mode-backdrop journey-backdrop" role="dialog" aria-modal="true" aria-label="Trip Deck Journey Mode">
    <div className="live-mode-shell journey-shell">
      <header className="live-mode-header journey-header">
        <div><span className="live-dot"/><span className="eyebrow">TRIP DECK · JOURNEY MODE</span><h2>{phaseCopy.title}</h2></div>
        <div className="live-time"><b>{localTime}</b><span>{CITY[place]} · {localDateLabel}</span></div>
        <button className="live-close" onClick={onClose} aria-label="Close Journey Mode"><XMarkIcon/></button>
      </header>

      <section className={`journey-cinematic phase-${phase}`}>
        <div className="journey-cinematic-copy"><span className="journey-phase-label">{phaseCopy.eyebrow}</span><h1>{phaseCopy.title}</h1><p>{phaseCopy.sub}</p></div>
        {phase==='pretrip' ? <div className="journey-big-countdown"><span>DEPARTURE IN</span><div>{[['DAYS',preCountdown.d],['HRS',preCountdown.h],['MIN',preCountdown.m],['SEC',preCountdown.s]].map(([label,value])=><div key={String(label)}><b>{String(value).padStart(2,'0')}</b><small>{label}</small></div>)}</div></div> : phase==='complete' ? <button className="journey-wrapped-cta" onClick={()=>setWrapped(true)}><SparklesIcon/> Open Trip Wrapped</button> : nextPlan ? <div className="journey-now-prompt"><span>YOUR NEXT MOVE</span><b>{nextPlan.title}</b><small>{nextPlan.time} · {nextPlan.location}</small><strong className={leaveBy&&leaveBy<=now?'now':''}>{leaveState||'On schedule'}</strong></div> : null}
      </section>

      <section className="journey-route-card">
        <div className="journey-section-title"><div><span className="eyebrow">LIVE JOURNEY MAP</span><h3>{routeCompleted===4?'Route complete':`Leg ${Math.min(routeCompleted+1,4)} of 4`}</h3></div><span>{Math.round(routeProgress)}%</span></div>
        <div className="journey-route-track"><div className="journey-route-progress" style={{width:`${routeProgress}%`}}/>{ROUTE.map((r,i)=><div className={`journey-route-node ${i<=routeCompleted?'done':''} ${i===routeCompleted?'current':''}`} style={{left:`${i*25}%`}} key={r.code}><span>{i<routeCompleted?<CheckCircleIcon/>:r.flag}</span><b>{r.code}</b><small>{r.label}</small></div>)}{routeCompleted<4&&<div className="journey-plane" style={{left:`calc(${routeProgress}% + 2px)`}}><PaperAirplaneIcon/></div>}</div>
      </section>

      {(phase==='airport'||phase==='boarding'||phase==='inflight') && currentOperationalFlight && <section className="airport-command glass">
        <div className="airport-command-head"><div><span className="eyebrow">AIRPORT FLOW</span><h3>{currentOperationalFlight.departureAirportCode||'---'} → {currentOperationalFlight.arrivalAirportCode||'---'}</h3></div><div className="airport-flight-status"><span>{currentOperationalFlight.status||'EXPECTED'}</span><b>{currentOperationalFlight.flightNumber||currentOperationalFlight.airline}</b></div></div>
        <div className="airport-stage-track">{stages.map((stage,i)=><div className={`${i<=airportStage?'done':''} ${i===airportStage?'active':''}`} key={stage}><span>{i<airportStage?<CheckCircleIcon/>:i+1}</span><b>{stage}</b></div>)}</div>
        <div className="airport-focus-grid"><div><span>TERMINAL</span><b>{currentOperationalFlight.terminal||'—'}</b></div><div><span>GATE</span><b>{currentOperationalFlight.gate||'—'}</b></div><div><span>CHECK-IN</span><b>{currentOperationalFlight.checkInDesk||'—'}</b></div><div><span>STATUS</span><b>{currentOperationalFlight.status||'EXPECTED'}</b></div></div>
        <button className="journey-focus-button" onClick={onOpenBookings}>Open boarding details <ChevronRightIcon/></button>
      </section>}

      {phase==='inflight'&&activeFlight&&<section className="inflight-card">
        <div className="inflight-plane"><PaperAirplaneIcon/></div><span>YOU ARE BETWEEN</span><div><b>{activeFlight.departureAirportCode||'---'}</b><i/><b>{activeFlight.arrivalAirportCode||'---'}</b></div><p>{activeFlight.aircraft||'Aircraft'}{activeFlight.aircraftRegistration?` · ${activeFlight.aircraftRegistration}`:''}</p>
        <button onClick={()=>setArrivalGuide(v=>!v)}>{arrivalGuide?'Hide arrival plan':'Prepare me for landing'} <ChevronRightIcon/></button>
      </section>}

      {(arrivalGuide||phase==='arrival')&&<section className="arrival-sequence glass"><div className="journey-section-title"><div><span className="eyebrow">WHEN YOU LAND</span><h3>Arrival sequence</h3></div><SparklesIcon/></div><div className="arrival-steps">{arrivalSteps.map((step,i)=><div key={step}><span>{String(i+1).padStart(2,'0')}</span><b>{step}</b></div>)}</div>{activeHotel&&<div className="arrival-hotel"><BuildingOffice2Icon/><div><span>HOME BASE</span><b>{activeHotel.name}</b><small>{activeHotel.address}</small></div>{activeHotel.address&&<a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activeHotel.address)}`} target="_blank" rel="noreferrer"><MapPinIcon/> Directions</a>}</div>}</section>}

      <section className="live-now-grid journey-now-grid">
        <article className="live-primary-card">
          <div className="live-card-label"><SparklesIcon/> WHAT NOW?</div>
          {nextPlan?<><span className="live-kicker">NEXT ACTIVITY · {countdown(itemMs(nextPlan)-now)}</span><h3>{nextPlan.title}</h3><p><MapPinIcon/>{nextPlan.location}</p><div className="live-command-row"><div><span>START</span><b>{nextPlan.time}</b></div><div><span>COMMUTE</span><b>{nextPlan.commuteMinutes?`~${nextPlan.commuteMinutes} min`:'Not estimated'}</b></div><div className={leaveBy&&leaveBy<=now?'danger':''}><span>DEPARTURE CUE</span><b>{leaveState||'—'}</b></div></div><button className="live-cta" onClick={onOpenItinerary}><CalendarDaysIcon/> Open today’s timeline</button></>:<><span className="live-kicker">DAY OPEN</span><h3>No upcoming plan</h3><p>Your itinerary is clear. Add the next stop when you are ready.</p><button className="live-cta" onClick={onOpenItinerary}>Open itinerary</button></>}
        </article>
        <article className="journey-day-board"><div className="live-card-label"><ClockIcon/> {country?`TODAY IN ${CITY[country].toUpperCase()}`:'NEXT CHAPTER'}</div><div className="journey-day-list">{todayPlans.slice(0,5).map((p,i)=><div className={itemMs(p)<now?'passed':i===0?'next':''} key={p.id}><b>{p.time}</b><span>{p.title}</span><small>{p.location}</small></div>)}{!todayPlans.length&&<div className="journey-empty-day"><SparklesIcon/><b>{phase==='pretrip'?'Your itinerary will wake up here on the trip.':'A calm day.'}</b><span>{tomorrowPlans.length?`${tomorrowPlans.length} plans waiting tomorrow.`:'No activities scheduled for today.'}</span></div>}</div><div className="journey-day-footer"><span>PACE <b className={`load-${dayLoad.toLowerCase()}`}>{dayLoad}</b></span><span>{todayPlans.length} stops</span><span>~{totalCommute} min commute</span></div></article>
      </section>

      <section className="live-radar">
        <div className="live-section-head"><div><span className="eyebrow">SCHEDULE RADAR</span><h3>{radar.length?`${radar.length} timing risk${radar.length===1?'':'s'} detected`:'Timeline looks clean'}</h3></div><ShieldCheckIcon/></div>
        {radar.length?<div className="radar-list">{radar.map(r=><div key={r.id} className={`radar-item ${r.severity}`}><ExclamationTriangleIcon/><div><b>{r.title}</b><span>{r.detail}</span></div></div>)}</div>:<p className="live-muted">Trip Deck checked itinerary spacing and commute estimates. No obvious clashes were found.</p>}
      </section>

      <section className="journey-command-strip">
        <button onClick={()=>setWrapped(true)}><SparklesIcon/><div><b>Trip Wrapped</b><span>{phase==='complete'?'Your journey is ready':'Preview your journey story'}</span></div></button>
        <button onClick={onOpenDocuments}><DocumentTextIcon/><div><b>Private documents</b><span>Open your traveler vault</span></div></button>
        <button onClick={()=>setRescue(v=>!v)}><LifebuoyIcon/><div><b>Trip Rescue</b><span>Emergency + hotel + essentials</span></div></button>
        <button onClick={onOpenStays}><BuildingOffice2Icon/><div><b>Home base</b><span>{activeHotel?.name||'Open Stay Planner'}</span></div></button>
      </section>

      {rescue&&country&&<section className="rescue-panel"><div className="live-section-head"><div><span className="eyebrow">TRIP RESCUE</span><h3>Everything essential, one screen</h3></div><LifebuoyIcon/></div><div className="rescue-grid"><div><span>LOCAL EMERGENCY</span><b>{EMERGENCY[country].emergency}</b><small>{EMERGENCY[country].note}</small></div><div><span>AMBULANCE / FIRE</span><b>{EMERGENCY[country].ambulance}</b><small>{country}</small></div><div><span>HOTEL</span><b>{activeHotel?.name||'Not saved'}</b><small>{activeHotel?.phone||activeHotel?.address||'Add hotel contact'}</small></div><div><span>NEXT FLIGHT</span><b>{nextFlight?.flightNumber||'Not saved'}</b><small>{nextFlight?`${nextFlight.departureAirportCode||''} → ${nextFlight.arrivalAirportCode||''}`:'Open Bookings'}</small></div></div></section>}

      <button className={`trip-orb ${orbOpen?'open':''}`} onClick={()=>setOrbOpen(v=>!v)} aria-label="Trip Deck Orb"><span><SparklesIcon/></span></button>
      {orbOpen&&<div className="trip-orb-menu"><div className="orb-head"><span>✦</span><div><b>What do you need?</b><small>Trip Deck knows the context.</small></div></div><button onClick={()=>{setOrbOpen(false);onOpenItinerary();}}><ClockIcon/><span>Where do we go next?</span><ChevronRightIcon/></button><button onClick={()=>{setOrbOpen(false);onOpenDocuments();}}><DocumentTextIcon/><span>Show my documents</span><ChevronRightIcon/></button><button onClick={()=>{setOrbOpen(false);onOpenBookings();}}><PaperAirplaneIcon/><span>Show next flight</span><ChevronRightIcon/></button><button onClick={()=>{setOrbOpen(false);onOpenStays();}}><BuildingOffice2Icon/><span>Show hotel</span><ChevronRightIcon/></button><button onClick={()=>{setOrbOpen(false);setRescue(true);}}><LifebuoyIcon/><span>Emergency / Rescue</span><ChevronRightIcon/></button><button onClick={()=>{setOrbOpen(false);setWrapped(true);}}><SparklesIcon/><span>Show Trip Wrapped</span><ChevronRightIcon/></button></div>}

      {wrapped&&<div className="wrapped-overlay"><div className="wrapped-card"><button className="wrapped-close" onClick={()=>setWrapped(false)}><XMarkIcon/></button><span className="wrapped-kicker">✦ YOUR ASIA ADVENTURE ✦</span><h2>{phase==='complete'?'JOURNEY COMPLETE':'YOUR JOURNEY, SO FAR'}</h2><p>21 AUG — 4 SEP 2026</p><div className="wrapped-hero-stat"><b>15</b><span>DAYS</span></div><div className="wrapped-stats">{posterStats.slice(1).map(([label,value])=><div key={label}><b>{value}</b><span>{label}</span></div>)}</div><div className="wrapped-route">{ROUTE.map((r,i)=><div key={r.code}><span className={i<=routeCompleted?'done':''}>{i<routeCompleted?'✓':r.flag}</span><b>{r.code}</b>{i<ROUTE.length-1&&<i/>}</div>)}</div><div className="wrapped-quote">6 FRIENDS · 3 COUNTRIES · 1 STORY</div><button className="wrapped-download" onClick={generatePoster}><ArrowDownTrayIcon/> Generate Trip Memory</button><small>Creates a shareable 1080 × 1350 journey poster from your Trip Deck data.</small></div></div>}
    </div>
  </div>;
}

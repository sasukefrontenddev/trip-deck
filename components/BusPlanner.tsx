'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowPathIcon, ArrowTopRightOnSquareIcon, MapPinIcon, TicketIcon, TruckIcon } from '@heroicons/react/24/outline';
import type { HotelStay } from '@/lib/db';

type Route = { distanceKm:number; drivingMinutes:number; transit:{minutes:number;mode:string;cost:number;currency:string}; error?:string };
type Stop = { id:string; name:string; address:string; lat:number; lon:number };
type Coach = { operator:string; style:string; stopId:string; arrival:string; duration:string; fare:string; frequency:string; booking:string; note:string };

const stops:Stop[]=[
  {id:'tbs',name:'Terminal Bersepadu Selatan (TBS)',address:'Bandar Tasik Selatan, Kuala Lumpur',lat:3.0765,lon:101.7114},
  {id:'bts',name:'Berjaya Times Square',address:'Jalan Imbi, Bukit Bintang, Kuala Lumpur',lat:3.1421,lon:101.7106},
  {id:'corus',name:'Corus Hotel / Aeroline lounge',address:'Jalan Ampang, Kuala Lumpur City Centre',lat:3.1602,lon:101.7194},
];

const coaches:Coach[]=[
  {operator:'Causeway Link Express',style:'Direct cross-border coach',stopId:'tbs',arrival:'HarbourFront Centre, Singapore',duration:'About 5–6 hours',fare:'Usually around MYR 140',frequency:'Multiple daily departures',booking:'https://www.causewaylink.com.my/mobile-express/',note:'Official operator booking. Immigration and traffic can extend journey time.'},
  {operator:'Aeroline',style:'Business-class coach',stopId:'corus',arrival:'HarbourFront Centre, Singapore',duration:'About 5–6 hours',fare:'Check live business-class fare',frequency:'Selected daily departures',booking:'https://www.aeroline.com.sg/',note:'Official operator booking with onboard comfort-focused service.'},
  {operator:'KKKL Express',style:'Executive coach',stopId:'tbs',arrival:'Singapore city drop-off points',duration:'About 5–6.5 hours',fare:'From about MYR 35–80',frequency:'Several departures daily',booking:'https://www.kkklexpress.com/',note:'Official operator website; exact pickup and drop-off depend on the selected trip.'},
  {operator:'Transtar Travel',style:'Premium / executive coach',stopId:'bts',arrival:'Singapore city terminals',duration:'About 5–6.5 hours',fare:'From about MYR 40+',frequency:'Multiple departures daily',booking:'https://www.transtar.travel/',note:'Official operator booking; premium services can cost more.'},
  {operator:'Compare all operators',style:'Licensed booking marketplace',stopId:'tbs',arrival:'Multiple Singapore stops',duration:'Roughly 5–7 hours',fare:'Commonly MYR 20–155',frequency:'Hundreds of listed services',booking:'https://www.busonlineticket.com/booking/kuala-lumpur-to-singapore-bus-tickets',note:'Compare operators, seat layouts, pickup points and current availability.'},
];

export default function BusPlanner({hotels}:{hotels:HotelStay[]}){
 const hotel=hotels.find(h=>h.country==='Malaysia'&&h.address&&h.address!=='Add hotel address');
 const [routes,setRoutes]=useState<Record<string,Route>>({});
 const [loading,setLoading]=useState(false);
 const origin=hotel?`${hotel.name}, ${hotel.address}, Kuala Lumpur, Malaysia`:'';
 useEffect(()=>{
  if(!origin)return;
  let cancelled=false;setLoading(true);
  Promise.all(stops.map(async stop=>{
   try{const r=await fetch(`/api/travel?hotel=${encodeURIComponent(origin)}&lat=${stop.lat}&lon=${stop.lon}&country=Malaysia`);const d=await r.json();return [stop.id,r.ok?d:{error:d.error||'Route unavailable'}] as const;}
   catch{return [stop.id,{error:'Route unavailable'}] as const;}
  })).then(rows=>{if(!cancelled)setRoutes(Object.fromEntries(rows));}).finally(()=>{if(!cancelled)setLoading(false)});
  return()=>{cancelled=true};
 },[origin]);
 const routeDistance=useMemo(()=>356,[origin]);
 return <div className="bus-shell">
  <section className="bus-hero glass"><div><span className="eyebrow">KUALA LUMPUR → SINGAPORE</span><h2>Cross-border coach planner</h2><p>Compare practical coach options, see how far each departure point is from your Kuala Lumpur hotel, then book through an operator or established ticketing platform.</p></div><div className="bus-route-chip"><TruckIcon/><div><b>{routeDistance} km</b><span>road distance · usually 5–7 hours</span></div></div></section>
  <div className={`hotel-route-banner ${hotel?'ready':'missing'}`}><MapPinIcon/><div><b>{hotel?`Station distances from ${hotel.name}`:'Add your Kuala Lumpur hotel first'}</b><span>{hotel?hotel.address:'Open Stays and save a complete Kuala Lumpur hotel address.'}</span></div>{loading&&<ArrowPathIcon className="spin"/>}</div>
  <div className="bus-stop-grid">{stops.map(stop=>{const r=routes[stop.id];return <article className="bus-stop-card glass" key={stop.id}><MapPinIcon/><div><h3>{stop.name}</h3><p>{stop.address}</p>{r?.error?<span className="route-error">{r.error}</span>:r?<div className="bus-stop-metrics"><b>{r.distanceKm} km</b><span>~{r.drivingMinutes} min by car</span><span>~{r.transit.minutes} min by {r.transit.mode}</span></div>:<span className="muted">{hotel?'Calculating…':'Hotel required'}</span>}</div></article>})}</div>
  <div className="bus-options">{coaches.map(coach=>{const stop=stops.find(s=>s.id===coach.stopId)!;const r=routes[coach.stopId];return <article className="bus-card glass" key={coach.operator}><div className="bus-card-head"><div><span>{coach.style}</span><h3>{coach.operator}</h3></div><TicketIcon/></div><div className="bus-facts"><div><small>Departure</small><b>{stop.name}</b>{r&&!r.error&&<span>{r.distanceKm} km from hotel · ~{r.drivingMinutes} min drive</span>}</div><div><small>Arrival</small><b>{coach.arrival}</b></div><div><small>Coach journey</small><b>{coach.duration}</b><span>{coach.frequency}</span></div><div><small>Indicative fare</small><b>{coach.fare}</b><span>Check live fare before payment</span></div></div><p className="bus-note">{coach.note}</p><a className="primary bus-book" href={coach.booking} target="_blank" rel="noreferrer">Check schedule & book <ArrowTopRightOnSquareIcon/></a></article>})}</div>
  <p className="bus-disclaimer">Times and fares are indicative and can change with date, traffic, border queues, operator and seat class. Confirm passport, visa and Singapore entry requirements before booking.</p>
 </div>
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowPathIcon, BuildingStorefrontIcon, MapPinIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import type { Booking, CountryName, HotelStay } from '@/lib/db';
import { foodPlaces, type FoodPlace } from '@/lib/food';

type Route = { distanceKm:number; drivingMinutes:number; walking:{minutes:number;practical:boolean;note:string}; transit:{mode:string;minutes:number;cost:number;currency:string;note:string}; error?:string };
const shouldShowWalking = (route?: Route) => !route || !(route.walking.minutes > 30 || route.distanceKm > 10);
const cities: {country:CountryName; city:string}[] = [
  { country:'Malaysia', city:'Kuala Lumpur' }, { country:'Singapore', city:'Singapore' }, { country:'Indonesia', city:'Jakarta' }
];

export default function FoodGuide({hotels,bookings}:{hotels:HotelStay[];bookings:Booking[]}) {
  const [country,setCountry]=useState<CountryName>('Malaysia');
  const [kind,setKind]=useState<'All'|'Restaurant'|'Convenience'>('All');
  const [query,setQuery]=useState('');
  const [routes,setRoutes]=useState<Record<string,Route>>({});
  const [loading,setLoading]=useState(false);
  const city=cities.find(x=>x.country===country)!.city;
  const savedHotel=hotels.find(h=>h.country===country);
  const hotelBooking=bookings.find(b=>b.country===country&&b.type==='hotel');
  const hotel=savedHotel&&savedHotel.address!=='Add hotel address'&&!savedHotel.name.startsWith('Add ')?savedHotel:hotelBooking?{name:hotelBooking.title,address:hotelBooking.subtitle,city,country}:savedHotel;
  const hasHotel=Boolean(hotel?.address&&hotel.address!=='Add hotel address'&&hotel?.name&&!hotel.name.startsWith('Add '));
  const list=useMemo(()=>foodPlaces.filter(p=>p.country===country).filter(p=>kind==='All'||p.kind===kind).filter(p=>`${p.name} ${p.cuisine} ${p.reviewFavourite}`.toLowerCase().includes(query.toLowerCase())),[country,kind,query]);

  useEffect(()=>{
    if(!hasHotel||!hotel) return;
    const destinations=foodPlaces.filter(p=>p.country===country&&!routes[p.id]).map(p=>({id:p.id,lat:p.latitude,lon:p.longitude,country:p.country}));
    if(!destinations.length) return;
    const controller=new AbortController(); setLoading(true);
    fetch('/api/travel',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({origin:`${hotel.name}, ${hotel.address}, ${hotel.city}, ${hotel.country}`,originCandidates:[`${hotel.address}, ${hotel.city}, ${hotel.country}`,`${hotel.name}, ${hotel.city}, ${hotel.country}`],destinations}),signal:controller.signal})
      .then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error||'Unable to calculate routes.');setRoutes(v=>({...v,...d.routes}));})
      .catch(e=>{if(e?.name!=='AbortError')setRoutes(v=>({...v,...Object.fromEntries(destinations.map(d=>[d.id,{distanceKm:0,drivingMinutes:0,walking:{minutes:0,practical:false,note:'Unavailable'},transit:{mode:'Unavailable',minutes:0,cost:0,currency:'',note:e instanceof Error?e.message:'Unable to calculate.'},error:e instanceof Error?e.message:'Unable to calculate.'}]))}));})
      .finally(()=>setLoading(false));
    return()=>controller.abort();
  },[country,hasHotel,hotel?.name,hotel?.address]);

  return <section className="food-shell">
    <div className="section-heading"><div><span className="eyebrow">HALAL FOOD FINDER</span><h3>Restaurants & convenience stops</h3></div><span className="muted">Curated halal-only shortlist</span></div>
    <div className="food-country-tabs">{cities.map(x=><button key={x.country} className={country===x.country?'active':''} onClick={()=>setCountry(x.country)}><b>{x.city}</b><span>{x.country}</span></button>)}</div>
    <div className={`hotel-route-banner ${hasHotel?'ready':'missing'}`}><MapPinIcon/><div><b>{hasHotel?`Distances from ${hotel?.name}`:'Add your hotel to calculate food distances'}</b><span>{hasHotel?hotel?.address:'Open Stays and save a complete hotel street address.'}</span></div>{loading&&<ArrowPathIcon className="spin"/>}</div>
    <div className="food-controls glass"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={`Search halal food in ${city}`}/><div>{(['All','Restaurant','Convenience'] as const).map(x=><button className={kind===x?'active':''} key={x} onClick={()=>setKind(x)}>{x}</button>)}</div></div>
    <div className="food-grid">{list.map((p:FoodPlace)=>{const r=routes[p.id];return <article className="food-card" key={p.id}>
      <div className="food-card-top"><span className="food-kind"><BuildingStorefrontIcon/>{p.kind}</span><span>{p.city}</span></div>
      <h4>{p.name}</h4><p className="food-address">{p.address}</p>
      <div className="food-meta"><div><small>Cuisines</small><b>{p.cuisine}</b></div><div><small>Review favourite</small><b>{p.reviewFavourite}</b></div></div>
      <div className="halal-assurance"><ShieldCheckIcon/><span><b>Halal check</b>{p.halalAssurance}</span></div>
      <div className="food-route">{r?.error?<span>{r.error}</span>:r?<><div><b>{r.distanceKm} km</b><small>from hotel</small></div><div><b>~{r.transit.minutes} min</b><small>{r.transit.mode}</small></div><div><b>~{r.transit.currency} {r.transit.cost}</b><small>estimated fare</small></div>{shouldShowWalking(r)&&<div><b>~{r.walking.minutes} min</b><small>walking</small></div>}</>:<span>{hasHotel?'Calculating route…':'Save a hotel address first'}</span>}</div>
      <div className="food-actions">{shouldShowWalking(r)&&<a target="_blank" rel="noreferrer" href={`https://www.google.com/maps/dir/?api=1&destination=${p.latitude},${p.longitude}${hasHotel?`&origin=${encodeURIComponent(`${hotel?.name}, ${hotel?.address}`)}`:''}&travelmode=walking`}>Walk route</a>}<a target="_blank" rel="noreferrer" href={p.reviewUrl}>Reviews & map</a><a target="_blank" rel="noreferrer" href={p.sourceUrl}>Halal source</a></div>
    </article>})}</div>
    <p className="food-disclaimer">Halal certificates, outlet ownership and menus can change. Check the current certificate/logo at the exact branch before ordering. “Review favourite” is a concise summary of dishes repeatedly highlighted in current travel and diner listings, not a guarantee.</p>
  </section>
}

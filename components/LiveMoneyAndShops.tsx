'use client';
import { useEffect, useMemo, useState } from 'react';
import { ArrowPathIcon, BuildingStorefrontIcon, CalculatorIcon, MapPinIcon } from '@heroicons/react/24/outline';
import type { CountryName, Expense } from '@/lib/db';
import { convertWithRates, fetchLiveFx, type FxRates } from '@/lib/fx';

const LOCAL:Record<CountryName,string>={Malaysia:'MYR',Singapore:'SGD',Indonesia:'IDR'};
type Shop={id:string;name:string;category:string;lat:number;lon:number;address:string;openingHours:string;website:string;distanceKm?:number;driveMinutes?:number;fare?:{min:number;max:number;currency:string};routeUnavailable?:boolean};

async function safeJson(response: Response) {
 const text=await response.text();
 if(!text.trim().startsWith('{')) throw new Error('The nearby service returned a web page instead of data. Restart the dev server and try again.');
 try{return JSON.parse(text)}catch{throw new Error('The nearby service returned invalid data.');}
}

export default function LiveMoneyAndShops({country,expenses}:{country:CountryName;expenses:Expense[]}){
 const local=LOCAL[country]; const [fx,setFx]=useState<FxRates|null>(null); const [fxError,setFxError]=useState(''); const [from,setFrom]=useState(local); const [amount,setAmount]=useState(100);
 const [shops,setShops]=useState<Shop[]>([]); const [shopError,setShopError]=useState(''); const [loading,setLoading]=useState(false); const [notice,setNotice]=useState('');
 const loadRates=async()=>{setFxError('');try{setFx(await fetchLiveFx('AED'));}catch(e){setFx(null);setFxError(e instanceof Error?e.message:'Live rates unavailable.');}};
 useEffect(()=>{setFrom(local);setFx(null);void loadRates();},[local]);
 const rate=(a:string,b:string)=>convertWithRates(1,a,b,fx);
 const converted=convertWithRates(amount,from,from==='AED'?local:'AED',fx);
 const aedTotal=useMemo(()=>expenses.reduce((sum,e)=>sum+(e.aedAmount ?? convertWithRates(e.amount,e.currency,'AED',fx)),0),[expenses,fx]);
 function findShops(){setLoading(true);setShopError('');setNotice('');if(!navigator.geolocation){setShopError('Location is not supported.');setLoading(false);return;}navigator.geolocation.getCurrentPosition(async p=>{try{const r=await fetch(`/api/shops-nearby?lat=${p.coords.latitude}&lon=${p.coords.longitude}&radius=5000&ts=${Date.now()}`,{cache:'no-store',headers:{Accept:'application/json'}});const d=await safeJson(r);if(!r.ok)throw new Error(d.error||'Shop search failed');setShops(d.shops||[]);setNotice(d.notice||'');}catch(e){setShopError(e instanceof Error?e.message:'Shop search failed');}finally{setLoading(false)}},()=>{setShopError('Allow location access to load real nearby shops.');setLoading(false)},{timeout:15000,maximumAge:60000});}
 return <div className="live-money-shell">
  <section className="panel glass currency-live-card"><div className="panel-title"><div><span className="eyebrow">LIVE EXCHANGE RATES</span><h3>{country} currency converter</h3></div><CalculatorIcon/></div>
   {fx?<><div className="rate-strip"><div><small>USD → {local}</small><b>1 USD = {rate('USD',local).toLocaleString(undefined,{maximumFractionDigits:4})} {local}</b></div><div><small>AED → {local}</small><b>1 AED = {rate('AED',local).toLocaleString(undefined,{maximumFractionDigits:4})} {local}</b></div><div><small>Logged expenses in AED</small><b>AED {aedTotal.toLocaleString(undefined,{maximumFractionDigits:2})}</b></div></div>
   <div className="converter-row"><input type="number" min="0" value={amount} onChange={e=>setAmount(Number(e.target.value))}/><select value={from} onChange={e=>setFrom(e.target.value)}><option>{local}</option><option>AED</option><option>USD</option></select><span>=</span><strong>{from==='AED'?local:'AED'} {converted.toLocaleString(undefined,{maximumFractionDigits:2})}</strong></div><p className="data-freshness">Free live rate provider: {fx.provider} · updated {new Date(fx.updatedAt).toLocaleString()}</p></>:<div><p className="muted">{fxError||'Loading current rates…'}</p>{fxError&&<button type="button" className="secondary small" onClick={loadRates}><ArrowPathIcon/> Retry live rates</button>}</div>}
  </section>
  <section className="panel glass live-shops-card"><div className="section-heading compact"><div><span className="eyebrow">LIVE NEARBY SHOPPING</span><h3>Shops around your current location</h3><p className="muted">Real map listings with live road distance and travel time.</p></div><button className="primary small" onClick={findShops} disabled={loading}>{loading?<ArrowPathIcon className="spin"/>:<MapPinIcon/>}{loading?'Loading…':'Find shops'}</button></div>
   {shopError&&<div className="nearby-error">{shopError}</div>}
   <div className="shop-live-grid">{shops.map(s=><article className="shop-live-item" key={s.id}><div className="food-card-top"><span className="food-kind"><BuildingStorefrontIcon/>{s.category.replaceAll('_',' ')}</span>{s.distanceKm!=null&&<b>{s.distanceKm} km</b>}</div><h4>{s.name}</h4><p>{s.address}</p><div className="shop-journey"><div><small>Drive time</small><b>{s.driveMinutes!=null?`${s.driveMinutes} min`:'Route unavailable'}</b></div><div><small>Estimated fare</small><b>{s.fare?`${s.fare.currency} ${s.fare.min.toLocaleString()}–${s.fare.max.toLocaleString()}`:'Check ride app'}</b></div><div><small>Hours</small><b>{s.openingHours||'Check map'}</b></div></div><div className="food-actions"><a target="_blank" rel="noreferrer" href={`https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lon}`}>Directions</a><a target="_blank" rel="noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${s.name} ${s.address}`)}`}>Live map</a></div></article>)}</div>
   {notice&&<p className="food-disclaimer">{notice}</p>}
  </section>
 </div>
}

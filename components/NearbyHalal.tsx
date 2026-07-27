'use client';

import { useState } from 'react';
import { ArrowPathIcon, BuildingStorefrontIcon, ChevronDownIcon, MapPinIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';

type Place={id:string;name:string;lat:number;lon:number;distanceKm:number;cuisine:string;address:string;halalTag:string;phone:string;website:string;openingHours:string;country:string};

type ApiResponse={places?:Place[];notice?:string;error?:string};

export default function NearbyHalal(){
  const [places,setPlaces]=useState<Place[]>([]);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [radius,setRadius]=useState(5000);
  const [location,setLocation]=useState<{lat:number;lon:number}|null>(null);

  async function readApiResponse(response:Response):Promise<ApiResponse>{
    const contentType=response.headers.get('content-type')||'';
    const raw=await response.text();
    if(!contentType.includes('application/json')){
      throw new Error(response.status===404
        ? 'The nearby-search API route was not found. Restart the Next.js server after updating the project.'
        : 'The nearby-search service returned an invalid response. Please try again.');
    }
    try{return JSON.parse(raw) as ApiResponse;}catch{throw new Error('The nearby-search service returned unreadable data. Please try again.');}
  }

  function search(){
    setError('');setNotice('');setLoading(true);
    if(!navigator.geolocation){setError('Location access is not supported by this browser.');setLoading(false);return;}
    navigator.geolocation.getCurrentPosition(async pos=>{
      const lat=pos.coords.latitude,lon=pos.coords.longitude;
      setLocation({lat,lon});
      try{
        const response=await fetch(`/api/halal-nearby?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&radius=${radius}`,{headers:{Accept:'application/json'},cache:'no-store'});
        const data=await readApiResponse(response);
        if(!response.ok)throw new Error(data.error||'Unable to search nearby halal food.');
        setPlaces(Array.isArray(data.places)?data.places:[]);
        setNotice(data.notice||'');
      }catch(e){
        setError(e instanceof Error?e.message:'Unable to search nearby halal food.');
        setPlaces([]);
      }finally{setLoading(false);}
    },e=>{
      setError(e.code===1?'Location permission was denied. Allow location access in your browser and try again.':e.code===3?'Location lookup timed out. Try again near a window or with precise location enabled.':'Your current location could not be determined.');
      setLoading(false);
    },{enableHighAccuracy:false,timeout:15000,maximumAge:120000});
  }

  return <section className="nearby-shell">
    <div className="nearby-hero glass">
      <div><span className="eyebrow">LIVE HALAL SEARCH</span><h2>Halal food near me</h2><p>Uses your current location to find nearby restaurants tagged halal in community map data. Available in Malaysia, Singapore and Indonesia.</p></div>
      <div className="nearby-search-controls">
        <label className="nearby-radius-select" aria-label="Search radius">
          <span>Search radius</span>
          <select value={radius} onChange={e=>setRadius(Number(e.target.value))}>
            <option value={2000}>Within 2 km</option><option value={5000}>Within 5 km</option><option value={10000}>Within 10 km</option>
          </select>
          <ChevronDownIcon aria-hidden="true"/>
        </label>
        <button className="primary nearby-location-button" onClick={search} disabled={loading}>{loading?<ArrowPathIcon className="spin"/>:<MapPinIcon/>}{loading?'Searching…':'Use my location'}</button>
      </div>
    </div>
    {error&&<div className="nearby-error">{error}</div>}
    {location&&<div className="hotel-route-banner ready"><MapPinIcon/><div><b>Your live search area</b><span>{location.lat.toFixed(5)}, {location.lon.toFixed(5)} · {places.length} halal-tagged places found</span></div></div>}
    <div className="nearby-grid">{places.map(p=><article className="food-card" key={p.id}><div className="food-card-top"><span className="food-kind"><BuildingStorefrontIcon/>Nearby food</span><b>{p.distanceKm} km</b></div><h4>{p.name}</h4><p className="food-address">{p.address}</p><div className="food-meta"><div><small>Cuisine</small><b>{p.cuisine}</b></div><div><small>Opening hours</small><b>{p.openingHours||'Check map'}</b></div></div><div className="halal-assurance"><ShieldCheckIcon/><span><b>Community halal tag: {p.halalTag}</b>Verify the current official certificate or Muslim ownership at this exact outlet before ordering.</span></div><div className="food-actions"><a target="_blank" rel="noreferrer" href={`https://www.google.com/maps/dir/?api=1&origin=${location?.lat},${location?.lon}&destination=${p.lat},${p.lon}`}>Directions</a><a target="_blank" rel="noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${p.name} ${p.address}`)}`}>Reviews & map</a>{p.website&&<a target="_blank" rel="noreferrer" href={p.website}>Website</a>}</div></article>)}</div>
    {!loading&&!error&&places.length===0&&<div className="intel-empty"><MapPinIcon/><p>Tap “Use my location” to search live halal options around you.</p></div>}
    {notice&&<p className="food-disclaimer">{notice} OpenStreetMap halal tags are not an official certification database.</p>}
  </section>;
}

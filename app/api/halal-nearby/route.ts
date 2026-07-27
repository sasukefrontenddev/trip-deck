import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const allowed=[{country:'Malaysia',minLat:.8,maxLat:7.5,minLon:99.5,maxLon:119.5},{country:'Singapore',minLat:1.15,maxLat:1.5,minLon:103.55,maxLon:104.1},{country:'Indonesia',minLat:-11.5,maxLat:6.5,minLon:94.5,maxLon:141.5}];
const region=(lat:number,lon:number)=>allowed.find(x=>lat>=x.minLat&&lat<=x.maxLat&&lon>=x.minLon&&lon<=x.maxLon);
const endpoints=['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter','https://overpass.nchc.org.tw/api/interpreter'];

function distanceKm(aLat:number,aLon:number,bLat:number,bLon:number){const r=6371,rad=(v:number)=>v*Math.PI/180,dLat=rad(bLat-aLat),dLon=rad(bLon-aLon),h=Math.sin(dLat/2)**2+Math.cos(rad(aLat))*Math.cos(rad(bLat))*Math.sin(dLon/2)**2;return r*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));}

async function fetchOverpass(query:string){
  let lastError='';
  for(const endpoint of endpoints){
    try{
      const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8','Accept':'application/json','User-Agent':'TripDeck/1.5 halal-nearby'},body:new URLSearchParams({data:query}).toString(),cache:'no-store',signal:AbortSignal.timeout(22000)});
      const contentType=response.headers.get('content-type')||'';
      const raw=await response.text();
      if(!response.ok){lastError=`${response.status} from routing provider`;continue;}
      if(!contentType.includes('json')&&!raw.trim().startsWith('{')){lastError='Provider returned HTML instead of JSON';continue;}
      return JSON.parse(raw) as {elements?:Array<any>};
    }catch(error){lastError=error instanceof Error?error.message:'Provider request failed';}
  }
  throw new Error(lastError||'All nearby-search providers failed');
}

export async function GET(request:NextRequest){
  const lat=Number(request.nextUrl.searchParams.get('lat')),lon=Number(request.nextUrl.searchParams.get('lon')),radius=Math.min(10000,Math.max(1000,Number(request.nextUrl.searchParams.get('radius'))||5000));
  if(!Number.isFinite(lat)||!Number.isFinite(lon))return NextResponse.json({error:'Location coordinates are required.'},{status:400});
  const area=region(lat,lon);
  if(!area)return NextResponse.json({error:'Live halal search is currently limited to Malaysia, Singapore and Indonesia.'},{status:400});
  const query=`[out:json][timeout:20];(nwr(around:${radius},${lat},${lon})[amenity~"restaurant|cafe|fast_food|food_court"][diet:halal~"yes|only",i];nwr(around:${radius},${lat},${lon})[amenity~"restaurant|cafe|fast_food|food_court"][halal~"yes|only",i];);out center tags;`;
  try{
    const data=await fetchOverpass(query);
    const seen=new Set<string>();
    const places=(data.elements||[]).map((e:any)=>{const p=e.center||e,t=e.tags||{},name=t.name||t['name:en'];if(!name||!Number.isFinite(p.lat)||!Number.isFinite(p.lon))return null;const key=`${name}-${p.lat.toFixed(4)}-${p.lon.toFixed(4)}`;if(seen.has(key))return null;seen.add(key);return{id:String(e.type)+String(e.id),name,lat:p.lat,lon:p.lon,distanceKm:Number(distanceKm(lat,lon,p.lat,p.lon).toFixed(2)),cuisine:(t.cuisine||'Cuisine not listed').split(';').join(' · '),address:[t['addr:housenumber'],t['addr:street'],t['addr:suburb'],t['addr:city']].filter(Boolean).join(' ')||'Open map for address',halalTag:t['diet:halal']||t.halal||'yes',phone:t.phone||t['contact:phone']||'',website:t.website||t['contact:website']||'',openingHours:t.opening_hours||'',country:area.country};}).filter(Boolean).sort((a:any,b:any)=>a.distanceKm-b.distanceKm).slice(0,40);
    return NextResponse.json({country:area.country,radius,places,notice:'Results are places tagged halal in OpenStreetMap. Verify the current official certificate or Muslim ownership at the exact outlet.'},{headers:{'Cache-Control':'no-store'}});
  }catch{
    return NextResponse.json({error:'Live nearby search is temporarily unavailable because the free map provider did not return valid data. Try again in a moment.'},{status:503,headers:{'Cache-Control':'no-store'}});
  }
}

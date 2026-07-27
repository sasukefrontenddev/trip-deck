import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const supported = ['AED', 'USD', 'MYR', 'SGD', 'IDR'] as const;
type Currency = (typeof supported)[number];
const supportedSet = new Set<string>(supported);
type FxPayload = { base:Currency; rates:Record<string,number>; updatedAt:string; provider:string; stale?:boolean; warning?:string };

async function fetchJson(url:string){
 const response=await fetch(url,{cache:'no-store',headers:{Accept:'application/json','User-Agent':'TripDeck/2.1 currency-service'},signal:AbortSignal.timeout(10000)});
 const raw=await response.text();
 if(!response.ok)throw new Error(`Provider returned ${response.status}`);
 const contentType=response.headers.get('content-type')||'';
 if(!contentType.includes('json')&&!raw.trim().startsWith('{'))throw new Error('Provider returned non-JSON data');
 try{return JSON.parse(raw)}catch{throw new Error('Provider returned malformed JSON')}
}
function normalize(base:Currency,source:Record<string,unknown>,provider:string,updatedAt:string):FxPayload{
 const rates:Record<string,number>={[base]:1};
 for(const code of supported){const value=code===base?1:Number(source[code]??source[code.toLowerCase()]);if(!Number.isFinite(value)||value<=0)throw new Error(`Missing ${code}`);rates[code]=value}
 return{base,rates,provider,updatedAt};
}
async function exchangeRateApi(base:Currency){const d=await fetchJson(`https://open.er-api.com/v6/latest/${base}`);if(d?.result!=='success'||!d?.rates)throw new Error('Invalid response');return normalize(base,d.rates,'ExchangeRate-API',d.time_last_update_utc||new Date().toISOString())}
async function currencyApi(base:Currency){const key=base.toLowerCase();const d=await fetchJson(`https://latest.currency-api.pages.dev/v1/currencies/${key}.json`);if(!d?.[key])throw new Error('Invalid response');return normalize(base,d[key],'Currency API',d.date?`${d.date}T00:00:00Z`:new Date().toISOString())}
async function jsDelivrCurrencyApi(base:Currency){const key=base.toLowerCase();const d=await fetchJson(`https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${key}.json`);if(!d?.[key])throw new Error('Invalid response');return normalize(base,d[key],'Currency API CDN',d.date?`${d.date}T00:00:00Z`:new Date().toISOString())}

// Last-resort reference table prevents the converter UI from breaking during a provider outage.
// It is explicitly marked stale in the response and never presented as a live quote.
const referencePerAED:Record<Currency,number>={AED:1,USD:0.272294,MYR:1.285,SGD:0.354,IDR:4430};
function referencePayload(base:Currency):FxPayload{
 const basePerAED=referencePerAED[base]; const rates:Record<string,number>={};
 for(const code of supported)rates[code]=referencePerAED[code]/basePerAED;
 return{base,rates,updatedAt:new Date().toISOString(),provider:'Offline reference fallback',stale:true,warning:'Live providers are temporarily unavailable. These are reference rates only; retry before making a payment.'};
}
export async function GET(request:NextRequest){
 const requested=(request.nextUrl.searchParams.get('base')||'AED').toUpperCase();
 if(!supportedSet.has(requested))return NextResponse.json({error:'Unsupported base currency.'},{status:400});
 const base=requested as Currency; const providers=[exchangeRateApi,currencyApi,jsDelivrCurrencyApi];
 for(const provider of providers){try{const payload=await provider(base);return NextResponse.json(payload,{headers:{'Cache-Control':'public, s-maxage=900, stale-while-revalidate=3600'}})}catch{}}
 return NextResponse.json(referencePayload(base),{headers:{'Cache-Control':'no-store'}});
}

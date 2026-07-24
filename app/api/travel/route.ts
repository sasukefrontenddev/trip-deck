import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type Point = { lat: number; lon: number; displayName?: string };

async function geocode(address: string): Promise<Point | null> {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', address);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('limit', '1');
  const response = await fetch(url, {
    headers: { 'User-Agent': 'TripDeck/1.0 (personal travel planner)' },
    next: { revalidate: 86400 },
  });
  if (!response.ok) return null;
  const data = await response.json() as Array<{ lat: string; lon: string; display_name: string }>;
  if (!data[0]) return null;
  return { lat: Number(data[0].lat), lon: Number(data[0].lon), displayName: data[0].display_name };
}

function transitEstimate(country: string, km: number, drivingMinutes: number) {
  if (country === 'Singapore') {
    const fare = Math.min(2.57, Math.max(1.28, 1.09 + km * 0.085));
    return { mode: 'MRT / public bus', minutes: Math.max(12, Math.round(drivingMinutes * 1.35 + 8)), cost: Number(fare.toFixed(2)), currency: 'SGD', note: 'Use contactless bank card or SimplyGo/EZ-Link. Walk to the nearest MRT or bus stop and follow the transit route in Google Maps.' };
  }
  if (country === 'Indonesia') {
    const fare = km <= 10 ? 3500 : km <= 20 ? 7000 : 14000;
    return { mode: km < 5 ? 'TransJakarta / Mikrotrans' : 'MRT Jakarta + TransJakarta', minutes: Math.max(18, Math.round(drivingMinutes * 1.55 + 12)), cost: fare, currency: 'IDR', note: 'Use a JakLingko-compatible e-money card. Combine MRT/TransJakarta with a short Gojek/Grab last mile when needed.' };
  }
  const fare = Math.min(9.5, Math.max(1.2, 1.1 + km * 0.18));
  return { mode: km > 35 ? 'Coach + cable car / local transfer' : 'Rapid KL rail / bus', minutes: Math.max(15, Math.round(drivingMinutes * 1.5 + 10)), cost: Number(fare.toFixed(2)), currency: 'MYR', note: km > 35 ? 'For Genting, use a coach from KL Sentral or Gombak, then Awana SkyWay. For islands, compare coach/ferry combinations.' : 'Use Touch ’n Go on MRT/LRT/Monorail/bus and follow the nearest station route in Google Maps.' };
}

export async function GET(request: NextRequest) {
  try {
    const hotel = request.nextUrl.searchParams.get('hotel')?.trim();
    const lat = Number(request.nextUrl.searchParams.get('lat'));
    const lon = Number(request.nextUrl.searchParams.get('lon'));
    const country = request.nextUrl.searchParams.get('country') || '';
    if (!hotel || !Number.isFinite(lat) || !Number.isFinite(lon)) return NextResponse.json({ error: 'Missing hotel or destination coordinates.' }, { status: 400 });
    const origin = await geocode(hotel);
    if (!origin) return NextResponse.json({ error: 'Hotel address could not be located. Add a more complete street address in Stays.' }, { status: 404 });
    const routeUrl = `https://router.project-osrm.org/route/v1/driving/${origin.lon},${origin.lat};${lon},${lat}?overview=false&alternatives=false&steps=false`;
    const routeResponse = await fetch(routeUrl, { next: { revalidate: 3600 } });
    if (!routeResponse.ok) throw new Error('Routing provider failed');
    const routeData = await routeResponse.json() as { routes?: Array<{ distance: number; duration: number }> };
    const route = routeData.routes?.[0];
    if (!route) return NextResponse.json({ error: 'No road route was found.' }, { status: 404 });
    const km = route.distance / 1000;
    const drivingMinutes = Math.round(route.duration / 60);
    return NextResponse.json({ origin, distanceKm: Number(km.toFixed(1)), drivingMinutes, transit: transitEstimate(country, km, drivingMinutes), estimated: true, checkedAt: new Date().toISOString() });
  } catch {
    return NextResponse.json({ error: 'Travel estimate is temporarily unavailable.' }, { status: 503 });
  }
}

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type Point = { lat: number; lon: number; displayName?: string };
type Destination = { id: string; lat: number; lon: number; country: string };

const userAgent = 'TripDeck/1.1 (personal travel planner; contact: tripdeck-app)';

async function geocode(address: string): Promise<Point | null> {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', address);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('limit', '1');
  const response = await fetch(url, {
    headers: { 'User-Agent': userAgent, 'Accept-Language': 'en' },
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
    return { mode: 'MRT / public bus', minutes: Math.max(12, Math.round(drivingMinutes * 1.35 + 8)), cost: Number(fare.toFixed(2)), currency: 'SGD', note: 'MRT or public bus is usually the best-value option. Use the same contactless card to tap in and out.' };
  }
  if (country === 'Indonesia') {
    const fare = km <= 10 ? 3500 : km <= 20 ? 7000 : 14000;
    return { mode: km < 5 ? 'TransJakarta / Mikrotrans' : 'MRT + TransJakarta', minutes: Math.max(18, Math.round(drivingMinutes * 1.55 + 12)), cost: fare, currency: 'IDR', note: 'Use MRT or TransJakarta for the main journey and a short Gojek/Grab ride only for the last mile.' };
  }
  const fare = Math.min(9.5, Math.max(1.2, 1.1 + km * 0.18));
  return { mode: km > 35 ? 'Coach + local transfer' : 'Rapid KL rail / bus', minutes: Math.max(15, Math.round(drivingMinutes * 1.5 + 10)), cost: Number(fare.toFixed(2)), currency: 'MYR', note: km > 35 ? 'A coach plus local transfer is generally the best-value choice for long trips.' : 'Rapid KL rail or bus is usually the best-value choice; use a short Grab ride for the last mile when needed.' };
}

async function roadRoute(origin: Point, destination: Point) {
  const url = `https://router.project-osrm.org/route/v1/driving/${origin.lon},${origin.lat};${destination.lon},${destination.lat}?overview=false&alternatives=false&steps=false`;
  const response = await fetch(url, { next: { revalidate: 3600 } });
  if (!response.ok) return null;
  const data = await response.json() as { routes?: Array<{ distance: number; duration: number }> };
  return data.routes?.[0] || null;
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
    const route = await roadRoute(origin, { lat, lon });
    if (!route) return NextResponse.json({ error: 'No road route was found.' }, { status: 404 });
    const km = route.distance / 1000;
    const drivingMinutes = Math.round(route.duration / 60);
    return NextResponse.json({ origin, distanceKm: Number(km.toFixed(1)), drivingMinutes, transit: transitEstimate(country, km, drivingMinutes), estimated: true, checkedAt: new Date().toISOString() });
  } catch {
    return NextResponse.json({ error: 'Travel estimate is temporarily unavailable.' }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { origin?: string; destination?: string; country?: string; destinations?: Destination[] };
    const originAddress = body.origin?.trim();
    if (!originAddress) return NextResponse.json({ error: 'An origin address is required.' }, { status: 400 });
    const origin = await geocode(originAddress);
    if (!origin) return NextResponse.json({ error: 'The origin address could not be located. Enter a complete address.' }, { status: 404 });

    if (body.destination) {
      const destination = await geocode(body.destination.trim());
      if (!destination) return NextResponse.json({ error: 'The destination address could not be located. Enter a complete address.' }, { status: 404 });
      const route = await roadRoute(origin, destination);
      if (!route) return NextResponse.json({ error: 'No road route was found.' }, { status: 404 });
      const km = route.distance / 1000;
      const drivingMinutes = Math.round(route.duration / 60);
      return NextResponse.json({ origin, destination, distanceKm: Number(km.toFixed(1)), drivingMinutes, transit: transitEstimate(body.country || '', km, drivingMinutes), estimated: true });
    }

    const destinations = (body.destinations || []).filter(d => d.id && Number.isFinite(d.lat) && Number.isFinite(d.lon)).slice(0, 100);
    if (!destinations.length) return NextResponse.json({ error: 'No destination coordinates were supplied.' }, { status: 400 });
    const coordinates = [`${origin.lon},${origin.lat}`,...destinations.map(d => `${d.lon},${d.lat}`)].join(';');
    const tableUrl = `https://router.project-osrm.org/table/v1/driving/${coordinates}?sources=0&annotations=distance,duration`;
    const tableResponse = await fetch(tableUrl, { next: { revalidate: 3600 } });
    if (!tableResponse.ok) throw new Error('Routing provider failed');
    const table = await tableResponse.json() as { distances?: Array<Array<number | null>>; durations?: Array<Array<number | null>> };
    const distances = table.distances?.[0] || [];
    const durations = table.durations?.[0] || [];
    const routes = destinations.reduce<Record<string, unknown>>((result, destination, index) => {
      const metres = distances[index + 1];
      const seconds = durations[index + 1];
      if (metres == null || seconds == null) return result;
      const km = metres / 1000;
      const drivingMinutes = Math.round(seconds / 60);
      result[destination.id] = { distanceKm: Number(km.toFixed(1)), drivingMinutes, transit: transitEstimate(destination.country, km, drivingMinutes), estimated: true };
      return result;
    }, {});
    return NextResponse.json({ origin, routes, estimated: true });
  } catch {
    return NextResponse.json({ error: 'Travel estimate is temporarily unavailable.' }, { status: 503 });
  }
}

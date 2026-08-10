import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type Point = { lat: number; lon: number; displayName?: string };
type Destination = { id: string; lat: number; lon: number; country: string };

const userAgent = 'TripDeck/1.2 travel-route-service';
async function fetchWithTimeout(input: string | URL, init: RequestInit = {}, timeoutMs = 4500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try { return await fetch(input, { ...init, signal: controller.signal }); }
  finally { clearTimeout(timer); }
}

const airports: Record<string, Point> = {
  KUL: { lat: 2.7456, lon: 101.7072, displayName: 'Kuala Lumpur International Airport' },
  KLIA: { lat: 2.7456, lon: 101.7072, displayName: 'Kuala Lumpur International Airport' },
  SIN: { lat: 1.3644, lon: 103.9915, displayName: 'Singapore Changi Airport' },
  CGK: { lat: -6.1256, lon: 106.6559, displayName: 'Soekarno-Hatta International Airport' },
  DPS: { lat: -8.7482, lon: 115.1672, displayName: 'I Gusti Ngurah Rai International Airport' },
  SHJ: { lat: 25.3286, lon: 55.5172, displayName: 'Sharjah International Airport' },
  DXB: { lat: 25.2532, lon: 55.3657, displayName: 'Dubai International Airport' },
  AUH: { lat: 24.4330, lon: 54.6511, displayName: 'Zayed International Airport' },
};

function airportPoint(value: string): Point | null {
  const upper = value.toUpperCase();
  for (const [code, point] of Object.entries(airports)) {
    if (upper === code || upper.includes(` ${code} `) || upper.includes(`(${code})`) || upper.includes(code === 'KUL' ? 'KUALA LUMPUR INTERNATIONAL AIRPORT' : point.displayName!.toUpperCase())) return point;
  }
  return null;
}

async function nominatim(address: string): Promise<Point | null> {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', address);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('limit', '1');
  url.searchParams.set('addressdetails', '0');
  const response = await fetchWithTimeout(url, { headers: { 'User-Agent': userAgent, 'Accept-Language': 'en' }, cache: 'no-store' });
  if (!response.ok) return null;
  const data = await response.json() as Array<{ lat: string; lon: string; display_name: string }>;
  return data[0] ? { lat: Number(data[0].lat), lon: Number(data[0].lon), displayName: data[0].display_name } : null;
}

async function photon(address: string): Promise<Point | null> {
  const url = new URL('https://photon.komoot.io/api/');
  url.searchParams.set('q', address);
  url.searchParams.set('limit', '1');
  const response = await fetchWithTimeout(url, { headers: { 'User-Agent': userAgent, 'Accept-Language': 'en' }, cache: 'no-store' });
  if (!response.ok) return null;
  const data = await response.json() as { features?: Array<{ geometry?: { coordinates?: [number, number] }; properties?: { name?: string; city?: string; country?: string } }> };
  const feature = data.features?.[0];
  const coordinates = feature?.geometry?.coordinates;
  if (!coordinates) return null;
  return { lat: coordinates[1], lon: coordinates[0], displayName: [feature?.properties?.name, feature?.properties?.city, feature?.properties?.country].filter(Boolean).join(', ') };
}

function candidates(primary: string, supplied: unknown): string[] {
  const values = [primary, ...(Array.isArray(supplied) ? supplied.map(String) : [])].map(v => v.trim()).filter(Boolean);
  const expanded = values.flatMap(value => {
    const parts = value.split(',').map(x => x.trim()).filter(Boolean);
    return [value, parts.length > 2 ? parts.slice(1).join(', ') : '', parts.length > 3 ? parts.slice(0, -1).join(', ') : ''];
  }).filter(Boolean);
  return [...new Set(expanded)];
}

async function geocode(primary: string, supplied?: unknown): Promise<Point | null> {
  const known = airportPoint(primary);
  if (known) return known;
  for (const value of candidates(primary, supplied)) {
    const airport = airportPoint(value);
    if (airport) return airport;
    try { const result = await nominatim(value); if (result) return result; } catch {}
    try { const result = await photon(value); if (result) return result; } catch {}
  }
  return null;
}

function walkingEstimate(km: number) {
  const minutes = Math.max(1, Math.round((km / 4.8) * 60));
  return { minutes, practical: km <= 10, note: km <= 10 ? 'Estimated at an average walking speed of 4.8 km/h.' : 'Possible in theory, but usually impractical for this distance.' };
}

function transitEstimate(country: string, km: number, drivingMinutes: number) {
  if (country === 'Singapore') return { mode: 'MRT / public bus', minutes: Math.max(12, Math.round(drivingMinutes * 1.35 + 8)), cost: Number(Math.min(2.57, Math.max(1.28, 1.09 + km * 0.085)).toFixed(2)), currency: 'SGD', note: 'MRT or public bus is usually the best-value option.' };
  if (country === 'Indonesia') return { mode: km < 5 ? 'TransJakarta / Mikrotrans' : 'MRT + TransJakarta', minutes: Math.max(18, Math.round(drivingMinutes * 1.55 + 12)), cost: km <= 10 ? 3500 : km <= 20 ? 7000 : 14000, currency: 'IDR', note: 'Use rail or TransJakarta for the main journey and a short ride-hail trip for the last mile.' };
  return { mode: km > 35 ? 'Coach + local transfer' : 'Rapid KL rail / bus', minutes: Math.max(15, Math.round(drivingMinutes * 1.5 + 10)), cost: Number(Math.min(9.5, Math.max(1.2, 1.1 + km * 0.18)).toFixed(2)), currency: 'MYR', note: km > 35 ? 'A coach plus local transfer is generally the best-value choice.' : 'Rapid KL rail or bus is usually the best-value choice.' };
}

async function roadRoute(origin: Point, destination: Point) {
  const url = `https://router.project-osrm.org/route/v1/driving/${origin.lon},${origin.lat};${destination.lon},${destination.lat}?overview=false&alternatives=false&steps=false`;
  const response = await fetchWithTimeout(url, { cache: 'no-store' }, 5000);
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
    if (!origin) return NextResponse.json({ error: 'Hotel address could not be located. Use the street address and postcode saved in Stays.' }, { status: 404 });
    const route = await roadRoute(origin, { lat, lon });
    if (!route) return NextResponse.json({ error: 'No road route was found.' }, { status: 404 });
    const km = route.distance / 1000, drivingMinutes = Math.round(route.duration / 60);
    return NextResponse.json({ origin, distanceKm: Number(km.toFixed(1)), drivingMinutes, transit: transitEstimate(country, km, drivingMinutes), walking: walkingEstimate(km), estimated: true, checkedAt: new Date().toISOString() });
  } catch { return NextResponse.json({ error: 'Travel estimate is temporarily unavailable.' }, { status: 503 }); }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { origin?: string; destination?: string; country?: string; destinations?: Destination[]; originCandidates?: string[]; destinationCandidates?: string[] };
    const originAddress = body.origin?.trim();
    if (!originAddress) return NextResponse.json({ error: 'An origin address is required.' }, { status: 400 });
    const origin = await geocode(originAddress, body.originCandidates);
    if (!origin) return NextResponse.json({ error: 'The airport or origin could not be located.' }, { status: 404 });

    if (body.destination) {
      const destination = await geocode(body.destination.trim(), body.destinationCandidates);
      if (!destination) return NextResponse.json({ error: 'The destination could not be located. Try a clearer landmark, venue, street address or postcode.' }, { status: 404 });
      const route = await roadRoute(origin, destination);
      if (!route) return NextResponse.json({ error: 'No road route was found.' }, { status: 404 });
      const km = route.distance / 1000, drivingMinutes = Math.round(route.duration / 60);
      return NextResponse.json({ origin, destination, distanceKm: Number(km.toFixed(1)), drivingMinutes, transit: transitEstimate(body.country || '', km, drivingMinutes), walking: walkingEstimate(km), estimated: true });
    }

    const destinations = (body.destinations || []).filter(d => d.id && Number.isFinite(d.lat) && Number.isFinite(d.lon)).slice(0, 100);
    if (!destinations.length) return NextResponse.json({ error: 'No destination coordinates were supplied.' }, { status: 400 });
    const coordinates = [`${origin.lon},${origin.lat}`, ...destinations.map(d => `${d.lon},${d.lat}`)].join(';');
    const tableResponse = await fetchWithTimeout(`https://router.project-osrm.org/table/v1/driving/${coordinates}?sources=0&annotations=distance,duration`, { cache: 'no-store' }, 6000);
    if (!tableResponse.ok) throw new Error('Routing provider failed');
    const table = await tableResponse.json() as { distances?: Array<Array<number | null>>; durations?: Array<Array<number | null>> };
    const distances = table.distances?.[0] || [], durations = table.durations?.[0] || [];
    const routes = destinations.reduce<Record<string, unknown>>((result, destination, index) => {
      const metres = distances[index + 1], seconds = durations[index + 1];
      if (metres == null || seconds == null) return result;
      const km = metres / 1000, drivingMinutes = Math.round(seconds / 60);
      result[destination.id] = { distanceKm: Number(km.toFixed(1)), drivingMinutes, transit: transitEstimate(destination.country, km, drivingMinutes), walking: walkingEstimate(km), estimated: true };
      return result;
    }, {});
    return NextResponse.json({ origin, routes, estimated: true });
  } catch { return NextResponse.json({ error: 'Travel estimate is temporarily unavailable.' }, { status: 503 }); }
}

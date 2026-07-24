import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type AeroFlight = {
  status?: string;
  airline?: { name?: string };
  departure?: {
    airport?: { name?: string; iata?: string; icao?: string };
    scheduledTime?: { local?: string; utc?: string };
    revisedTime?: { local?: string; utc?: string };
    terminal?: string;
    gate?: string;
  };
  arrival?: {
    airport?: { name?: string; iata?: string; icao?: string };
    scheduledTime?: { local?: string; utc?: string };
    revisedTime?: { local?: string; utc?: string };
    terminal?: string;
    gate?: string;
  };
};

export async function GET(request: NextRequest) {
  const flightNumber = request.nextUrl.searchParams.get('flightNumber')?.trim();
  const date = request.nextUrl.searchParams.get('date')?.trim();
  if (!flightNumber || !date) return NextResponse.json({ error: 'Flight number and date are required.' }, { status: 400 });

  const apiKey = process.env.AERODATABOX_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'Flight lookup is not configured. Add AERODATABOX_API_KEY in Vercel. Manual entry still works.' }, { status: 503 });

  try {
    const url = `https://aerodatabox.p.rapidapi.com/flights/number/${encodeURIComponent(flightNumber.replace(/\s+/g, ''))}/${encodeURIComponent(date)}`;
    const response = await fetch(url, {
      headers: { 'X-RapidAPI-Key': apiKey, 'X-RapidAPI-Host': 'aerodatabox.p.rapidapi.com' },
      cache: 'no-store',
    });
    const payload = await response.json();
    if (!response.ok) return NextResponse.json({ error: payload?.message || 'The flight provider could not find that flight.' }, { status: response.status });
    const options: AeroFlight[] = Array.isArray(payload) ? payload : payload?.flights || [];
    const flight = options[0];
    if (!flight) return NextResponse.json({ error: 'No matching scheduled flight was found. Check the flight number and local departure date.' }, { status: 404 });
    return NextResponse.json({ flight, provider: 'AeroDataBox' });
  } catch {
    return NextResponse.json({ error: 'The flight lookup provider is temporarily unavailable.' }, { status: 502 });
  }
}

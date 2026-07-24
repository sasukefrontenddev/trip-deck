# TripDeck

Offline-first travel command center for Malaysia, Singapore and Indonesia.

## Run

```bash
npm install
npm run dev
```

Open http://localhost:3000. For proper PWA installation and service-worker behavior in production, deploy over HTTPS.

## Included

- PWA manifest and service worker app-shell caching
- Offline IndexedDB storage for itinerary, bookings and file blobs
- Upload/open/delete document vault
- Flight/hotel/activity booking records and confirmation numbers
- Browser notification permission flow
- Responsive animated UI with Framer Motion
- Installable home-screen experience

## Gmail booking import (production integration)

The UI includes an import entry point, but Gmail OAuth is intentionally not hard-coded. Add a server-side OAuth flow and request the minimum Gmail scope needed, normally `gmail.readonly`. Search messages from airlines and hotel providers, parse structured fields, save normalized bookings to IndexedDB, then make the synced records available offline.

Recommended production pieces:

1. Auth.js or your own Google OAuth route.
2. A server route that calls Gmail `users.messages.list`, `users.messages.get`, and attachment retrieval where required.
3. A parser for common email formats plus manual review before saving.
4. Encrypt sensitive cloud data and never expose OAuth tokens to IndexedDB.
5. Schedule server-side reminders or push notifications; local browser timers alone are not reliable when an app is fully closed.

## Privacy note

Files in this starter remain only inside the current browser profile. Clearing site data deletes them. Add encrypted export/import backups before relying on it as the only copy of passports or visas.

## Next.js workspace-root warning

This project explicitly sets `turbopack.root` to the current project directory in `next.config.ts`. This prevents Next.js from treating a parent-folder lockfile (for example `~/package-lock.json`) as the workspace root.

The included `tsconfig.json` also already contains the TypeScript settings Next.js 16 adds during the first development run.

## Trip configuration

This build is configured for **21 August through 3 September 2026** (14 days):

- Malaysia: 21–26 August
- Singapore: 26–29 August
- Indonesia: 29 August–3 September

The country split is editable in `app/page.tsx`.

## Added travel tools

- Mobile-first four-tab layout
- Trip readiness checklist
- Local expense tracker with multiple currencies
- Offline emergency-number card
- JSON trip backup/export
- Date-limited itinerary and booking forms
- Offline document vault
- Flight and hotel booking records
- Notification permission flow


## Confirmed route dates

- Depart Dubai: 21 August 2026
- Arrive Malaysia: 22 August 2026
- Travel to Singapore: 26 August 2026
- Travel to Indonesia: 30 August 2026
- Return to Dubai: 3 September 2026

## Gmail booking import

1. In Google Cloud Console, enable **Gmail API**.
2. Configure the OAuth consent screen. While the app is in Testing, add every Gmail account that will connect as a test user.
3. Create an OAuth 2.0 Client ID with application type **Web application**.
4. Add authorized redirect URIs exactly, including protocol and domain:
   - `http://localhost:3000/api/gmail/callback`
   - `https://YOUR-VERCEL-DOMAIN.vercel.app/api/gmail/callback`
   - Add any custom production domain separately.
5. Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to `.env.local` locally and to Vercel Project Settings > Environment Variables.
6. Redeploy after changing Vercel environment variables.

The app derives the OAuth callback from the current request origin, so `NEXT_PUBLIC_APP_URL` is no longer required. Gmail access is read-only. Tokens are stored in secure, HTTP-only cookies and imported booking summaries are saved to IndexedDB for offline access.

## Manual booking and live flight lookup

The Gmail integration has been removed. Flights are entered manually and saved in IndexedDB. The booking number/PNR is stored locally, while schedule information can optionally be fetched by flight number and local departure date.

A public universal PNR lookup does not exist for arbitrary airline bookings. Reservation retrieval APIs from GDS and booking platforms generally require commercial access and only retrieve reservations created or managed through that provider. TripDeck therefore uses a safe split:

- PNR/booking reference: manual, offline storage.
- Flight schedule, airports, terminal, gate, and status: optional AeroDataBox lookup.
- Hotel confirmation: manual, offline storage.
- One-day reminders: browser notifications when TripDeck is opened or active within the 24-hour reminder window.

### Configure AeroDataBox on Vercel

1. Subscribe to AeroDataBox through RapidAPI.
2. Copy the RapidAPI key.
3. In Vercel open Project Settings > Environment Variables.
4. Add `AERODATABOX_API_KEY`.
5. Redeploy.

Manual flight and hotel entry still works when the API is not configured or the device is offline.

## Country Explorer additive upgrade

This build keeps the original TripDeck overview, bookings, itinerary, documents, expenses, stays, toolkit, flight lookup, hotel editing, and manual attraction features intact. Country Explorer is added as a separate tab and is also opened from the existing country cards.

Compatibility fixes in this release:

- IndexedDB schema version 5 upgrades databases created by versions 3 and 4 without deleting user data.
- Legacy attraction records are merged with the expanded attraction dataset while retaining saved, wishlist, visited, planned-date, and note state.
- Price rendering safely handles missing legacy fields.
- Root hydration tolerates attributes injected by browser extensions.
- The service worker cache is bumped and navigation uses network-first loading to avoid stale app shells during local development.

## Hotel-to-attraction travel estimates

Country Explorer uses the saved hotel in **Stays**, or a hotel-type booking when no Stay address is available. A complete street address is geocoded through OpenStreetMap Nominatim, and road distance/time is calculated through the public OSRM service. Public-transport time and fare are clearly labelled estimates based on the returned road distance and current local fare bands. The “Transit directions” button opens Google Maps for live routing.

Public routing services can be rate-limited and require an internet connection. Ticket prices, fares and travel times should be rechecked before travel.

## Trip Intelligence (v7 additive upgrade)

The existing TripDeck screens and data remain unchanged. A new **Smart** tab adds:

- Travel readiness score based on hotels, bookings, itinerary, checklist and saved attractions
- Upcoming-flight countdown
- Country budget-health dashboard
- Weather-aware one-click day generation using Open-Meteo
- Balanced, Family and Couple planning modes
- Hotel/commute command centre linked to Country Explorer routing
- Country-specific public-transport guidance
- Photo missions persisted locally
- Travel achievement badges
- Mosque, prayer-time and halal-food shortcuts
- Wellbeing/prayer break insertion into the itinerary
- Receipt-photo attachment and direct expense creation
- Web Share/copyable trip summaries
- Hidden-gem and mode-aware attraction recommendations

All new planning actions write to the existing IndexedDB itinerary and expense stores. No existing tabs or stored records are removed.

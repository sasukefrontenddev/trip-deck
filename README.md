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

## Group travel additions

- Separate IndexedDB document folders for Usama, Gulraiz, Nabeel, Asad, Bakhtiar Taha, and Waqar.
- Document categories: passport, visa, ticket, insurance, hotel, and other.
- Countrywise expense logging with category, payer, date, currency, notes, and per-country summaries.
- Editable hotel cards with city, address, airport, airport distance, transfer time, confirmation, phone, and notes.
- Offline attraction shortlist with city, category, planned date, and distance from the hotel.
- Database schema version 3 automatically migrates older documents into Usama's folder so existing files are not lost.

Hotel names, exact airports, and distances are intentionally editable placeholders until confirmed booking details are entered.

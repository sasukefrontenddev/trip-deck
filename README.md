<div align="center">

# ✦ TRIPDECK v7

### Your offline-first, AI-assisted travel operating system

**Plan smarter. Move cheaper. Travel calmer. Keep everything in one place.**

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-Ready-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-Offline_First-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white)
![IndexedDB](https://img.shields.io/badge/IndexedDB-Local_Data-0B6E4F?style=for-the-badge)
![Framer Motion](https://img.shields.io/badge/Framer_Motion-Animated-FF0055?style=for-the-badge&logo=framer)
![Build](https://img.shields.io/badge/Release-v7_Smart-00D4FF?style=for-the-badge)

**Malaysia · Singapore · Jakarta**

</div>

---

## ⚡ What is TripDeck?

TripDeck is a private, offline-capable travel command centre built for a multi-country journey across **Malaysia, Singapore and Indonesia**.

It combines bookings, hotels, itinerary planning, expenses, documents, attractions, local transport guidance, weather-aware recommendations and smart trip automation inside one responsive PWA.

The v7 build preserves the full original TripDeck experience and adds a new **Trip Intelligence** layer on top—without deleting existing tabs, records or workflows.

---

## 🧠 v7 — Trip Intelligence

The new **Smart** tab turns stored trip data into practical, real-time travel guidance.

| Intelligence module | What it does |
|---|---|
| **Travel Readiness Score** | Checks hotels, bookings, itinerary, checklist and saved attractions |
| **Flight Countdown** | Surfaces the next flight and time remaining |
| **Budget Health** | Compares spending against country budgets |
| **Weather-Aware Planner** | Generates a day plan using Open-Meteo conditions |
| **Travel Modes** | Switch between Balanced, Family and Couple planning styles |
| **Commute Command Centre** | Connects saved hotels with attraction routing |
| **Local Transport Advisor** | Suggests metro, bus, walking and affordable alternatives |
| **Photo Missions** | Adds location-based travel photo challenges |
| **Achievement System** | Unlocks travel badges from completed activity |
| **Prayer & Wellbeing Tools** | Adds mosque, halal-food and prayer-break shortcuts |
| **Receipt Capture** | Attaches receipt images and creates expenses directly |
| **Shareable Trip Summary** | Uses Web Share or creates a copyable trip snapshot |
| **Hidden Gems Engine** | Highlights mode-aware and lesser-known attractions |

All Smart actions write into the existing IndexedDB itinerary and expense stores, keeping the app unified rather than creating isolated feature silos.

---

## 🗺️ Country Explorer

Country Explorer is an additive experience connected to the original overview cards.

### Included

- Clickable country overview cards
- Animated mobile explorer sheet
- Expanded attraction datasets for Malaysia, Singapore and Jakarta
- Local-currency ticket pricing with approximate AED values
- Adult, child and free-entry labels
- Last-checked dates and pricing disclaimers
- Search and category filters
- Wishlist, saved and visited states
- Direct itinerary insertion
- Morning, afternoon and evening day planning
- Google Maps directions
- Indoor/outdoor, family, duration, best-time and accessibility details
- Nearby food, shopping, ATM, mosque, hospital and transport shortcuts
- Responsive card layouts and animated transitions

### Hotel-to-attraction intelligence

TripDeck uses the hotel saved in **Stays**, or a hotel-type booking when no Stay address is available.

It then:

1. Geocodes the hotel address through OpenStreetMap Nominatim.
2. Calculates road distance and driving duration through OSRM.
3. Displays estimated public-transport duration and fare.
4. Opens Google Maps for live transit routing.
5. Suggests the cheapest practical commute option for the country.

> Public routing APIs may be rate-limited and require an internet connection. Fares, ticket prices and journey times are estimates and should be verified before travel.

---

## 🚀 Core platform

TripDeck keeps the complete original feature set intact:

- Overview dashboard and country cards
- Manual flight entry and optional live flight lookup
- Hotel and activity booking records
- Existing itinerary planner
- Traveler document vault
- Multi-currency expense tracking
- Country budget management
- Hotel and stay planner
- Manual attraction creation
- Readiness checklist
- Emergency information card
- JSON backup and export tools
- Browser notification flow
- PWA installation and offline app-shell support
- Framer Motion animations
- IndexedDB persistence for records and file blobs

---

## 🧭 Confirmed journey

```text
Dubai ──▶ Malaysia ──▶ Singapore ──▶ Jakarta ──▶ Dubai
```

| Milestone | Date |
|---|---:|
| Depart Dubai | 21 August 2026 |
| Arrive Malaysia | 22 August 2026 |
| Travel to Singapore | 26 August 2026 |
| Travel to Indonesia | 30 August 2026 |
| Return to Abu Dhabi | 4 September 2026 |

The country split can be edited in `app/page.tsx`.

---

## 🛠️ Run locally

### Requirements

- Node.js 20+
- npm
- A modern Chromium, Firefox or Safari browser

### Start the app

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

For production PWA installation and service-worker behaviour, deploy over HTTPS.

---

## 🔐 Environment configuration

Create `.env.local` only for integrations you plan to enable.

```env
AERODATABOX_API_KEY=your_rapidapi_key
```

### AeroDataBox

Used for optional flight schedule, airport, terminal, gate and status lookup.

1. Subscribe to AeroDataBox through RapidAPI.
2. Copy the RapidAPI key.
3. Add `AERODATABOX_API_KEY` locally and in Vercel environment variables.
4. Redeploy after changing production environment variables.

Manual flight and hotel entry remains available without the API.

---

## ✈️ Booking architecture

TripDeck intentionally separates private booking references from live schedule data:

- **PNR / booking reference:** entered manually and stored offline
- **Flight schedule and status:** optionally fetched through AeroDataBox
- **Hotel confirmation:** entered manually and stored offline
- **Reminders:** triggered when TripDeck is open or active within the reminder window

A universal public PNR lookup does not exist for arbitrary airline reservations, so TripDeck avoids pretending that unsupported access is available.

---

## 💾 Offline-first data model

TripDeck stores core travel data locally using IndexedDB.

```text
Browser
├── Bookings
├── Hotels / Stays
├── Itinerary
├── Attractions
├── Expenses
├── Documents
├── Checklists
├── Photo Missions
└── Smart-state preferences
```

### Compatibility layer

The current schema upgrades older TripDeck databases without deleting user data.

- Legacy attraction records are merged with the expanded dataset
- Wishlist, saved, visited, notes and planned dates are retained
- Missing legacy price fields are rendered safely
- Browser-extension hydration attributes are tolerated
- Service-worker navigation uses a network-first strategy to reduce stale local builds

---

## 📱 PWA behaviour

TripDeck includes:

- Web app manifest
- Installable home-screen experience
- Offline app-shell caching
- Local IndexedDB persistence
- Responsive mobile and desktop layouts
- Service-worker cache versioning

When testing a new build locally, stale service-worker files may remain active. If an older interface appears:

1. Open DevTools.
2. Go to **Application → Service Workers**.
3. Click **Unregister**.
4. Hard refresh the page.

---

## 🔒 Privacy and security

TripDeck is designed around local-first storage.

- Documents and records remain in the current browser profile
- Clearing browser site data deletes local TripDeck data
- Sensitive files should not rely on one browser profile as their only backup
- OAuth tokens must never be stored in IndexedDB
- Production cloud sync should use encryption and secure HTTP-only cookies

Use the built-in JSON backup/export workflow regularly.

---

## 🧩 Project notes

### Next.js workspace root

`next.config.ts` explicitly sets `turbopack.root` to the current project directory. This prevents Next.js from treating a parent-folder lockfile as the workspace root.

The included `tsconfig.json` already contains the TypeScript settings expected by Next.js 16.

### Gmail integration status

Gmail import is not active in the current runtime. The app uses manual booking entry instead.

A future production integration should use a server-side OAuth flow, request the minimum required Gmail scope, parse booking emails with manual review, encrypt cloud data and keep OAuth tokens out of browser storage.

---

## 🛰️ External services

| Service | Purpose | API key required |
|---|---|---:|
| Open-Meteo | Weather-aware planning | No |
| OpenStreetMap Nominatim | Hotel geocoding | No |
| OSRM | Road distance and duration | No |
| Google Maps | Live route hand-off | No |
| AeroDataBox via RapidAPI | Optional flight lookup | Yes |

---

## 🧪 Production checklist

Before deploying:

- [ ] Run `npm run build`
- [ ] Configure `AERODATABOX_API_KEY` when required
- [ ] Deploy over HTTPS
- [ ] Test PWA installation
- [ ] Verify IndexedDB migration with an older database
- [ ] Test offline reload behaviour
- [ ] Verify hotel geocoding and route fallback states
- [ ] Confirm mobile tab overflow and bottom-sheet interactions
- [ ] Recheck attraction prices and public-transport fares
- [ ] Export a backup before major schema changes

---

<div align="center">

## ✦ Built for the journey, not just the planning

**TripDeck v7** transforms bookings, places, budgets and travel data into one calm, intelligent command centre.

`OFFLINE-FIRST` · `SMART PLANNING` · `LOCAL DATA` · `MULTI-COUNTRY`

</div>

## Live flight status behaviour

Saved flights keep working offline. When the app is online, TripDeck refreshes flights that are within 36 hours of departure (and up to 12 hours after the scheduled departure) every five minutes and whenever the tab becomes active again. The latest AeroDataBox status, departure/arrival revisions, terminals, gates, check-in desk and aircraft details are persisted back to the local cache and configured Redis database. The home boarding pass automatically moves to the next future flight after the current flight departs/enters flight or lands.

## Flight-data enhancements
- AeroDataBox lookup/live refresh stores departure terminal, arrival terminal, gate/check-in data, aircraft model and aircraft registration when supplied by the provider.
- Flights within 24 hours show an in-app online check-in alert. If browser notifications are enabled, the device also receives a one-time online check-in notification while TripDeck is running/open.
- Group sizes are country-aware: Malaysia 5, Singapore 6, Indonesia 5. These counts are used on the boarding pass and expense splitting.

## Singapore Arrival Card reminder
TripDeck detects the saved flight arriving in Singapore (SIN / Singapore destination) and automatically calculates the SG Arrival Card submission window as the arrival date plus the two preceding calendar days. The home page shows when the window opens, switches to a `SUBMIT NOW` state during the valid window, links to the official Singapore ICA SGAC e-Service, and can be marked submitted. The completion state is stored in the synced checklist. If browser notifications are enabled, a one-time notification is sent when the submission window is open. If no Singapore flight has been saved yet, the current itinerary arrival date of 26 August 2026 is used as the fallback.

## Private traveler document vaults
Each traveler document folder can now be protected with its own password. TripDeck derives an AES-256-GCM key in the browser using PBKDF2-SHA-256 (250,000 iterations). The password itself is never stored or sent to Redis. Document file bytes are encrypted before IndexedDB/cloud synchronization; opening a document requires that traveler's password. Older unencrypted documents are encrypted automatically when a vault is first created. Use a strong, unique password and keep it safe: TripDeck intentionally cannot recover a forgotten vault password.

## V21 — Cross-device private document sync
Private encrypted document payloads are synchronized in chunks instead of one large Redis value. This makes vault documents reliable across desktop and mobile browsers. Opening Documents while online refreshes vault/document metadata, and unlocking a traveler vault triggers an immediate document pull. Existing legacy single-value cloud documents are migrated to chunked storage automatically, while documents that only exist in an older desktop IndexedDB are backfilled to Redis from that device.


## Mobile document sync reliability
Private document uploads now drain independently of failed/stale sync mutations, encrypted file chunks use bounded concurrency with retries, and a newly unlocked mobile vault retries cloud hydration automatically. This fixes the case where documents remained visible on the desktop IndexedDB cache but never reached a second device.

## Private document Redis flow (V22)
Private documents are not included in the normal TripDeck cloud hydration. Each upload is encrypted in the browser and written to Redis in chunks; the upload UI only treats it as synced after Redis metadata and all chunks complete. After a traveler vault password is verified, TripDeck calls a traveler-scoped document endpoint and reconstructs only that traveler's encrypted files. Locking the folder removes that traveler's documents from the in-memory UI session. Document deletion uses a TripDeck-styled confirmation and deletes the Redis metadata/chunks before removing the local cache.

## Document loading performance
Traveler vault unlock now fetches only document metadata from Redis. Encrypted file chunks are downloaded lazily when the user opens an individual document, which keeps folder unlock fast on mobile and desktop. Cached encrypted blobs remain available offline when already downloaded on that device.

## V26 document vault fixes
- Traveler vault unlock now refreshes the latest vault salt/verifier from Redis before deriving the AES key, preventing stale mobile vault keys from causing AES-GCM `OperationError` failures.
- Mobile document preview reserves a browser tab from the original tap before async Redis download/decryption, avoiding iOS popup blocking.
- Documents support multi-select, select-all, and TripDeck-styled bulk deletion from Redis and local cache.

### iOS document preview update
Private documents now decrypt inside TripDeck and open in a same-page secure preview instead of navigating a pre-opened `about:blank` tab. This avoids iOS Safari closing the temporary tab after async Redis/WebCrypto work. PDF/image previews stay in the app, with explicit Open in new tab and Download actions after decryption has completed.


### iOS document cache fix
Private document Blob/File payloads are no longer written to IndexedDB. Safari/iOS can reject large Blob/File values with an object-store preparation error. TripDeck now stores only document metadata locally; encrypted bytes remain in Redis and are fetched into memory only when a file is opened. Database version 10 removes legacy local document blobs automatically.

## Document encryption v2
Private document uploads now use a per-document PBKDF2-SHA-256 salt and iteration count stored with encrypted Redis metadata. The traveler's password remains memory-only and is never persisted. This prevents a vault salt/verifier refresh from making newly uploaded files undecryptable across desktop and mobile. Legacy ciphertext created by older builds does not contain the original salt snapshot; if that older vault key has already been replaced, the original file must be uploaded once again after deploying this version.

## Premium experience additions (V30)
- Refined secure document preview actions with balanced Open / Download controls and a dedicated download icon treatment.
- Added a Travel Day Companion to Overview. It combines the next flight status, terminal/gate/check-in desk, arrival stay, first itinerary plan, group size and trip spending in one quick-access panel.
- Added contextual shortcuts from Travel Day Companion to documents, prep checklist and hotel directions.
- Travel Day Companion automatically highlights when the next flight is within 48 hours.

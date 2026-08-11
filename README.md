<div align="center">

# ✦ TRIP DECK

### Your private, offline-first group travel operating system

**Plan smarter. Travel calmer. Keep flights, stays, plans, costs and private documents in one place.**

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-Ready-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-Offline_First-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white)
![Redis](https://img.shields.io/badge/Upstash_Redis-Cloud_Sync-00E9A3?style=for-the-badge&logo=redis&logoColor=white)
![IndexedDB](https://img.shields.io/badge/IndexedDB-Local_First-0B6E4F?style=for-the-badge)
![Encryption](https://img.shields.io/badge/AES--256--GCM-Private_Vaults-1E90FF?style=for-the-badge)
![Build](https://img.shields.io/badge/Trip-21_Aug_→_4_Sep_2026-00D4FF?style=for-the-badge)

**Malaysia · Singapore · Indonesia**

</div>

---

## ⚡ What is Trip Deck?

**Trip Deck** is a private, offline-first group travel companion built for a multi-country journey across **Malaysia, Singapore and Indonesia**.

It combines live flight intelligence, stays, detailed itineraries, expenses, private traveler documents, entry reminders, checklists, maps, trip-readiness tools and premium travel-day guidance inside one responsive PWA.

> **Current journey:** 21 August → 4 September 2026  
> **Route:** Sharjah → Kuala Lumpur → Singapore → Jakarta → Abu Dhabi

---

## ✨ Experience highlights

| Area | What Trip Deck does |
|---|---|
| **Trip Pulse** | Shows the next flight, next plan, upcoming stay, countdown and readiness |
| **Travel Day Companion** | Brings terminal, gate, check-in, hotel, next activity and spending into one panel |
| **Live Flights** | Enriches saved flights with status, terminals, gate, aircraft and revised times |
| **Country Itinerary** | Organizes Malaysia, Singapore and Indonesia plans day-by-day and time-by-time |
| **PDF Import** | Parses itinerary PDFs and converts them into structured plans |
| **Commute Intelligence** | Adds route, distance, travel time, mode and estimated transport cost |
| **Stay Planner** | Keeps hotels organized by destination with map shortcuts |
| **Private Vaults** | Gives every traveler a password-protected encrypted document folder |
| **Cloud + Offline** | Loads locally first through IndexedDB and syncs in the background through Redis |
| **Entry & Check-in Reminders** | Covers SGAC and upcoming online flight check-in |
| **Group Expenses** | Uses country-aware traveler counts for shared costs |
| **Toolkit** | Includes readiness, packing and customizable trip-preparation checklists |

---


## 🧭 Confirmed journey

```text
Sharjah ──▶ Kuala Lumpur ──▶ Singapore ──▶ Jakarta ──▶ Abu Dhabi
```

| Country / leg | Dates | Travelers |
|---|---|---:|
| 🇲🇾 **Malaysia** | 22–26 Aug 2026 | 5 |
| 🇸🇬 **Singapore** | 26–30 Aug 2026 | 6 |
| 🇮🇩 **Indonesia** | 30 Aug–4 Sep 2026 | 5 |

### ✈️ Flight sequence

1. **SHJ → KUL** — 21 Aug 2026
2. **KUL → SIN** — 26 Aug 2026
3. **SIN → CGK** — 30 Aug 2026
4. **CGK → AUH** — 4 Sep 2026

Flights shown on Overview are automatically sorted chronologically.

---

## 🏠 Overview command centre

The Overview is designed to answer one question quickly: **what matters next?**

### Trip Pulse

- Trip countdown / current trip state
- Next upcoming flight
- Next itinerary activity
- Upcoming hotel stay
- Group-readiness percentage
- Direct shortcuts to the relevant section

### Travel Day Companion

The premium travel-day panel can surface:

- Next flight and live status
- Departure terminal
- Gate
- Check-in desk
- Group size
- Arrival hotel and address
- First planned activity after arrival
- Current trip spending
- Quick access to Documents
- Quick access to prep/checklists
- Hotel directions

> When the next flight is close, Trip Deck automatically gives the travel-day information more prominence.

### Group readiness

Shared preparation items include:

- [ ] Passports ready
- [ ] Visa / entry requirements checked
- [ ] Travel insurance saved
- [ ] eSIM / roaming ready
- [ ] Airport transfers confirmed
- [ ] Hotels confirmed
- [ ] Singapore Arrival Card submitted

---

## ✈️ Flights & Bookings

Trip Deck supports both manual flight management and optional live flight enrichment.

### Live flight data

When AeroDataBox is configured, Trip Deck can store and refresh:

| Flight detail | Supported |
|---|:---:|
| Airline / flight number | ✅ |
| Origin / destination | ✅ |
| Scheduled departure / arrival | ✅ |
| Revised departure / arrival | ✅ |
| Departure terminal | ✅ |
| Arrival terminal | ✅ |
| Gate | ✅ |
| Check-in desk | ✅ |
| Aircraft model | ✅ |
| Aircraft registration | ✅ |
| Live operational status | ✅ |

### Traveler-friendly status labels

Provider statuses are normalized into clearer states such as:

`EXPECTED` · `CONFIRMED` · `BOARDING OPEN` · `GATE CLOSED` · `DELAYED` · `IN FLIGHT` · `LANDED` · `CANCELLED` · `DIVERTED`

### Cache-first behavior

Saved flight information appears immediately from local storage.

Live data refreshes in the background, so a slow external flight API does not need to hold up the Bookings or Overview UI.

### Automatic next flight

The home boarding pass advances automatically after a departed/completed leg and moves to the next upcoming flight.

### Boarding pass details

- Airline logo
- Flight number
- Route
- Departure and arrival time
- Departure and arrival terminal
- Gate
- Check-in desk
- Aircraft
- PNR
- Passenger count
- Live flight status

### Flights Taken

Completed flights are retained as a visual history with:

- Airline logo
- Flight number
- Route
- Date

---

## ⏰ Flight reminders

### Online check-in

Within the configured pre-flight window, Trip Deck can display an **Online check-in due** reminder.

If browser notification permission is enabled, Trip Deck can also issue a one-time browser notification while the app is active.

The reminder checker runs periodically, so you do not have to refresh at exactly the right time.

---

## 🇸🇬 Singapore Arrival Card

Trip Deck includes a dedicated **Singapore Arrival Card (SGAC)** workflow.

It can:

- Detect the saved Singapore arrival flight
- Calculate the valid SGAC window
- Show when the submission window opens
- Switch to **SUBMIT NOW** during the valid window
- Link to Singapore ICA's official SGAC service
- Let the group mark the task submitted
- Persist completion in the synced checklist

For the configured **26 August 2026** Singapore arrival, the valid window is:

```text
24 August 2026 → 26 August 2026
```

---

## 🗓️ Country-wise itinerary

The itinerary is organized by country:

- 🇲🇾 Malaysia
- 🇸🇬 Singapore
- 🇮🇩 Indonesia

Within each country, plans are grouped by **day** and ordered by **time**.

### Itinerary entries can include

| Detail | Example |
|---|---|
| Time | `11:45` |
| Activity | Airport transfer |
| Location | KLIA → Sky Suites KLCC |
| Notes | Rest / luggage drop |
| Booking cost | `MYR 70` |
| Commute | `55–75 min` |
| Mode | Grab / rail / walking |
| Distance | Route estimate |
| Group cost | Country-aware estimate |
| Source | Manual / PDF import |

Activities with usable location information include direct map actions.

---

## 📄 PDF itinerary importer

Upload a text-based itinerary PDF and Trip Deck can convert it into structured plans.

### Parser capabilities

- Country detection
- Date detection
- Time detection
- Activity extraction
- Location extraction
- Notes
- MYR / RM prices
- SGD / S$ prices
- IDR / Rp prices

Parsed activities are **saved and displayed before commute enrichment finishes**.

That means slow geocoding or routing requests do not block the itinerary from appearing.

### Commute enrichment

Where possible, Trip Deck adds:

- Route
- Distance
- Estimated duration
- Suggested transport mode
- Per-person transport cost
- Approximate group transport cost

> Text-based PDFs work best. Scanned or image-only PDFs require OCR before reliable parsing.

---

## 🏨 Stay Planner

The Stay Planner keeps accommodation organized in trip order:

1. 🇲🇾 Malaysia
2. 🇸🇬 Singapore
3. 🇮🇩 Indonesia

Stay cards support:

- Property name
- Address
- Check-in / check-out information
- Edit
- Direct map shortcut
- Country-aware organization

Saved hotel addresses can also feed Travel Day Companion and itinerary routing.

---

## 💳 Expenses & group splitting

Trip Deck supports multi-currency travel spending and country-aware group sizes.

| Country | Group size |
|---|---:|
| Malaysia | 5 |
| Singapore | 6 |
| Indonesia | 5 |

Expenses can be associated with the relevant country and used in trip-spending summaries.

---

## 🔐 Private traveler document vaults

Every traveler can have an independent password-protected document folder.

### Privacy model

A traveler must unlock their folder before its private document index is fetched.

Trip Deck does **not** load every traveler's private document collection during normal application startup.

### Encryption

Private documents use browser-side encryption:

```text
Password
  ↓
PBKDF2-SHA-256
  ↓
Per-document derived key
  ↓
AES-256-GCM
  ↓
Encrypted Redis chunks
```

Key points:

- Traveler password is never stored
- File bytes are encrypted before cloud storage
- New files use per-document salt / derivation metadata
- Encryption keys are never stored in Redis
- Changing/refeshing vault metadata does not invalidate newly encrypted files

### Redis-backed document flow

```text
Unlock traveler
      ↓
Fetch traveler-scoped document index
      ↓
Show filenames / categories / sizes
      ↓
Tap Open file
      ↓
Fetch only that file's encrypted chunks
      ↓
Decrypt in memory
      ↓
Secure preview
```

This keeps vault unlock fast even when a traveler has many documents.

### Document features

- Upload
- Open
- Secure preview
- Download
- Open in new tab
- Delete
- Multi-select
- Select all
- Bulk delete
- Lock folder

Deletion uses Trip Deck-styled confirmation UI rather than browser-default dialogs.

### iPhone / Safari handling

Trip Deck avoids relying on persistent Blob/File values inside IndexedDB for private documents.

Encrypted bytes stay cloud-backed and are fetched into memory when the selected file is opened.

---

## 💾 Offline-first architecture

Trip Deck prioritizes local responsiveness.

### Local-first reads

Normal records render from IndexedDB first:

```text
IndexedDB
├── Bookings
├── Stays
├── Itinerary
├── Expenses
├── Attractions
└── Checklists
```

The UI does not wait for Redis before showing already-cached trip data.

### Background synchronization

```text
UI
 ↓
IndexedDB immediately
 ↓
Background sync queue
 ↓
Upstash Redis
```

A failed sync mutation does not permanently block newer changes.

> A completely new browser/device still needs an initial online hydration before it has a local cache.

---

## ☁️ Upstash Redis

Redis provides shared/cross-device persistence for trip data.

Typical synchronized records include:

- Bookings
- Stays
- Itinerary
- Expenses
- Attractions
- Checklists
- Vault metadata
- Encrypted document metadata and chunks

Private documents use a separate traveler-scoped cloud flow rather than whole-app document hydration.

---

## 🧰 Toolkit

### Checklist & Packing

Users can:

- Add custom preparation items
- Mark items complete
- Delete custom items
- Keep checklist state synchronized

Useful examples:

`Power bank` · `Chargers` · `Travel adapter` · `Medicines` · `Cash` · `eSIM` · `Document copies`

---

## 🧭 Explorer, Food & Nearby

Trip Deck includes destination-focused discovery areas for:

- Attractions
- Food
- Nearby essentials
- Destination exploration
- Local trip planning

Saved attractions can feed back into itinerary planning.

---

## 🗺️ Maps & routing

Map shortcuts are integrated across the app:

- Itinerary activities
- Hotels / stays
- Travel Day Companion
- Attractions

Route estimates may use external geocoding/routing services and therefore require internet connectivity.

---

## 📱 PWA experience

Trip Deck is designed as an installable Progressive Web App.

### Included

- Responsive desktop/mobile interface
- Installable home-screen experience
- Offline application shell
- IndexedDB local storage
- Service worker
- Cache versioning
- Mobile-friendly private vaults
- Secure mobile document preview
- Horizontally scrollable navigation where required

When testing a newly deployed build, a phone may briefly retain an older service-worker cache. Reload the site and allow the newest worker to activate.

---

## 🛰️ External services

| Service | Purpose | API key |
|---|---|---:|
| **Upstash Redis** | Shared trip data + encrypted document chunks | Yes |
| **AeroDataBox / RapidAPI** | Flight lookup and live enrichment | Yes |
| **OpenStreetMap / geocoding** | Place lookup | No / provider-dependent |
| **OSRM / routing** | Distance and route estimates | No |
| **Google Maps** | Route hand-off | No |

---

## 🛠️ Technology

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)
![React](https://img.shields.io/badge/React-UI-61DAFB?style=flat-square&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-Ready-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Redis](https://img.shields.io/badge/Upstash-Redis-00E9A3?style=flat-square&logo=redis)
![PWA](https://img.shields.io/badge/PWA-Installable-5A0FC8?style=flat-square&logo=pwa)
![WebCrypto](https://img.shields.io/badge/WebCrypto-AES--256--GCM-1E90FF?style=flat-square)

- **Next.js**
- **React**
- **TypeScript**
- **IndexedDB**
- **Upstash Redis**
- **Web Crypto API**
- **Service Worker / PWA**
- **AeroDataBox / RapidAPI**
- Public routing and geocoding services where configured

---

## 🔐 Environment configuration

Create `.env.local`:

```env
UPSTASH_REDIS_REST_URL=https://your-database.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_rest_token

AERODATABOX_API_KEY=your_rapidapi_key
```

Legacy Vercel KV-style names are also supported where applicable:

```env
KV_REST_API_URL=
KV_REST_API_TOKEN=
```

> Never expose Redis credentials through `NEXT_PUBLIC_` variables.

---

## ☁️ Upstash setup

1. Create an Upstash Redis database.
2. Copy its REST URL and REST token.
3. Add them to `.env.local`.
4. Add the same values to **Vercel → Project → Settings → Environment Variables**.
5. Redeploy.
6. Open Trip Deck once on each device so local caching can initialize.

See `DATABASE-SETUP.md` for additional setup notes.

---

## ✈️ AeroDataBox setup

1. Obtain an AeroDataBox / RapidAPI key.
2. Add `AERODATABOX_API_KEY` to `.env.local`.
3. Add the same value in Vercel.
4. Redeploy.
5. Add or look up a flight from Bookings.

Manual flight entry remains available when live data is unavailable.

---

## 🚀 Run locally

### Requirements

- Node.js 20+
- npm
- Modern Chrome, Safari, Firefox or Edge

### Install

```bash
npm install
```

### Development

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

### Production build

```bash
npm run build
npm start
```

---

## ▲ Vercel deployment

1. Import/push the project to Vercel.
2. Add the required environment variables.
3. Deploy.
4. Test Redis connectivity.
5. Test one live flight lookup.
6. Test document upload/unlock on desktop.
7. Test the same traveler vault on mobile.
8. Reload/install the PWA after major service-worker changes.

---

## 🧪 Production checklist

Before deploying a major build:

- [ ] Run `npm run build`
- [ ] Configure Redis environment variables
- [ ] Configure `AERODATABOX_API_KEY` if live flights are required
- [ ] Deploy over HTTPS
- [ ] Test PWA installation
- [ ] Test cached/offline reload
- [ ] Test Redis hydration on a second device
- [ ] Test one encrypted document upload
- [ ] Open the same vault on mobile
- [ ] Test secure PDF/image preview
- [ ] Verify flight ordering and next-flight switching
- [ ] Verify SGAC reminder state
- [ ] Verify itinerary PDF parsing
- [ ] Verify stay/map shortcuts
- [ ] Verify group expense counts

---

## 🛡️ Privacy & security

Trip Deck should still be deployed using normal web-security practices.

- Keep Redis credentials server-side
- Never persist traveler passwords in plaintext
- Keep HTTPS enabled
- Never log decrypted private document content
- Never send encryption keys to Redis
- Lock a traveler folder on shared devices
- Keep original copies of passports, visas and critical documents outside Trip Deck
- Treat browser notifications as convenience reminders rather than guaranteed background alarms

---

## ⚠️ Important limitations

- Live flight information depends on the external flight-data provider
- Browser notifications have platform restrictions
- Public geocoding/routing providers may rate-limit requests
- Commute fares and durations are estimates
- PDF parsing works best with selectable text
- New devices need internet access for their first Redis hydration
- Redis-backed private files need connectivity unless the required encrypted data is already available in the active session/device
- Official travel requirements should always be verified with the airline, accommodation or relevant government authority

---

## 🎯 Product philosophy

| Principle | Meaning |
|---|---|
| **Fast locally** | Stored trip information should appear without waiting for the cloud |
| **Useful while moving** | The next flight, stay, plan and task should be immediately reachable |
| **Private by default** | Traveler documents stay encrypted and traveler-scoped |
| **One trip, one workspace** | Flights, stays, plans, costs, documents and reminders stay connected |

---

<div align="center">

## ✦ Built for the journey, not just the planning

**Trip Deck** turns flights, stays, itineraries, costs, private documents and travel-day decisions into one calm, connected workspace.

`OFFLINE-FIRST` · `LIVE FLIGHTS` · `PRIVATE VAULTS` · `MULTI-COUNTRY` · `TRAVEL-DAY READY`

### **TRIP DECK**

</div>

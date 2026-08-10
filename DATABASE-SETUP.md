# TripDeck database setup (Upstash Redis)

TripDeck is now **offline-first + cloud-synced**:
- IndexedDB remains on the device so the app still works offline.
- Upstash Redis stores a persistent cloud copy of bookings, itinerary, checklist, expenses, hotels, attractions and uploaded documents.
- Writes made while offline are queued locally and retried when the app is online again.
- Existing local data is migrated to Redis automatically the first time the app runs with Redis configured and the corresponding Redis store is empty.

## 1. Create the database
1. Create/login to an Upstash account.
2. Create a Redis database in the Upstash Console.
3. Open the database's **Connect** section and copy the REST URL and REST token.

## 2. Configure locally
Create `.env.local` in the project root:

```env
UPSTASH_REDIS_REST_URL=https://your-database.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_rest_token
AERODATABOX_API_KEY=your_existing_rapidapi_key
```

Then run:

```bash
npm install
npm run dev
```

Do not put the Redis token in any `NEXT_PUBLIC_...` variable. It is used only by server API routes.

## 3. Configure Vercel
In Vercel open **Project → Settings → Environment Variables** and add:
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `AERODATABOX_API_KEY` (if not already present)

Apply them to Production/Preview/Development as desired, then redeploy.

The code also accepts legacy Vercel KV names `KV_REST_API_URL` and `KV_REST_API_TOKEN` if you already have those configured.

## 4. Flight/calendar fix
The custom calendar previously hard-limited selectable dates to **3 September 2026**. That `max` restriction has been removed, including from flight lookup, itinerary, expense and attraction date inputs. The original 21 August trip-start minimum remains where it already existed.

AeroDataBox can only return schedules that exist in the provider's data/plan. If a future flight is not published yet, manual flight entry continues to work exactly as before.

## Data structure
Redis hashes are stored under:
- `tripdeck:v1:bookings`
- `tripdeck:v1:documents`
- `tripdeck:v1:itinerary`
- `tripdeck:v1:checklist`
- `tripdeck:v1:expenses`
- `tripdeck:v1:hotels`
- `tripdeck:v1:attractions`

Each record is stored by its existing `id`, so no UI/data model changes are required.

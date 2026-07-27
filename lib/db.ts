import { openDB, type DBSchema } from 'idb';

export const TRAVELERS = ['Usama', 'Gulraiz', 'Nabeel', 'Asad', 'Bakhtiar Taha', 'Waqar'] as const;
export type TravelerName = (typeof TRAVELERS)[number];
export type CountryName = 'Malaysia' | 'Singapore' | 'Indonesia';
export type DayPeriod = 'Morning' | 'Afternoon' | 'Evening';

export type Booking = {
  id: string;
  type: 'flight' | 'hotel' | 'activity' | 'transfer';
  title: string;
  subtitle: string;
  date: string;
  travelDate?: string;
  confirmation?: string;
  country: CountryName;
  airline?: string;
  flightNumber?: string;
  departureAirport?: string;
  departureAirportCode?: string;
  arrivalAirport?: string;
  arrivalAirportCode?: string;
  arrivalTime?: string;
  terminal?: string;
  gate?: string;
  status?: string;
  providerLastChecked?: string;
  reminderEnabled?: boolean;
};

export type TripDocument = {
  id: string;
  traveler: TravelerName;
  category: 'Passport' | 'Visa' | 'Ticket' | 'Insurance' | 'Hotel' | 'Other';
  name: string;
  type: string;
  size: number;
  createdAt: string;
  blob: Blob;
};

export type ItineraryItem = {
  id: string;
  title: string;
  location: string;
  date: string;
  time: string;
  country: CountryName;
  notes?: string;
  attractionId?: string;
  period?: DayPeriod;
};

export type ChecklistItem = { id: string; title: string; category: string; done: boolean };

export type Expense = {
  id: string;
  title: string;
  amount: number;
  currency: string;
  country: CountryName;
  category: 'Food' | 'Transport' | 'Hotel' | 'Attraction' | 'Shopping' | 'Flights' | 'Other';
  paidBy: TravelerName;
  date: string;
  notes?: string;
  merchant?: string;
  paymentMethod?: 'Cash' | 'Card' | 'Bank transfer' | 'E-wallet';
  splitCount?: number;
};

export type HotelStay = {
  id: string;
  country: CountryName;
  city: string;
  name: string;
  address: string;
  airport: string;
  distanceKm: number;
  transferMinutes: number;
  checkIn: string;
  checkOut: string;
  confirmation?: string;
  phone?: string;
  notes?: string;
  reminderEnabled?: boolean;
  bookingProvider?: string;
};

export type Attraction = {
  id: string;
  country: CountryName;
  city: string;
  name: string;
  category: string;
  description?: string;
  adultPrice?: number;
  childPrice?: number;
  currency?: string;
  aedAdult?: number;
  aedChild?: number;
  freeEntry?: boolean;
  lastChecked?: string;
  pricingNote?: string;
  latitude?: number;
  longitude?: number;
  indoor?: boolean;
  outdoor?: boolean;
  familyFriendly?: boolean;
  duration?: string;
  bestTime?: string;
  accessibility?: string;
  address?: string;
  plannedDate?: string;
  estimatedCost?: number;
  distanceFromHotelKm?: number;
  saved: boolean;
  wishlist?: boolean;
  visited?: boolean;
  notes?: string;
};

export type TripStoreName =
  | 'bookings'
  | 'documents'
  | 'itinerary'
  | 'checklist'
  | 'expenses'
  | 'hotels'
  | 'attractions';

interface TripDB extends DBSchema {
  bookings: { key: string; value: Booking };
  documents: { key: string; value: TripDocument };
  itinerary: { key: string; value: ItineraryItem };
  checklist: { key: string; value: ChecklistItem };
  expenses: { key: string; value: Expense };
  hotels: { key: string; value: HotelStay };
  attractions: { key: string; value: Attraction };
}

const dbPromise = typeof window === 'undefined' ? null : openDB<TripDB>('tripdeck', 6, {
  async upgrade(db, oldVersion, _newVersion, transaction) {
    if (!db.objectStoreNames.contains('bookings')) db.createObjectStore('bookings', { keyPath: 'id' });
    if (!db.objectStoreNames.contains('documents')) db.createObjectStore('documents', { keyPath: 'id' });
    if (!db.objectStoreNames.contains('itinerary')) db.createObjectStore('itinerary', { keyPath: 'id' });
    if (!db.objectStoreNames.contains('checklist')) db.createObjectStore('checklist', { keyPath: 'id' });
    if (!db.objectStoreNames.contains('expenses')) db.createObjectStore('expenses', { keyPath: 'id' });
    if (!db.objectStoreNames.contains('hotels')) db.createObjectStore('hotels', { keyPath: 'id' });
    if (!db.objectStoreNames.contains('attractions')) db.createObjectStore('attractions', { keyPath: 'id' });

    if (oldVersion < 3 && db.objectStoreNames.contains('documents')) {
      const store = transaction.objectStore('documents');
      let cursor = await store.openCursor();
      while (cursor) {
        const doc = cursor.value as TripDocument & { traveler?: TravelerName; category?: TripDocument['category'] };
        await cursor.update({ ...doc, traveler: doc.traveler || 'Usama', category: doc.category || 'Other' });
        cursor = await cursor.continue();
      }
    }

    if (oldVersion < 6 && db.objectStoreNames.contains('bookings')) {
      const store = transaction.objectStore('bookings');
      let cursor = await store.openCursor();
      while (cursor) {
        const booking = cursor.value as Booking;
        if (booking.type === 'flight') {
          const normalized = booking.date?.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
          // Repair records produced by the previous UTC conversion bug at the
          // start of this fixed 21 Aug–3 Sep 2026 itinerary.
          if (normalized && normalized[1] < '2026-08-21') {
            await cursor.update({ ...booking, date: `2026-08-21T${normalized[2]}`, travelDate: '2026-08-21' });
          }
        }
        cursor = await cursor.continue();
      }
    }
  },
});

export async function getAll<T extends TripStoreName>(store: T): Promise<TripDB[T]['value'][]> {
  const db = await dbPromise!;
  return db.getAll(store);
}

export async function put<T extends TripStoreName>(store: T, value: TripDB[T]['value']) {
  const db = await dbPromise!;
  return db.put(store, value);
}

export async function remove<T extends TripStoreName>(store: T, key: string) {
  const db = await dbPromise!;
  return db.delete(store, key);
}

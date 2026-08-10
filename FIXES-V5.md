TripDeck Food V5

- Walking time and walking-directions actions are hidden whenever a calculated route is longer than 10 km.
- Added 12 more curated halal restaurant cards across Kuala Lumpur, Singapore and Jakarta.
- Added a separate Nearby page using browser geolocation.
- Live nearby search is limited to Malaysia, Singapore and Indonesia and uses the free OpenStreetMap Overpass API.
- Live results only include places carrying an OpenStreetMap halal tag and clearly instruct users to verify current official certification or Muslim ownership.
- Radius choices: 2 km, 5 km and 10 km.

## PDF itinerary import hang fix (2026-08-10)
- PDF-imported activities are rendered and persisted before commute enrichment starts.
- Commute/geocoding enrichment now runs in the background and cannot block the itinerary UI.
- Failed `/api/travel` lookups are treated as optional route-estimate failures rather than import failures.
- Browser-side route requests abort after 7 seconds; server geocoder/router calls also use bounded timeouts.
- Added AUH / Zayed International Airport to the known-airport map.
- Improved generic destination-geocoding error text for itinerary places.

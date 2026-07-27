# TripDeck fixes

- Flight departure values are stored and rendered as local wall-clock date/time, so API timezone offsets no longer move a flight to the previous day.
- Saving a stay now geocodes the airport and hotel and automatically calculates road distance and driving time.
- Explorer automatically calculates hotel-to-attraction distances in one batched routing request and shows the recommended public-transport mode, estimated time, and estimated fare.
- Routing uses OpenStreetMap Nominatim and the public OSRM demo endpoint. These are suitable for a small personal app; use a hosted/self-hosted provider for production traffic.

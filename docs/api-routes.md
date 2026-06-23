# Future API routes

The current application is intentionally static and has no API routes yet. This keeps the migrated visual experience identical to the original demo.

When a backend host and Astro adapter are selected, add server endpoints under `src/pages/api/` using these contracts:

- `GET /api/services`
- `GET /api/specialists`
- `GET /api/gallery`
- `GET /api/reviews`
- `POST /api/bookings`

The browser-side types and request client already live in `src/lib/contracts.ts` and `src/lib/api/client.ts`. Do not connect the current demo confirmation button until an endpoint can securely validate, store, and notify bookings.

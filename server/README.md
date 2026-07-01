# Wheels&Deals API Server

This is the first backend foundation for the marketplace and auction platform. It intentionally uses native Node.js only, so the team can validate API boundaries before choosing Express/Fastify/Nest and the production provider stack.

## Run

From the project root:

```bash
npm run api
```

Health check:

```bash
GET http://localhost:4000/api/health
```

The dev server writes JSON data to:

```txt
data/dev-db.json
```

Storage mode is reported by:

```bash
GET http://localhost:4000/api/health
```

Current modes:

- `STORAGE_DRIVER=json` keeps using the native Node JSON adapter for local development.
- `STORAGE_DRIVER=postgres` stores the current API state in PostgreSQL through the `app_state_snapshots` table. This lets the app run against a real database before every route is migrated to normalized table repositories.

Start local PostgreSQL with Docker:

```bash
npm run db:up
npm run db:migrate
```

## Database Target

The production schema lives at:

```txt
database/schema.sql
```

Migration entrypoint:

```bash
psql "$DATABASE_URL" -f database/migrations/001_initial_schema.sql
```

Node migration runner:

```bash
npm run db:migrate
```

Run the API with Postgres:

```bash
STORAGE_DRIVER=postgres DATABASE_URL=postgres://user:password@localhost:5432/wheels_deals npm run api
```

The schema now covers auth, roles, sessions, KYC, listings, auctions, bids, wallet ledger, deposit holds, checkout, disputes, orders, inspections, accessories, media, forums, comments, polls, conversations, notifications, saved searches, user lists, recommendation events, repair shops, reports, seller drafts, and audit logs.

## Normalized Modules

When `STORAGE_DRIVER=postgres` is enabled:

- Auth registration/login/profile reads use normalized `users`, `user_profiles`, `roles`, and `user_roles`.
- Phone/email verification updates the `users` table.
- Wallet routes use normalized `wallet_accounts`, `wallet_ledger_entries`, `payment_intents`, and `deposit_holds`.
- Payment top-ups now go through `server/src/paymentProvider.js`. `PAYMENT_PROVIDER=mock` is the only configured provider; the `bank` adapter intentionally returns not-configured errors until a real gateway contract is implemented.
- Bid placement uses a normalized transaction when the auction exists in PostgreSQL: auction lock, minimum bid validation, ledger-based deposit availability, deposit hold replacement, bid insert, auction high-bid update, anti-sniping extension, and audit log.
- Listings and auctions use normalized `listings`, `auctions`, and `bids` for reads, creation, updates, lifecycle actions, bid history, and search endpoints when records exist in PostgreSQL.
- Orders, inspection bookings, notifications, conversations/messages, forums, posts, comments, post votes, saved posts, reports, replies, and best-answer markers use normalized engagement tables when PostgreSQL mode is enabled.
- New users are also mirrored into the current app-state snapshot so wallet, bidding, and seller routes keep working while those modules are migrated.
- Seed/demo auctions with non-UUID ids still fall back to the app-state snapshot until listings and auctions are normalized.

## Implemented In This First Pass

- Auth registration/login with password hashing and signed tokens.
- Password policy enforcement, session records, refresh-token responses, logout revocation, CORS allowlists, and safer API response headers.
- Current user endpoint.
- Wallet account creation.
- Payment top-up intent using a mock provider.
- Wallet ledger entries.
- KYC profile and document submission.
- Auction list and bid placement.
- Bid deposit hold validation.
- SSE realtime channel for auction bid events.
- WebSocket realtime channel for auction rooms at `GET /api/realtime/ws?channel=auction:{id}`.
- Listing search.
- Accessory listing and fitment search.
- Media upload intent.
- Taxonomy filters.
- Repair shop directory, rankings, and Maps/Places integration fallback.
- Media provider seam for local uploads plus S3/R2-compatible presigned PUT URLs, CDN public URLs, normalized Postgres media records, listing gallery ordering, private document verification, and processing/security status tracking.
- Search provider seam for in-memory/Postgres search now and Meilisearch/OpenSearch later.
- Basic seller draft and admin KYC queues.

## Maps And Local Services

Repair shops, oil change shops, car washes, dealerships, tyre shops, inspection centers, and towing partners are exposed through:

```bash
GET /api/repair-shops
GET /api/rankings/repair-shops
GET /api/integrations/maps/places?lat=24.86&lng=67.01&category=workshops
```

Set `GOOGLE_MAPS_API_KEY` to enable live Google Places nearby search. Without it, the API returns the verified local directory so the app still works in development.

## Production Replacement Plan

- Keep PostgreSQL snapshot storage for integration testing.
- Migrate route groups from snapshot storage to normalized PostgreSQL repositories behind `server/src/store.js`.
- Replace mock payment provider with the chosen banking/payment gateway.
- Replace manual KYC with a real KYC provider plus admin fallback.
- Replace memory search with Typesense, Meilisearch, OpenSearch, or Elasticsearch.
- Configure `MEDIA_PROVIDER=s3`, `S3_BUCKET`, `S3_REGION`, credentials, optional `S3_ENDPOINT` for R2/MinIO, and `MEDIA_CDN_BASE_URL` for CDN delivery.
- Configure `MEDIA_SCAN_PROVIDER`, `IMAGE_PROCESSOR`, and `VIDEO_PROCESSOR` workers before production. The API tracks virus scanning, EXIF stripping, thumbnail, compression, and transcoding states, but the actual scanning/transcoding workers must run as external services.
- Replace SSE or keep SSE based on scale; WebSocket is preferred for active auction rooms.

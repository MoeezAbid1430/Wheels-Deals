# Production Systems Roadmap

This is the next build track after the frontend product shell. These systems turn the app from a demo marketplace into a real auction platform.

## 1. Real Auth And Accounts

### Must Have

- Email/password signup and login
- Phone OTP verification
- JWT access token and refresh token
- User roles: buyer, seller, dealer, admin, moderator
- Account status: active, pending verification, suspended, banned
- Profile completion
- Session management
- Password reset
- Device/session audit

### Tables

- `users`
- `user_profiles`
- `roles`
- `user_roles`
- `sessions`
- `otp_codes`
- `account_audit_logs`

### First Sprint

- Auth endpoints
- Role guards
- Frontend auth context
- Login/signup pages connected to API

## 2. Payments, KYC, And Banking

### Must Have

- Wallet ledger, not only balance
- Deposit top-up intent
- Bid deposit hold
- Deposit release
- Deposit forfeiture
- Withdrawal request
- Seller payout
- Payment provider webhook
- Refund webhook
- KYC status gate
- CNIC/document upload
- Manual admin verification fallback

### Tables

- `wallet_accounts`
- `wallet_ledger_entries`
- `payment_intents`
- `deposit_holds`
- `refunds`
- `withdrawals`
- `seller_payouts`
- `kyc_profiles`
- `kyc_documents`
- `payment_webhook_events`

### First Sprint

- Simulated provider adapter
- Ledger transactions
- Deposit holds tied to bid placement
- KYC status model

## 3. Realtime Bidding Sockets

### Must Have

- WebSocket or SSE connection
- Auction room subscription
- Bid placed event
- Outbid event
- Reserve met event
- Auction extended event
- Auction ended event
- Winner declared event
- Notification created event
- Connection reconnect/resync

### Tables/Infra

- `auction_events`
- `bid_events`
- Redis pub/sub or message broker
- WebSocket gateway

### First Sprint

- Realtime event server
- Subscribe to `/auctions/:id`
- Push bid updates into listing detail page

## 4. Real AI Recommender And Search

### Must Have

- Structured search filters
- Full-text search
- Typo-tolerant suggestions
- Saved searches
- Personalized ranking
- Similar cars
- Similar accessories
- Price estimate
- Deal score explanation
- Listing quality score
- Fraud/spam score
- Natural language search

### Infra

- Postgres for source of truth
- Typesense, Meilisearch, OpenSearch, or Elasticsearch for search
- AI service for scoring/explanations
- Event tracking for recommendation signals

### First Sprint

- Search index schema
- Search API
- Basic ranking model
- AI explanation endpoint stubs

## 5. Media Upload And Storage

### Must Have

- Image upload
- Video upload
- Document upload
- Signed upload URLs
- Private document URLs
- Image moderation
- Photo quality checks
- Gallery ordering
- Media delete/archive

### Storage

- S3, Cloudflare R2, or Google Cloud Storage
- CDN for public listing media
- Private bucket for CNIC/title documents

### Tables

- `media_assets`
- `listing_media`
- `user_documents`
- `inspection_media`

### First Sprint

- Signed upload intent endpoint
- Media complete endpoint
- Listing media gallery model

## 6. Complete Category And Filter System

### Must Have

- Body style
- Powertrain
- Condition
- Use case
- Transmission
- Seller type
- City/locality
- Year range
- Mileage range
- Price/bid range
- Inspection score
- Title status
- Auction status
- Reserve status
- Accessories category
- Fitment filters

### Tables

- `vehicle_taxonomy`
- `vehicle_makes`
- `vehicle_models`
- `vehicle_variants`
- `accessory_categories`
- `accessory_fitments`

### First Sprint

- Taxonomy tables/API
- Advanced filter drawer
- Fitment search for accessories

## 7. Polished Seller/Admin Workflows

### Seller Must Have

- Draft listings
- Listing completeness score
- Media upload checklist
- Price guidance
- Auction reserve guidance
- Lead/message analytics
- Active auction analytics
- Payout/settlement tracking
- Accessory inventory management

### Admin Must Have

- Submission review queue
- Document verification
- KYC review
- Fraud/risk queue
- Duplicate listing detection
- Bid audit trail
- Auction dispute workflow
- Accessory moderation
- User suspension
- Audit logs

### First Sprint

- Draft status model
- Admin review status model
- KYC/document review queue
- Bid audit log

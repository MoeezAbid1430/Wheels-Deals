# Wheels&Deals API Blueprint

This blueprint covers the backend surface needed for a marketplace plus auction product that can compete with OLX, PakWheels, and dedicated auction apps. The first backend should be modular: core product APIs first, then payments/KYC/realtime/AI integrations.

## API Count Target

| Stage | Scope | Estimated surface |
| --- | --- | --- |
| MVP backend | Auth, listings, auctions, bids, wallet simulation, admin review, search, community basics | 55-70 REST endpoints |
| Competitive platform | Full marketplace, auction lifecycle, messages, notifications, recommendations, moderation, media, checkout | 100-130 REST endpoints |
| Production integrations | Banking, KYC, social login/share, vehicle data, inspection, AI, fraud, analytics | 140-180 endpoints/events total |
| Realtime | Auction events, messages, notifications, forum activity | 20-30 WebSocket/SSE events |

## Core API Modules

### 1. Auth And Accounts

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `POST /auth/refresh`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `POST /auth/verify-phone`
- `POST /auth/verify-email`
- `GET /me`
- `PATCH /me`

### 2. User, Seller, And Dealer Profiles

- `GET /users/:id`
- `PATCH /users/:id`
- `GET /dealers`
- `GET /dealers/:id`
- `PATCH /dealers/:id`
- `POST /dealers/:id/verify`
- `GET /dealers/:id/listings`
- `GET /dealers/:id/reviews`
- `POST /dealers/:id/reviews`

### 3. Marketplace Listings

- `GET /listings`
- `POST /listings`
- `GET /listings/:id`
- `PATCH /listings/:id`
- `DELETE /listings/:id`
- `POST /listings/:id/publish`
- `POST /listings/:id/archive`
- `POST /listings/:id/report`
- `GET /listings/:id/history`
- `GET /listings/:id/inspection`
- `POST /listings/:id/questions`
- `POST /listings/:id/offers`

### 4. Auction Lifecycle

- `GET /auctions`
- `POST /auctions`
- `GET /auctions/:id`
- `PATCH /auctions/:id`
- `POST /auctions/:id/start`
- `POST /auctions/:id/pause`
- `POST /auctions/:id/reopen`
- `POST /auctions/:id/end`
- `POST /auctions/:id/extend`
- `GET /auctions/:id/status`
- `GET /auctions/:id/reserve`
- `PATCH /auctions/:id/reserve`
- `GET /auctions/:id/audit-log`

### 5. Bidding

- `POST /auctions/:id/bids`
- `GET /auctions/:id/bids`
- `GET /auctions/:id/my-bid-status`
- `POST /auctions/:id/bids/:bidId/cancel-review`
- `POST /auctions/:id/bids/:bidId/flag`
- `GET /users/:id/bids`
- `GET /me/bids`
- `GET /me/won-auctions`

Bid rules must validate minimum increment, reserve, anti-sniping extension, bidder eligibility, deposit lock, fraud score, and auction status.

### 6. Wallet, Deposits, And Ledger

- `GET /wallet`
- `POST /wallet/top-up-intent`
- `POST /wallet/withdrawal-request`
- `GET /wallet/transactions`
- `GET /wallet/holds`
- `POST /wallet/holds`
- `POST /wallet/holds/:id/release`
- `POST /wallet/holds/:id/forfeit`
- `POST /wallet/webhooks/payment`
- `POST /wallet/webhooks/refund`

Production wallet must be ledger based. Never store only a mutable balance.

### 7. Auction Checkout And Settlement

- `GET /checkout/:auctionId`
- `POST /checkout/:auctionId/start`
- `PATCH /checkout/:auctionId`
- `POST /checkout/:auctionId/upload-proof`
- `POST /checkout/:auctionId/confirm-payment`
- `POST /checkout/:auctionId/confirm-handover`
- `POST /checkout/:auctionId/confirm-title-transfer`
- `POST /checkout/:auctionId/open-dispute`
- `POST /checkout/:auctionId/close`

### 8. Seller Submission And Admin Review

- `POST /seller/submissions`
- `GET /seller/submissions`
- `GET /seller/submissions/:id`
- `PATCH /seller/submissions/:id`
- `POST /seller/submissions/:id/submit`
- `GET /admin/submissions`
- `POST /admin/submissions/:id/approve`
- `POST /admin/submissions/:id/reject`
- `POST /admin/submissions/:id/request-changes`
- `POST /admin/submissions/:id/convert-to-auction`

### 9. Search, Filters, And Saved Searches

- `GET /search/listings`
- `GET /search/auctions`
- `GET /search/suggestions`
- `GET /search/facets`
- `POST /saved-searches`
- `GET /saved-searches`
- `PATCH /saved-searches/:id`
- `DELETE /saved-searches/:id`

Search should eventually use Typesense, Meilisearch, OpenSearch, or Elasticsearch instead of basic SQL filters.

### 10. Watchlist, Compare, Recently Viewed

- `GET /me/watchlist`
- `POST /me/watchlist/:listingId`
- `DELETE /me/watchlist/:listingId`
- `GET /me/compare`
- `POST /me/compare/:listingId`
- `DELETE /me/compare/:listingId`
- `GET /me/recently-viewed`
- `POST /me/recently-viewed/:listingId`

### 11. Recommendations And AI Ranking

- `GET /recommendations/home`
- `GET /recommendations/auctions`
- `GET /recommendations/similar/:listingId`
- `GET /recommendations/deals`
- `POST /recommendations/feedback`
- `GET /ai/listings/:id/price-estimate`
- `POST /ai/listings/quality-score`
- `POST /ai/listings/fraud-check`
- `POST /ai/search/natural-language`
- `POST /ai/community/summarize-thread`

The recommender should combine collaborative behavior, content similarity, city/budget fit, auction urgency, deal score, seller trust, and negative signals.

### 12. Messaging

- `GET /conversations`
- `POST /conversations`
- `GET /conversations/:id`
- `POST /conversations/:id/messages`
- `POST /conversations/:id/read`
- `POST /conversations/:id/report`
- `POST /conversations/:id/block`

### 13. Notifications

- `GET /notifications`
- `POST /notifications/:id/read`
- `POST /notifications/read-all`
- `PATCH /notification-preferences`
- `POST /push/register-device`
- `DELETE /push/devices/:id`

### 14. Community, Forums, FAQ

- `GET /forums`
- `POST /forums`
- `GET /forums/:id/posts`
- `POST /posts`
- `GET /posts/:id`
- `PATCH /posts/:id`
- `DELETE /posts/:id`
- `POST /posts/:id/vote`
- `POST /posts/:id/save`
- `POST /posts/:id/report`
- `POST /posts/:id/comments`
- `POST /comments/:id/vote`
- `POST /comments/:id/replies`
- `POST /comments/:id/best-answer`
- `GET /faq`
- `POST /faq`
- `PATCH /faq/:id`

### 15. Moderation, Trust, And Fraud

- `GET /admin/reports`
- `POST /admin/reports/:id/resolve`
- `GET /admin/users/:id/risk`
- `POST /admin/users/:id/suspend`
- `POST /admin/listings/:id/fraud-review`
- `GET /admin/audit-log`
- `POST /trust/verify-seller`
- `POST /trust/verify-bidder`

### 16. Media And Documents

- `POST /media/upload-intent`
- `POST /media/complete`
- `DELETE /media/:id`
- `POST /documents/upload-intent`
- `GET /documents/:id`
- `POST /documents/:id/verify`

Use object storage such as S3, Cloudflare R2, or Google Cloud Storage. Keep documents private with signed URLs.

## External Integrations

### Banking And Payments

Needed capabilities:

- Card top-up
- Bank transfer proof
- Mobile wallet top-up
- Payment status webhooks
- Deposit hold
- Deposit release
- Deposit forfeiture
- Refunds
- Seller payout
- Escrow or controlled settlement
- Invoice and platform fee records

Possible provider categories:

- Stripe or Adyen for global card rails
- Local payment gateway for Pakistan cards/bank transfer/mobile wallets
- Easypaisa/JazzCash style mobile wallet integration if available
- Bank account verification where provider supports it

Implementation rule: all payment providers write to a platform ledger. The app should not trust frontend payment state.

### KYC And Identity

Needed capabilities:

- CNIC/NIC verification
- Selfie/liveness verification
- Phone OTP
- Email verification
- Dealer business verification
- Seller title/document matching

KYC should gate high-risk actions: bidding above a threshold, selling through auction, checkout, withdrawals, and dealer verification.

### Social Media

Needed capabilities:

- Google login
- Facebook login
- Apple login later
- WhatsApp listing share
- Facebook share
- X/Twitter share
- Copy deep link
- Dealer social links
- Referral campaign tracking

Social sharing can be mostly frontend links at first. Social login and referral attribution need backend support.

### SMS, WhatsApp, Email, Push

Needed event categories:

- OTP
- Bid placed
- Outbid
- Auction ending soon
- Auction extended
- Auction won
- Checkout started
- Seller message
- Admin approved/rejected listing
- Community reply

Providers can be swapped behind a notification service so the product code does not care whether the channel is SMS, WhatsApp, email, or push.

### Maps And Location

Needed capabilities:

- City/locality autocomplete
- Nearby listings
- Seller or inspection location pin
- Distance calculation
- Inspection booking route/location

### Vehicle Data

Needed capabilities:

- Make/model/variant catalog
- VIN/chassis decode where available
- Market price bands
- Recall/service data where available
- Registration/token tax hints where available

### AI APIs

Needed capabilities:

- Personalized recommendations
- AI price estimate
- Deal score explanation
- Listing quality score
- Fraud/spam detection
- Duplicate listing detection
- Natural language search
- Community thread summaries
- Seller description generator
- Photo quality analysis
- Bidder risk scoring

## Realtime Events

Use WebSocket or SSE for auctions and notifications.

- `auction.bid_placed`
- `auction.outbid`
- `auction.reserve_met`
- `auction.extended`
- `auction.ending_soon`
- `auction.ended`
- `auction.winner_declared`
- `auction.reopened`
- `wallet.deposit_locked`
- `wallet.deposit_released`
- `checkout.started`
- `checkout.updated`
- `message.created`
- `notification.created`
- `community.post_created`
- `community.comment_created`
- `admin.review_updated`

## Recommended Build Order

1. Backend foundation: database schema, auth, users, roles, media storage.
2. Listings and seller submissions.
3. Auction lifecycle: start, bid, reserve, extend, end, winner.
4. Wallet ledger with simulated provider adapter.
5. Checkout and admin auction control.
6. Search, filters, saved searches, watchlist, compare.
7. Messages and notifications.
8. Community/forum/FAQ APIs.
9. AI recommender and AI listing intelligence.
10. Real banking provider, KYC, SMS/WhatsApp, push.
11. Fraud/risk scoring and advanced moderation.
12. Analytics, referral tracking, and growth integrations.

## First Backend Sprint

The first sprint should not try to integrate real banking. Build the contracts and ledger now, then attach providers later.

Must ship first:

- Auth
- Users and roles
- Listings
- Seller submissions
- Admin review
- Auctions
- Bids
- Wallet ledger with deposit holds
- Checkout state
- Notifications
- Basic community posts

This gives the frontend a real backbone while keeping the risky provider integrations contained.

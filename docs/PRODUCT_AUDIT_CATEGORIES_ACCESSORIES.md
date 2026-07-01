# Product Audit: Vehicle Categories, Accessories, And Missing Features

Audit date: 2026-05-10

## Source-Informed Vehicle Taxonomy

The app should stop treating categories as a small fixed set. Automotive marketplaces usually separate body style, powertrain, market segment, use case, and condition.

References checked:

- MotorTrend groups major car types as SUV, Sedan, Truck, Coupe, Van, Hybrid, Electric Car, Hatchback, Luxury SUV, Luxury Car, Sports Car, and Convertible.
- Car and Driver explains body style as size, shape, and vehicle characteristics, with primary groups such as sedan, hatchback, coupe, convertible, SUV, minivan, pickup, and wagon.
- Kelley Blue Book describes 10 general vehicle types and notes that some categories overlap, especially coupe/sports car and convertible/sports car.
- Motor1 organizes body styles around SUV/Crossover, Convertible, Coupe, Hatchback, Sedan, Truck, Wagon, Minivan, and Van.
- CARFAX groups passenger vehicles broadly into SUVs, trucks, vans, and car-style categories like sedans, coupes, hatchbacks, and wagons.

## Recommended Vehicle Category System

### Primary Body Styles

- SUV
- Crossover
- Sedan
- Hatchback
- Coupe
- Convertible
- Wagon
- Minivan
- Van
- Pickup Truck
- Commercial Truck
- Sports Car
- Luxury Car
- Luxury SUV

### Powertrain

- Petrol
- Diesel
- Hybrid
- Plug-in Hybrid
- Electric
- CNG/LPG

### Vehicle Use Case

- Family
- Daily commute
- Off-road
- Commercial
- Ride-hailing
- Luxury
- Performance
- Budget
- Collector/classic
- Modified/tuned

### Size Class

- Kei/micro
- Compact
- Midsize
- Full-size
- 2-row
- 3-row
- Light commercial
- Heavy commercial

### Condition/Ownership

- New
- Used
- Certified used
- Imported
- Locally assembled
- Salvage/rebuilt
- Classic
- Modified

## Current App Category Gap

Current UI mentions:

- SUV
- Sedan
- Hatchback
- Coupe
- Hybrid
- Convertible
- Van
- Truck
- Electric

Current seed inventory only includes:

- SUV
- Sedan
- Truck
- Hatchback
- Petrol
- Diesel
- Auction
- Marketplace

Missing from real inventory:

- Crossover
- Wagon
- Minivan
- Pickup vs truck distinction
- Sports car
- Luxury car
- Luxury SUV
- Commercial vehicles
- EV listings
- Hybrid listings
- CNG/LPG
- Imported/local classification
- Condition classification
- Use-case browsing

## Accessories Marketplace Recommendation

Accessories should be a separate commerce vertical with fitment logic, not just another car listing type. A buyer should be able to browse accessories normally, or choose a saved vehicle and see only compatible products.

References checked:

- Amazon Automotive categories include Car Care, Exterior Accessories, Interior Accessories, Light & Lighting Accessories, Oils & Fluids, Performance Parts & Accessories, Replacement Parts, Tools & Equipment, and Wheels & Tires.
- Amazon’s automotive store introduced a Part Finder that uses year/make/model to find compatible parts.
- eBay Motors emphasizes "My Garage" and fitment-based parts discovery, with categories such as Exterior Parts, Interior Parts, Lighting & Lamps, Steering & Suspension, Engines & Engine Parts, Brakes, Wiring, Transmission & Drivetrain, Wheels, and Tires.
- eBay Guaranteed Fit is built around vehicle-specific compatibility and return confidence.

## Recommended Accessories Categories

### Consumer Accessories

- Interior Accessories
- Exterior Accessories
- Lighting
- Infotainment & Electronics
- Security & Trackers
- Car Care & Detailing
- Seat Covers & Mats
- Covers & Sunshades
- Phone Mounts & Chargers
- Dashcams & Cameras
- Travel & Storage

### Parts And Maintenance

- Replacement Parts
- Engine Parts
- Brakes
- Suspension & Steering
- Transmission & Drivetrain
- Filters
- Batteries
- Oils & Fluids
- Cooling
- Belts, Hoses & Pulleys
- Air & Fuel Delivery
- Exhaust

### Wheels, Tires, And Performance

- Tires
- Wheels/Rims
- Wheel Accessories
- Performance Parts
- Tuning & ECU
- Off-road Accessories
- Towing & Cargo

### Fitment Fields

Every accessory/part listing should support:

- Universal fit or vehicle-specific fit
- Year range
- Make
- Model
- Variant/trim
- Engine
- Body style
- OEM/aftermarket
- New/used/refurbished
- Warranty
- Return policy
- Installation available

## Page-By-Page User Journey Audit

### Home

Strong:

- Clear marketplace entry.
- Search, auction CTA, and category browsing exist.

Missing:

- Categories are not clickable into filtered marketplace.
- No accessories entry point.
- No "My Garage" saved vehicle selector.
- No location-first browsing.
- No trust/protection strip above the fold.

Add:

- Vehicle category mega navigation.
- Accessories tile beside cars/auction.
- "Find parts for my car" garage widget.

### Marketplace Listings

Strong:

- Search and filters exist.
- Auctions and fixed-price cars are shown together.
- Deal score/trust/heat signals are visible.

Missing:

- No city filter in the visible route audit.
- No sort controls.
- No advanced filters for mileage, year, transmission, fuel, seller type, inspection score, title status.
- No accessory marketplace tab.
- No saved search CTA after filtering.
- No map view.

Add:

- Advanced filter drawer.
- Sort by ending soon, newly listed, price, deal score, inspection score.
- Separate tabs: Cars, Auctions, Accessories, Parts.
- Fitment-aware accessories search.

### Auction Hub

Strong:

- Auction is positioned as core product.
- Ending soon and readiness checklist exist.

Missing:

- No active bid panel showing "you are winning/outbid."
- No auction calendar.
- No upcoming/scheduled auctions.
- No post-auction results.
- No bidder education or watch alerts.

Add:

- Auction states: upcoming, live, ending soon, ended, won, lost.
- Auction results archive.
- Watch alerts and saved auction reminders.
- Bidder risk/eligibility checklist.

### Listing Detail

Strong:

- Gallery, specs, bid confirmation, inspection, seller profile, community linked discussions.

Missing:

- No financing/insurance/transfer calculator.
- No accessories compatibility section.
- No similar accessories or "upgrade this car" shelf.
- No vehicle history timeline.
- No real offer flow for marketplace listings.
- No inspection booking workflow.

Add:

- "Accessories that fit this car."
- "Common maintenance parts."
- Cost-to-own calculator.
- Transfer/tax checklist.
- Inspection booking.

### Sell Listing

Strong:

- Seller intake exists.
- Dealer/private distinction exists.

Missing:

- No media upload manager.
- No price guidance.
- No duplicate listing warning.
- No document upload.
- No accessories seller flow.

Add:

- AI price guidance.
- Photo quality checks.
- Document checklist.
- Add "Sell accessory/part" path.

### Sell Auction

Strong:

- Auction-specific submission concept exists.
- Reserve guidance and listing quality score are presented.

Missing:

- It reads partially like an explainer, not a complete action surface.
- No auction duration selection.
- No reserve recommendation interaction.
- No seller fee preview.
- No launch schedule picker.

Add:

- Auction setup wizard.
- Reserve recommender.
- Seller fee estimator.
- Schedule auction start/end.

### Seller Dashboard

Strong:

- Submission status area exists.

Missing:

- Empty state dominates without demo seller listings.
- No active listings analytics.
- No accessory inventory management.
- No leads/messages performance.
- No payout/settlement tracker.

Add:

- Seller inventory tabs: Cars, Auctions, Accessories.
- Views, saves, messages, bids analytics.
- Settlement and payout tracker.

### Admin Review

Strong:

- Approval queue exists.

Missing:

- No risk scoring dashboard.
- No document verification queue.
- No category/accessory moderation.
- No duplicate listing detection.
- No user fraud graph.

Add:

- Fraud/risk queue.
- Accessories approval queue.
- KYC/document verification.
- Audit log.

### Admin Auction Control

Strong:

- End/reopen controls exist.
- Reserve and high bid are visible.

Missing:

- No manual winner override/dispute.
- No reserve edit.
- No bid audit trail surface.
- No suspicious bid alert.
- No payment/checkout status filter.

Add:

- Bid audit trail.
- Reserve editor.
- Fraud alerts.
- Checkout status and failed winner workflow.

### Wallet

Strong:

- Available balance and locked deposits exist.

Missing:

- No payment provider choice.
- No bank transfer proof.
- No KYC gating.
- No refunds/withdrawal status.
- No invoices.

Add:

- Payment methods.
- KYC status.
- Ledger statement.
- Refund and withdrawal tracking.

### Checkout

Strong:

- Post-win checklist exists.

Missing:

- No real payment/escrow states.
- No seller confirmation UI.
- No document upload.
- No dispute workflow details.
- No delivery/handover scheduling.

Add:

- Escrow/payment stages.
- Handover appointment.
- Title transfer checklist.
- Dispute center.

### Recommendations

Strong:

- Personalized feed concept exists.

Missing:

- No preference onboarding.
- No "why recommended" transparency.
- No accessory recommendations.
- No negative feedback controls.

Add:

- Buyer preference quiz.
- Recommender explanation.
- Hide/not interested controls.
- Fitment-aware accessory recommendations.

### Buyer Dashboard

Strong:

- Command center concept exists.

Missing:

- No bid status timeline.
- No saved vehicle garage.
- No accessories order tracking.
- No inspection appointments.

Add:

- My Garage.
- My Bids.
- My Orders.
- Inspection bookings.

### Messages

Strong:

- Basic conversation UI exists.

Missing:

- No offer templates.
- No attachment support.
- No safety warnings.
- No structured negotiation flow.

Add:

- Offer card.
- Inspection request card.
- Attachment/document sharing.
- Abuse/spam controls.

### Community

Strong:

- Reddit-style forum direction is good.
- Forums, posts, linked listings, comments, moderation exist.

Missing:

- No accessory/install communities.
- No user reputation depth.
- No post tags by vehicle.
- No polls.
- No rich media.

Add:

- Accessory Reviews community.
- DIY/Install Guides community.
- Model-specific communities.
- Polls and buyer checklists.

### FAQ

Strong:

- Searchable FAQ exists.

Missing:

- No accessories/parts FAQ.
- No payments/KYC/escrow FAQ.
- No return/refund policy FAQ.

Add:

- Accessories fitment and returns.
- Auction payment/escrow.
- Seller fees.
- Safety/fraud.

## Highest-Impact Additions

1. Better category taxonomy across vehicle body style, powertrain, use case, condition, and seller type.
2. Accessories marketplace with fitment search and "My Garage."
3. Advanced marketplace filters and sorting.
4. Auction result/history pages.
5. Real seller inventory analytics.
6. Real checkout/payment state machine.
7. AI price guidance and "why recommended."
8. Inspection booking and service partner workflow.
9. Fraud/risk dashboard.
10. Accessory reviews and install communities.

## Recommended Build Order

1. Create shared taxonomy data for vehicle categories and accessory categories.
2. Add `/accessories` marketplace page.
3. Add `/accessories/:id` detail page.
4. Add "My Garage" saved vehicle selector.
5. Add accessory fitment model to API routes and mock data.
6. Add accessories entry points to home, nav, listing detail, seller dashboard, community, and FAQ.
7. Upgrade marketplace filters using the new taxonomy.
8. Add accessory seller flow.
9. Add AI fitment/recommendation shelf.

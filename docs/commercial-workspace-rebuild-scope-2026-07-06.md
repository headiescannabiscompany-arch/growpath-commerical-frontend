# GrowPath AI Commercial Workspace Rebuild Scope

Date: 2026-07-06

Status: Product scope draft for owner/GPT review before implementation.

## Product Direction

Commercial should feel like this:

> I am a brand. I have a profile/storefront. I add products, courses, lives, and posts. Users can follow me, learn from me, buy from me, and see my content. Stripe handles money. GrowPath handles storefront, education, content, alerts, analytics, grow-interest discovery, and the customer-facing workspace.

Commercial is not primarily a grow-tracking mode. Facility is for operational grows. Personal/Pro is for individual grow workflows. Commercial is for selling, marketing, educating, posting, storefront management, product/course/order management, and analytics.

## Core Problems To Fix

- Storefront is buried and does not feel like the center of the commercial workspace.
- Storefront does not feel like a public brand profile that a normal user can visit.
- Products, inventory, batches, product lines, trials, and storefront feel like separate apps instead of one product system.
- Courses look unfinished and disconnected from the storefront, feed, products, lives, and Stripe.
- "Commercial post" is confusing. Commercial/facility users should post normally, under brand/facility identity.
- Feed, forum, courses, storefront, products, and analytics do not feel like they share the same data.
- Grow interests are collected but not clearly used for discovery, recommendations, notifications, feed filtering, products, or courses.
- Back arrows are inconsistent on pages deeper than root/menu pages.
- Several screens appear to collect real data but it is unclear whether analytics, product pages, storefront cards, or recommendations actually use it.

## Proposed Commercial Navigation

Top-level commercial destinations:

1. Dashboard
2. Storefront
3. Products
4. Courses
5. Lives
6. Feed / Campaigns
7. Orders
8. Analytics
9. Profile & Billing

Demote or reorganize:

- Product Lines: inside Products as optional grouping.
- Batches/Lots: inside Product as inventory/production history.
- Product Trials: inside Product as proof/testing records.
- Inventory: generated from Products + Batches/Lots.

Avoid top-level routes that make batches, lines, inventory, trials, and store feel like unrelated systems.

## Route Direction

Canonical routes:

```txt
/home/commercial
/home/commercial/storefront
/home/commercial/storefront/edit
/home/commercial/storefront/preview

/home/commercial/products
/home/commercial/products/new
/home/commercial/products/[productId]
/home/commercial/products/[productId]/edit
/home/commercial/products/[productId]/batches
/home/commercial/products/[productId]/batches/new
/home/commercial/products/[productId]/trials

/home/commercial/product-lines

/home/commercial/courses
/home/commercial/courses/new
/home/commercial/courses/[courseId]
/home/commercial/courses/[courseId]/builder
/home/commercial/courses/[courseId]/lessons/[lessonId]

/home/commercial/lives
/home/commercial/lives/new
/home/commercial/lives/[liveId]

/home/commercial/feed
/home/commercial/feed/new
/home/commercial/feed/[postId]

/home/commercial/orders
/home/commercial/orders/[orderId]

/home/commercial/analytics
/home/commercial/profile
/home/commercial/billing
```

Old duplicate routes should redirect to canonical routes.

## Back Arrow Rule

Main root/menu pages do not need a back arrow:

- Commercial Dashboard
- Storefront root
- Products root
- Courses root
- Lives root
- Orders root
- Analytics root
- Profile root

Every deeper page needs a back arrow:

- Product detail
- Add/edit product
- Batch detail
- Add batch
- Course builder
- Lesson editor
- Live scheduler
- Order detail
- Storefront preview
- Storefront edit
- Analytics drill-down
- Profile edit
- Stripe setup/manage page

Implement this through a shared page/header rule rather than custom back buttons per screen.

## User Stories

### Commercial Account Setup

- As a commercial owner, I can create or update my brand profile with logo, banner, name, bio, grow interests, categories, links, and contact info.
- As a commercial owner, I can see whether my storefront is draft, published, or missing required setup.
- As a commercial owner, I can connect/manage Stripe from Profile & Billing without Stripe feeling like the main product-management UI.
- As a commercial owner, I can choose grow interests/specialties that drive storefront discovery, feed targeting, product categories, course categories, and notifications.
- As a commercial owner, I can preview what normal users will see before publishing.

### Public Storefront

- As a GrowPath user, I can visit a commercial brand storefront like a profile page.
- As a GrowPath user, I can see brand logo, banner, description, grow interests, social links, featured products, courses, lives, recent posts, and contact/follow actions.
- As a GrowPath user, I can filter storefront products/courses by category or grow interest.
- As a GrowPath user, I can click a product card and see a full product detail page.
- As a GrowPath user, I can click a course card and see a full course landing page.
- As a GrowPath user, I can see upcoming live events from the brand.
- As a commercial owner, I can click View as User and see the public storefront exactly as normal users see it.

### Storefront Owner Controls

- As a commercial owner, I can edit storefront logo, banner, description, theme/featured sections, public links, grow interests, and visibility.
- As a commercial owner, I can choose featured products, featured courses, featured lives, and pinned posts.
- As a commercial owner, I can publish/unpublish my storefront.
- As a commercial owner, I can see missing setup warnings, such as no logo, no products, no Stripe setup, unpublished products, or missing images.

### Products

- As a commercial owner, I can create a product with name, category, product line, short description, full description, thumbnail, gallery images, videos, documents, tags/grow interests, price, SKU, unit/size, quantity, fulfillment options, and visibility.
- As a commercial owner, I can upload a product photo and automatically create a clean storefront card/thumbnail.
- As a commercial owner, I can publish a product to the storefront.
- As a commercial owner, I can keep a product in draft until images, descriptions, price, and Stripe setup are ready.
- As a GrowPath user, I can browse product cards on a storefront and open a full detail page.
- As a GrowPath user, I can see product images, description, specs, videos, documents, related courses, related live events, and buy button.
- As a GrowPath user, I can start Stripe Checkout from the product page.
- As a commercial owner, I can see which products are missing images, descriptions, price, stock, Stripe setup, or published status.

### Soil/Nutrient/Amendment Products

- As a commercial owner selling living soil, nutrients, or amendments, I can enter bag weight/volume, N-P-K, guaranteed analysis, calcium, magnesium, sulfur, micronutrients, ingredients, directions, application rate, re-amendment rate, storage instructions, safety notes, lab documents, COA/SDS, batch/lot number, mixed date, packed date, and retest/expiration date.
- As a GrowPath user, I can see bag-label information in a readable product detail section.
- As a commercial owner, I can reuse product specs across batches/lots without retyping everything.

### Product Lines

- As a commercial owner, I can create product lines as simple groups, such as Living Soil Line, Dry Amendment Line, Genetics Line, Education, Equipment, or Services.
- As a commercial owner, I can assign products to product lines.
- As a GrowPath user, I can browse storefront products by line.
- Product lines should not feel like a separate store or unrelated module.

### Batches / Lots

- As a commercial owner, I can add batches/lots inside a product.
- As a commercial owner, I can track batch number, mixed date, packed date, quantity made, quantity sold, quantity available, ingredients used, guaranteed analysis, QA notes, photos, documents, and internal notes.
- As a commercial owner, I can see inventory availability from batches/lots.
- As a GrowPath user, I can see public batch/lot information only when the owner chooses to show it.
- Batches/lots should be product inventory history, not a top-level commercial app.

### CSV / PDF Storefront Item Import

- As a commercial owner or authorized manager, I can bulk-import storefront items from CSV or PDF.
- CSV import supports a downloadable template, header/field mapping, row limits, duplicate detection, per-row validation, and a corrected-file error report.
- PDF import accepts a product catalog or menu and uses AI-assisted extraction to propose item drafts with source-page references and confidence warnings.
- Both formats land in a review table where the owner can edit, reject, merge, or approve each proposed item.
- Import never silently publishes products, prices, claims, inventory, checkout links, regulated items, or cannabis sales listings.
- Images referenced by URL are validated and previewed; embedded PDF images require explicit owner selection before reuse.
- Import retains the source document, importer identity, timestamp, mapping decisions, and final create/update audit trail within storage limits.
- Single users see only approved, published storefront items through Discover, Storefronts, Feed, and relevant Grow Interest filtering.

### Inventory

- As a commercial owner, I can see inventory generated from products and batches/lots.
- As a commercial owner, I can quickly see active products, in-stock products, low stock, sold out, draft-only, published, and missing Stripe setup.
- As a commercial owner, I can click inventory rows back into the related product and batch/lot.
- Inventory should not duplicate the product system.

### Product Trials

- As a commercial owner, I can add trial records inside a product.
- As a commercial owner, I can link a trial to a grow, cultivar, product, batch, feeding schedule, photos, notes, yield/health outcomes, user feedback, and final recommendation.
- As a commercial owner, I can use trial evidence in analytics and product claims.
- Product trials should be optional proof/testing records, not where the store lives.

### Courses

- As a commercial owner, I can create a course with title, thumbnail, banner, short description, full description, category, grow interests, skill level, price/free setting, visibility, videos, linked videos, documents, images, modules, lessons, quizzes/checklists, products, live sessions, and forum discussion.
- As a commercial owner, I can upload videos.
- As a commercial owner, I can link external videos.
- As a commercial owner, I can upload documents/PDFs.
- As a commercial owner, I can create modules and lessons.
- As a commercial owner, I can publish/unpublish courses.
- As a commercial owner, I can attach course announcements to feed posts.
- As a commercial owner, I can attach products and live sessions to a course.
- As a GrowPath user, I can view courses on the storefront, main courses area, profile, feed announcements, and search/discovery pages.
- As a GrowPath user, I can buy/enroll through Stripe Checkout where appropriate.
- As a commercial owner, I can see course views, enrollments, lesson progress, sales, and conversion.

### Lives / Twitch

- As a commercial owner, I can connect Twitch.
- As a commercial owner, I can schedule a live with title, description, thumbnail, date/time, linked product, linked course, linked feed post, and visibility.
- As a commercial owner, I can mark a live as free, paid, private, or course-only if supported.
- As a commercial owner, I can notify followers, course students, RSVP users, and interested users before a live.
- As a commercial owner, I can show upcoming lives on storefront.
- As a commercial owner, I can go live through the Twitch connection or link/embed Twitch inside GrowPath.
- As a GrowPath user, I can RSVP/follow a live and receive reminders.
- As a GrowPath user, I can access replay links when available.

Notification moments:

- New live scheduled
- 24 hours before
- 1 hour before
- 15 minutes before
- Live now
- Replay available

### Feed / Forum / Posts

- As a personal user, I can post as myself.
- As a commercial user, I can post as my brand.
- As a facility user, I can post as my facility when appropriate.
- As a commercial/facility user, I can also participate in forum/feed normally, not through a strange separate "commercial post" concept.
- As a commercial owner, I can create feed posts with text, images, videos, product link, course link, live link, storefront link, forum discussion link, tags/grow interests, schedule time, draft/published/archived status.
- As a GrowPath user, I can see commercial/facility posts in the main feed when relevant.
- As a GrowPath user, I can see author badges that distinguish personal, brand, and facility authors.

One feed source rule:

- There should be one main feed system.
- Pages may surface relevant feed cards at the top, filtered by context.
- Storefront top feed = posts from that brand.
- Course top feed = announcements for that course.
- Product top feed = updates for that product.
- Main feed = relevant posts based on follows/interests.
- Do not create disconnected feeds everywhere.

### Orders / Stripe

- As a commercial owner, I can create product/course content in GrowPath first.
- As a commercial owner, I can create or link Stripe Product/Price behind the scenes.
- As a GrowPath user, I can click Buy from a product/course page.
- As a GrowPath user, I am sent to Stripe Checkout for payment.
- As a commercial owner, I can see orders/enrollments after Stripe webhook confirmation.
- As a commercial owner, I can see fulfillment/enrollment status.
- As a commercial owner, I can see Stripe payout/connect status.
- As a platform owner, GrowPath can preserve the Stripe Connect model: creator/commercial receives 85%, GrowPath keeps 15%, Stripe handles connected accounts and payouts.

### Analytics

- As a commercial owner, I can see real analytics tied to tracked events, not placeholder-looking numbers.
- As a commercial owner, I can see storefront views, product views, course views, checkout starts, purchases, abandoned checkouts if possible, course enrollments, lesson progress, live RSVPs, live attendance/clicks, feed impressions, feed clicks, product clicks from feed, course clicks from feed, follower growth, inventory changes, orders, and Stripe payout status.
- As a commercial owner, I can answer which products are viewed, which sell, which posts drive store clicks, which courses convert, which lives bring people in, what tags/grow interests perform best, what inventory is low, and what products are published but missing setup.

### Grow Interests

- As a personal user, I can update grow interests from profile/settings.
- As a commercial owner, I can update brand grow interests from Profile & Storefront settings.
- As a commercial owner, I can tag products, courses, lives, and posts with grow interests.
- As a GrowPath user, my interests influence feed, storefront discovery, course recommendations, product recommendations, notifications, and search.
- As a commercial owner, I can see which grow interests perform best in analytics.

### Commercial Grow Creation

- As a commercial owner, if Create Grow exists, the app must define what a commercial grow means.
- If commercial grow is for product trial/testing, it should connect directly to Product Trials.
- If commercial grow is operational cultivation, it should live in Facility mode instead.
- Empty or disconnected commercial grow creation should be hidden until the workflow is real.

## Data Model Direction

### CommercialAccount

- id
- ownerUserId
- name
- description
- logoUrl
- bannerUrl
- growInterests
- socialLinks
- stripeAccountId
- storefrontStatus
- createdAt
- updatedAt

### Storefront

- commercialAccountId
- theme/settings
- featuredProductIds
- featuredCourseIds
- featuredLiveIds
- published
- publicSlug

### Product

- commercialAccountId
- productLineId
- name
- category
- shortDescription
- fullDescription
- thumbnailUrl
- gallery
- videos
- documents
- growInterests
- specs
- price
- currency
- stripeProductId
- stripePriceId
- status
- createdAt
- updatedAt

### ProductBatch / Lot

- productId
- batchNumber
- quantityMade
- quantityAvailable
- mixedDate
- packedDate
- ingredients
- guaranteedAnalysis
- documents
- notes
- status

### ProductLine

- commercialAccountId
- name
- description
- imageUrl
- displayOrder

### Course

- commercialAccountId
- title
- thumbnailUrl
- bannerUrl
- shortDescription
- fullDescription
- growInterests
- price
- stripeProductId
- stripePriceId
- status
- modules
- lessons
- documents
- videos
- linkedProductIds
- linkedLiveIds

### LiveEvent

- commercialAccountId
- title
- description
- thumbnailUrl
- scheduledStart
- twitchChannel
- twitchEventId
- relatedCourseId
- relatedProductId
- status

### FeedPost

- authorType: user/commercial/facility
- authorId
- body
- images
- videos
- relatedProductId
- relatedCourseId
- relatedLiveId
- growInterests
- status
- scheduledAt

### Order

- buyerUserId
- commercialAccountId
- productId or courseId
- stripeCheckoutSessionId
- stripePaymentIntentId
- status
- fulfillmentStatus
- total
- createdAt

## Build Phases

### Phase 1 - Navigation and Workflow Cleanup

- Rebuild commercial nav around Dashboard, Storefront, Products, Courses, Lives, Feed/Campaigns, Orders, Analytics, Profile & Billing.
- Make Storefront prominent on dashboard and bottom/top navigation.
- Add consistent back arrows for deeper pages.
- Hide/demote confusing duplicate top-level routes.
- Redirect old duplicate routes to canonical routes.
- Clarify or hide commercial grow creation until it connects to Product Trials.

### Phase 2 - Storefront and Product System

- Build commercial profile/storefront edit.
- Build public storefront view.
- Build View as User.
- Build product create/edit/detail.
- Add product thumbnail/gallery upload.
- Add product specs including soil/nutrient guaranteed analysis fields.
- Make product cards appear on storefront.
- Move product lines inside Products.
- Move batches/lots inside Products.
- Make inventory generated from Products + Batches/Lots.
- Add reviewed CSV/PDF storefront item import with templates, mapping, duplicate handling, draft approval, source evidence, and audit history.

### Phase 3 - Stripe and Orders

- Link/create Stripe Product/Price from product/course records.
- Start Stripe Checkout from product/course pages.
- Process webhook into GrowPath order/enrollment.
- Show order and fulfillment/enrollment status.
- Surface missing Stripe setup warnings.

### Phase 4 - Courses

- Rebuild course builder.
- Add images, video upload/link, documents, modules, lessons.
- Add course/product/live/forum/feed connections.
- Publish courses to storefront and main courses area.
- Track course analytics.

### Phase 5 - Lives / Twitch / Notifications

- Add Twitch connection flow.
- Add live scheduler.
- Link lives to product/course/feed.
- Add reminders and notifications.
- Show upcoming lives on storefront.
- Add replay/link support.

### Phase 6 - Feed / Forum / Analytics

- Unify feed source.
- Support personal, commercial, and facility author identities.
- Let posts link to product/course/live/storefront/forum.
- Add scheduling/draft/published/archived post status.
- Tie analytics to real tracked events.
- Use grow interests across discovery, feed, notifications, products, courses, and analytics.

## Acceptance Criteria

The rebuild is complete when:

1. Commercial user can open dashboard and immediately find Storefront.
2. Commercial user can edit brand profile/storefront.
3. Commercial user can view storefront as a normal user.
4. Commercial user can create a product with image, description, category, grow interests, price, weight/size, and optional guaranteed analysis.
5. Product appears as a storefront thumbnail/card.
6. Clicking product opens full product info page.
7. Buy button starts Stripe Checkout.
8. Stripe webhook updates GrowPath order/enrollment.
9. Commercial user can create a course with image, description, videos, links, documents, modules/lessons, and optional live sessions.
10. Commercial user can schedule a Twitch-connected live and send notifications.
11. Commercial/facility users can post to forum/feed like regular people under the correct identity.
12. Feed posts can link to products, courses, lives, and storefront.
13. Batches/lots belong to products.
14. Product lines are organizational groupings only.
15. Product trials belong to products and are not the store.
16. Inventory is generated from products and batches/lots.
17. Analytics uses real tracked events.
18. Every nested page has a back arrow.
19. Old duplicate routes redirect to the new canonical routes.
20. Commercial workflow feels like a real brand/profile/storefront, not disconnected tools.

## Immediate Implementation Recommendation

Do not rebuild everything at once. Start with Phase 1 and a thin vertical slice of Phase 2:

1. Commercial nav cleanup.
2. Storefront-first dashboard.
3. Public storefront preview.
4. Product create/edit/detail with images, description, grow interests, price, size/weight, and published/draft status.
5. Product card appears on storefront.
6. Back arrow rule.

After that slice is working, connect Stripe, orders, courses, lives, and analytics.
